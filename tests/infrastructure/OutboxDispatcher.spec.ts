import { describe, it, expect, vi } from 'vitest';
import { OutboxDispatcher } from '@infrastructure/messaging/OutboxDispatcher';

const sampleRows = [
  {
    id: 1,
    aggregate_id: 'ORDER-1',
    aggregate_type: 'Order',
    event_type: 'OrderCreated',
    payload: { orderId: 'ORDER-1' },
    occurred_at: new Date('2026-02-11T09:00:00.000Z'),
    created_at: new Date('2026-02-11T09:00:00.000Z'),
  },
  {
    id: 2,
    aggregate_id: 'ORDER-2',
    aggregate_type: 'Order',
    event_type: 'ItemAddedToOrder',
    payload: { orderId: 'ORDER-2' },
    occurred_at: new Date('2026-02-11T09:01:00.000Z'),
    created_at: new Date('2026-02-11T09:01:00.000Z'),
  },
  {
    id: 3,
    aggregate_id: 'ORDER-3',
    aggregate_type: 'Order',
    event_type: 'ItemAddedToOrder',
    payload: { orderId: 'ORDER-3' },
    occurred_at: new Date('2026-02-11T09:02:00.000Z'),
    created_at: new Date('2026-02-11T09:02:00.000Z'),
  },
];

describe('OutboxDispatcher', () => {
  it('marca published_at para eventos publicados y mantiene fallidos pendientes', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: sampleRows }) // SELECT ... SKIP LOCKED
      .mockResolvedValueOnce({}) // UPDATE published_at
      .mockResolvedValueOnce({}); // COMMIT

    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    };

    const handler = vi.fn(async (event: { id: number }) => {
      if (event.id === 2) {
        throw new Error('fail event 2');
      }
    });

    const dispatcher = new OutboxDispatcher(pool as any, handler, { batchSize: 10 });
    const result = await dispatcher.runOnce();

    expect(result).toEqual({ selected: 3, published: 2, failed: 1 });
    expect(query).toHaveBeenCalledTimes(4);

    const updateParams = query.mock.calls[2][1];
    expect(updateParams[0]).toEqual([1, 3]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('hace rollback si falla la transacción', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('db select error')) // SELECT
      .mockResolvedValueOnce({}); // ROLLBACK

    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    };

    const dispatcher = new OutboxDispatcher(pool as any, vi.fn());

    await expect(dispatcher.runOnce()).rejects.toThrow('Error al despachar eventos pendientes del outbox');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
