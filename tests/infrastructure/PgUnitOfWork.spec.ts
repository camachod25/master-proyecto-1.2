import { describe, it, expect, vi } from 'vitest';
import { PgUnitOfWork } from '@infrastructure/persistence/db/PgUnitOfWork';
import { isError } from '@shared/Result';
import { Order } from '@domain/entities/Order';
import { OrderId } from '@domain/value-objects/OrderId';
import { OrderCreated } from '@domain/events/OrderCreated';

describe('PgUnitOfWork', () => {
  it('hace rollback cuando falla publishBatch luego de save', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPSERT orders
      .mockResolvedValueOnce({}) // DELETE orders_items
      .mockRejectedValueOnce(new Error('outbox insert failed')) // INSERT outbox
      .mockResolvedValueOnce({}); // ROLLBACK

    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    };

    const uow = new PgUnitOfWork(pool as any);
    const order = Order.create(OrderId.create('ORDER-ROLLBACK'));

    const result = await uow.run(async ({ orderRepository, eventBus }) => {
      const saveResult = await orderRepository.save(order);
      if (isError(saveResult)) {
        throw saveResult.error;
      }
      await eventBus.publishBatch([new OrderCreated(order.getId().getValue())]);
    });

    expect(isError(result)).toBe(true);
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
