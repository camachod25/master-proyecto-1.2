import { Result } from '../../shared/Result';
import { AppError } from '../errors';
import { EventBus } from './EventBus';
import { OrderRepository } from './OrderRepository';
import { PaymentRepository } from './PaymentRepository';

export interface UnitOfWork {
  run<T>(fn: (repos: Repositories) => Promise<T>): Promise<Result<T, AppError>>;
}

export interface Repositories {
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  eventBus: EventBus;
}
