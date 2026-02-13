import { PaymentRepository } from '../../../application/ports/PaymentRepository';
import { Payment } from '../../../domain/entities/Payment';
import { PaymentId } from '../../../domain/value-objects/PaymentId';
import { Result, ok, fail } from '../../../shared/Result';
import { InfraError } from '../../../application/errors';

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map();

  async save(payment: Payment): Promise<Result<void, InfraError>> {
    try {
      this.payments.set(payment.getId().getValue(), payment);
      return ok<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo guardar el pago: ${message}` } as InfraError);
    }
  }

  async getById(id: PaymentId): Promise<Result<Payment, InfraError>> {
    try {
      const payment = this.payments.get(id.getValue());
      if (!payment) {
        return fail({ type: 'NOT_FOUND', message: id.getValue(), resource: 'Payment' } as InfraError);
      }
      return ok<Payment>(payment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo recuperar el pago: ${message}` } as InfraError);
    }
  }

  async getAll(): Promise<Result<Payment[], InfraError>> {
    try {
      return ok<Payment[]>(Array.from(this.payments.values()));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({ type: 'INFRA_ERROR', message: `No se pudo recuperar los pagos: ${message}` } as InfraError);
    }
  }

  clear(): void {
    this.payments.clear();
  }

  size(): number {
    return this.payments.size;
  }
}
