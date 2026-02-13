import { Payment } from '../../domain/entities/Payment';
import { PaymentId } from '../../domain/value-objects/PaymentId';
import { Result } from '../../shared/Result';
import { AppError } from '../errors.js'

export interface PaymentRepository {
  save(payment: Payment): Promise<Result<void, AppError>>;
  getById(id: PaymentId): Promise<Result<Payment, AppError>>;
  getAll(): Promise<Result<Payment[], AppError>>;
}
