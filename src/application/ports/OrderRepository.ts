import { Order } from '../domain/entities/Order';
import { OrderId } from '../domain/value-objects/OrderId';
import { Result } from '../../shared/Result';
import { AppError } from '../errors.js'

export interface OrderRepository {
  save(order: Order): Promise<Result<void, AppError>>;
  getById(id: OrderId): Promise<Result<Order, AppError>>;
  getAll(): Promise<Result<Order[], AppError>>;
}
