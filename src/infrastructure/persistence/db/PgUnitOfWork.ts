import type { Pool } from 'pg';
import { UnitOfWork, Repositories } from '../../../application/ports/UnitOfWork';
import { PostgresOrderRepository } from './PostgresOrderRepository';
import { PostgresPaymentRepository } from './PostgresPaymentRepository';
import { Result, ok, fail } from '../../../shared/Result';
import { AppError, InfraError } from '../../../application/errors';
import { OutBoxEventBus } from '../../messaging/OutBoxEventBus';

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<Result<T, AppError>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const repos: Repositories = {
        orderRepository: new PostgresOrderRepository(client),
        paymentRepository: new PostgresPaymentRepository(client),
        eventBus: new OutBoxEventBus(client),
      };

      const result = await work(repos);
      await client.query('COMMIT');

      return ok(result);
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // No-op: preservamos el error original.
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return fail(new InfraError(`Transaction failed: ${errorMessage}`));
    } finally {
      client.release();
    }
  }
}
