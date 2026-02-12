import { Result, ok, fail, isError } from '../../shared/Result';
import { AddItemToOrderRequest, AddItemToOrderResponse } from '../dto/AddItemToOrderDTO';
import { OrderRepository } from '../ports/OrderRepository';
import { PricingService } from '../ports/PricingService';
import { EventBus } from '../ports/EventBus';
import { UnitOfWork } from '../ports/UnitOfWork';
import { OrderId } from '../../domain/value-objects/OrderId';
import { SKU } from '../../domain/value-objects/SKU';
import { Currency } from '../../domain/value-objects/Currency';
import { Quantity } from '../../domain/value-objects/Quantity';
import { LineItem } from '../../domain/value-objects/LineItem';
import {
  InvalidQuantityError,
  InvalidSKUError,
  CurrencyMismatchError,
} from '../../domain/errors/DomainError';

export class AddItemToOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly pricingService: PricingService,
    private readonly eventBus: EventBus,
    private readonly unitOfWork?: UnitOfWork
  ) {}

  async execute(request: AddItemToOrderRequest): Promise<Result<AddItemToOrderResponse>> {
    try {
      // Validar input
      if (!request.orderId || request.orderId.trim().length === 0) {
        return fail({ type: 'VALIDATION_ERROR', message: 'El orderId es requerido', field: 'orderId' });
      }

      if (!request.sku || request.sku.trim().length === 0) {
        return fail({ type: 'VALIDATION_ERROR', message: 'El SKU es requerido', field: 'sku' });
      }

      if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
        return fail({
          type: 'VALIDATION_ERROR',
          message: 'La cantidad debe ser un número entero mayor a 0',
          field: 'quantity',
        });
      }

      // Recuperar la orden
      let orderId: OrderId;
      try {
        orderId = OrderId.create(request.orderId);
      } catch (error) {
        return fail({ type: 'VALIDATION_ERROR', message: 'OrderId inválido', field: 'orderId' });
      }

      let order;
      try {
        const orderResult = await this.orderRepository.getById(orderId);
        if (isError(orderResult)) {
          return fail(orderResult.error);
        }
        order = orderResult.value;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return fail({ type: 'INFRA_ERROR', message: `No se pudo recuperar la orden: ${message}` });
      }

      if (!order) {
        return fail({ type: 'NOT_FOUND', message: `Orden ${request.orderId} no encontrada`, resource: 'Order' });
      }

      // Crear SKU y Quantity
      let sku: SKU;
      let quantity: Quantity;

      try {
        sku = SKU.create(request.sku);
      } catch (error) {
        if (error instanceof InvalidSKUError) {
          return fail({ type: 'VALIDATION_ERROR', message: error.message, field: 'sku' });
        }
        return fail({ type: 'UNKNOWN', message: `Error al procesar SKU: ${error}` });
      }

      try {
        quantity = Quantity.create(request.quantity);
      } catch (error) {
        if (error instanceof InvalidQuantityError) {
          return fail({ type: 'VALIDATION_ERROR', message: error.message, field: 'quantity' });
        }
        return fail({ type: 'UNKNOWN', message: `Error al procesar cantidad: ${error}` });
      }

      // Obtener el precio del servicio de precios
      let unitPrice;
      
      try {
        if (!request.currency || request.currency.trim().length === 0) {
          return fail({ type: 'VALIDATION_ERROR', message: 'La moneda es requerida', field: 'currency' });
        }
        const currency = Currency.create(request.currency.trim());
        const priceResult = await this.pricingService.getPriceForSku(sku, currency);
        if (isError(priceResult)) {
          return fail(priceResult.error);
        }
        unitPrice = priceResult.value;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return fail({ type: 'INFRA_ERROR', message: `No se pudo obtener el precio: ${message}` });
      }

      // Crear el LineItem
      const lineItem = LineItem.create(sku, quantity, unitPrice);

      // Añadir el item a la orden
      try {
        order.addItem(lineItem);
      } catch (error) {
        if (error instanceof CurrencyMismatchError) {
          return fail({ type: 'CONFLICT', message: error.message });
        }
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return fail({ type: 'UNKNOWN', message: `Error al añadir item: ${message}` });
      }

      const events = order.getDomainEvents();

      if (this.unitOfWork) {
        const txResult = await this.unitOfWork.run(async ({ orderRepository, eventBus }) => {
          const saveResult = await orderRepository.save(order);
          if (isError(saveResult)) {
            throw saveResult.error;
          }

          if (events.length > 0) {
            await eventBus.publishBatch(events);
          }
        });

        if (isError(txResult)) {
          return fail(txResult.error);
        }
      } else {
        // Persistir la orden actualizada
        try {
          const saveResult = await this.orderRepository.save(order);
          if (isError(saveResult)) {
            return fail(saveResult.error);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error desconocido';
          return fail({ type: 'INFRA_ERROR', message: `No se pudo guardar la orden: ${message}` });
        }

        // Publicar eventos
        try {
          if (events.length > 0) {
            await this.eventBus.publishBatch(events);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Error desconocido';
          return fail({ type: 'INFRA_ERROR', message: `No se pudo publicar los eventos: ${message}` });
        }
      }

      order.clearDomainEvents();

      return ok<AddItemToOrderResponse>({
        orderId: order.getId().getValue(),
        itemCount: order.getItemCount(),
        total: order.getTotalByAmount(),
        currency: order.getCurrency()?.getCode() || 'UNKNOWN',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'UNKNOWN', message: `Error al añadir item: ${message}` });
    }
  }
}
