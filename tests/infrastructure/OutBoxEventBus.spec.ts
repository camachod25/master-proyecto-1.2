import { describe, it, expect, vi } from 'vitest';
import { OutBoxEventBus } from '@infrastructure/messaging/OutBoxEventBus';
import { OrderCreated } from '@domain/events/OrderCreated';

describe('OutBoxEventBus', () => {
  it('inserta eventos en outbox con publishBatch', async () => {
    const query = vi.fn().mockResolvedValue({});
    const db = { query };

    const bus = new OutBoxEventBus(db as any);
    const event1 = new OrderCreated('ORDER-1', new Date('2026-02-11T10:00:00.000Z'));
    const event2 = new OrderCreated('ORDER-2', new Date('2026-02-11T10:01:00.000Z'));

    await bus.publishBatch([event1, event2]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];

    expect(sql).toContain('INSERT INTO outbox');
    expect(sql).toContain('aggregate_id');
    expect(params).toHaveLength(10);
    expect(params[0]).toBe('ORDER-1');
    expect(params[1]).toBe('Order');
    expect(params[2]).toBe('OrderCreated');
    expect(params[5]).toBe('ORDER-2');
  });

  it('no ejecuta query cuando no hay eventos', async () => {
    const query = vi.fn().mockResolvedValue({});
    const bus = new OutBoxEventBus({ query } as any);

    await bus.publishBatch([]);

    expect(query).not.toHaveBeenCalled();
  });
});
