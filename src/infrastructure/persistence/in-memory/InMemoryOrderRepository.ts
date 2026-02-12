import { Order } from '../../domain/entities/Order';
import { OrderId } from '../../domain/value-objects/OrderId';
import { OrderRepository } from '../ports/OrderRepository';
import { Result, ok, fail } from '../../../shared/Result';
import { InfraError } from '../../../application/errors';

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  async save(order: Order): Promise<Result<void, InfraError>> {
    try {
      const orderId = order.getId().getValue();
      this.orders.set(orderId, order);
      return ok<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo guardar la orden: ${message}` } as InfraError);
    }
  }

  async getById(id: OrderId): Promise<Result<Order, InfraError>> {
    try {
      const order = this.orders.get(id.getValue());
      if (!order) {
        return fail({ type: 'NOT_FOUND', message: id.getValue(), resource: 'Order' } as InfraError);
      }
      return ok<Order>(order);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo recuperar la orden: ${message}` } as InfraError);
    }
  }

  async getAll(): Promise<Result<Order[], InfraError>> {
    try {
      const orders = Array.from(this.orders.values());
      return ok<Order[]>(orders);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo recuperar las órdenes: ${message}` } as InfraError);
    }
  }

  clear(): void {
    this.orders.clear();
  }

  size(): number {
    return this.orders.size;
  }
}
