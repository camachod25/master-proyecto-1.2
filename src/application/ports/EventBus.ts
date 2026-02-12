import { DomainEvent } from '../../domain/events/DomainEvent';

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}
