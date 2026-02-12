import { Result, ok, fail, isError } from '../../shared/Result';
import { CreateOrderRequest, CreateOrderResponse } from '../dto/CreateOrderDTO';
import { OrderRepository } from '../ports/OrderRepository';
import { EventBus } from '../ports/EventBus';
import { Clock } from '../ports/Clock';
import { UnitOfWork } from '../ports/UnitOfWork';
import { Order } from '../../domain/entities/Order';
import { OrderId } from '../../domain/value-objects/OrderId';
import { ValidationError } from '../errors';

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly clock: Clock,
    private readonly unitOfWork?: UnitOfWork
  ) {}

  async execute(request: CreateOrderRequest): Promise<Result<CreateOrderResponse>> {
    try {
      
      // Crear la orden
      if (!request.orderSku || request.orderSku.trim().length === 0) {
        return fail({ type: 'VALIDATION_ERROR', message: 'El orderSku es requerido', field: 'orderSku' } as ValidationError);
      }

      const orderId = OrderId.create(request.orderSku.trim());
      const order = Order.create(orderId);
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

          return {
            orderId: order.getId().getValue(),
          };
        });

        if (isError(txResult)) {
          return fail(txResult.error);
        }

        order.clearDomainEvents();
        return ok<CreateOrderResponse>(txResult.value);
      }

      // Persistir en repositorio
      try {
        const saveResult = await this.orderRepository.save(order);
        if (isError(saveResult)) {
          return fail(saveResult.error);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido al guardar orden';
        return fail({ type: 'INFRA_ERROR', message: `No se pudo guardar la orden: ${message}` });
      }

      // Publicar eventos
      try {
        if (events.length > 0) {
          await this.eventBus.publishBatch(events);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido al publicar eventos';
        return fail({ type: 'INFRA_ERROR', message: `No se pudo publicar los eventos: ${message}` });
      }

      return ok<CreateOrderResponse>({
        orderId: order.getId().getValue(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'UNKNOWN', message: `Error al crear orden: ${message}` });
    }
  }
}
