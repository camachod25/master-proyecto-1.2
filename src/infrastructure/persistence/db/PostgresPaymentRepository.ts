import type { Pool, PoolClient } from 'pg';
import { PaymentRepository } from '../../../application/ports/PaymentRepository';
import { InfraError, NotFoundError } from '../../../application/errors';
import { Result, fail, ok } from '../../../shared/Result';
import { Payment } from '../../../domain/entities/Payment';
import { PaymentId } from '../../../domain/value-objects/PaymentId';
import { Currency } from '../../../domain/value-objects/Currency';
import { Amount } from '../../../domain/value-objects/Amount';
import { PaymentType } from '../../../domain/value-objects/PaymentType';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

interface PaymentRow {
  id: string;
  amount: string;
  currency: string;
  payment_type: string;
}

export class PostgresPaymentRepository implements PaymentRepository {
  constructor(private readonly db: Queryable) {}

  async save(payment: Payment): Promise<Result<void, InfraError>> {
    try {
      await this.db.query(
        `
          INSERT INTO payments (id, amount, currency, payment_type)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE
          SET amount = EXCLUDED.amount,
              currency = EXCLUDED.currency,
              payment_type = EXCLUDED.payment_type
        `,
        [
          payment.getId().getValue(),
          payment.getAmount().getValue(),
          payment.getCurrency().getCode(),
          payment.getPaymentType().getValue(),
        ]
      );

      return ok(undefined);
    } catch (error) {
      return fail(
        new InfraError(
          `No se pudo guardar el pago ${payment.getId().getValue()} en PostgreSQL`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async getById(id: PaymentId): Promise<Result<Payment, InfraError | NotFoundError>> {
    try {
      const result = await this.db.query<PaymentRow>(
        `
          SELECT
            id,
            amount::text AS amount,
            currency,
            payment_type
          FROM payments
          WHERE id = $1
        `,
        [id.getValue()]
      );

      if (result.rowCount === 0) {
        return fail(new NotFoundError(id.getValue(), 'Payment'));
      }

      return ok(this.rebuildPayment(result.rows[0]));
    } catch (error) {
      return fail(
        new InfraError(
          `No se pudo recuperar el pago ${id.getValue()} desde PostgreSQL`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async getAll(): Promise<Result<Payment[], InfraError>> {
    try {
      const result = await this.db.query<PaymentRow>(
        `
          SELECT
            id,
            amount::text AS amount,
            currency,
            payment_type
          FROM payments
          ORDER BY id ASC
        `
      );

      return ok(result.rows.map((row) => this.rebuildPayment(row)));
    } catch (error) {
      return fail(
        new InfraError(
          'No se pudo recuperar el listado de pagos desde PostgreSQL',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  private rebuildPayment(row: PaymentRow): Payment {
    const amount = Number(row.amount);
    return Payment.create(
      PaymentId.create(row.id),
      Currency.create(row.currency),
      Amount.create(amount),
      PaymentType.create(row.payment_type),
      amount
    );
  }
}
