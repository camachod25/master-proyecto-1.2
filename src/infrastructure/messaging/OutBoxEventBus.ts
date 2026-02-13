import type { Pool, PoolClient } from 'pg';
import { InfraError } from '../../application/errors';
import { EventBus } from '../../application/ports/EventBus';
import { DomainEvent } from '../../domain/events/DomainEvent';

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export class OutBoxEventBus implements EventBus {
  constructor(private readonly db: Queryable) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.publishBatch([event]);
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    const valuesSql: string[] = [];
    const params: Array<string | Date> = [];

    try {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const base = i * 5;

        valuesSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::jsonb, $${base + 5})`);
        params.push(
          event.aggregateId,
          this.resolveAggregateType(event),
          event.getEventName(),
          JSON.stringify(event.getPayload()),
          event.occurredAt
        );
      }

      await this.db.query(
        `
          INSERT INTO outbox (aggregate_id, aggregate_type, event_type, event_data, created_at)
          VALUES ${valuesSql.join(', ')}
        `,
        params
      );
    } catch (error) {
      throw new InfraError(
        `No se pudieron persistir ${events.length} evento(s) en outbox`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private resolveAggregateType(event: DomainEvent): string {
    return event.getEventName().startsWith('Payment') ? 'Payment' : 'Order';
  }
}
