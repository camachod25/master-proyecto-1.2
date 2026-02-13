import { Result, fail, isError, ok } from '../../shared/Result';
import { CreatePaymentRequest, CreatePaymentResponse } from '../dto/CreatePaymentDTO';
import { OrderRepository } from '../ports/OrderRepository';
import { PaymentRepository } from '../ports/PaymentRepository';
import { OrderId } from '../../domain/value-objects/OrderId';
import { Currency } from '../../domain/value-objects/Currency';
import { Amount } from '../../domain/value-objects/Amount';
import { PaymentType } from '../../domain/value-objects/PaymentType';
import { Payment } from '../../domain/entities/Payment';
import { PaymentCreated } from '../../domain/events/PaymentCreated';
import {
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidPaymentTypeError,
  PaymentAmountMismatchError,
} from '../../domain/errors/DomainError';
import { EventBus } from '../ports/EventBus.js';

export class CreatePaymentUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(request: CreatePaymentRequest): Promise<Result<CreatePaymentResponse>> {
    try {
      if (!request.orderId || request.orderId.trim().length === 0) {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'El orderId es requerido',
          field: 'orderId',
        });
      }

      if (!Number.isFinite(request.amount)) {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'El amount debe ser un número válido',
          field: 'amount',
        });
      }

      if (!request.currency || request.currency.trim().length === 0) {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'La currency es requerida',
          field: 'currency',
        });
      }

      if (!request.type || request.type.trim().length === 0) {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'El type es requerido',
          field: 'type',
        });
      }

      let orderId: OrderId;
      try {
        orderId = OrderId.create(request.orderId);
      } catch {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'OrderId inválido',
          field: 'orderId',
        });
      }

      const orderResult = await this.orderRepository.getById(orderId);
      if (isError(orderResult)) {
        return fail(orderResult.error);
      }

      const order = orderResult.value;

      let orderTotal: number;
      try {
        orderTotal = order.getTotalByAmount();
      } catch {
        return fail({
          type: 'CONFLICT',
          message: 'No se puede pagar una orden sin items',
        });
      }

      let payment: Payment;

      try {
        const currency = Currency.create(request.currency.trim());
        const amount = Amount.create(request.amount);
        const paymentType = PaymentType.create(request.type.trim());

        payment = Payment.createWithGeneratedId(
          currency,
          amount,
          paymentType,
          orderTotal
        );
      } catch (error) {
        if (
          error instanceof InvalidCurrencyError ||
          error instanceof InvalidAmountError ||
          error instanceof InvalidPaymentTypeError
        ) {
          return fail({
            type: 'VALIDATION_ERROR',
            message: error.message,
          });
        }

        if (error instanceof PaymentAmountMismatchError) {
          return fail({
            type: 'CONFLICT',
            message: error.message,
          });
        }

        const message = error instanceof Error ? error.message : 'Error desconocido';
        return fail({
          type: 'UNKNOWN',
          message: `Error al crear pago: ${message}`,
        });
      }

      const saveResult = await this.paymentRepository.save(payment);
      if (isError(saveResult)) {
        return fail(saveResult.error);
      }

      try {
        await this.eventBus.publish(
          new PaymentCreated(
            payment.getId().getValue(),
            payment.getAmount().getValue(),
            payment.getCurrency().getCode()
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return fail({
          type: 'INFRA_ERROR',
          message: `No se pudo publicar los eventos: ${message}`,
        });
      }

      return ok<CreatePaymentResponse>({
        paymentId: payment.getId().getValue(),
        orderId: order.getId().getValue(),
        amount: payment.getAmount().getValue(),
        currency: payment.getCurrency().getCode(),
        type: payment.getPaymentType().getValue(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'UNKNOWN', message: `Error al crear pago: ${message}` });
    }
  }
}
