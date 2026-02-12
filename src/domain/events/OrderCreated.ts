import { DomainEvent } from './DomainEvent';

export class OrderCreated extends DomainEvent {
  constructor(orderId: string, occurredAt: Date = new Date()) {
    super(orderId, occurredAt);
  }

  getEventName(): string {
    return 'OrderCreated';
  }

  getPayload() {
    return {
      orderId: this.aggregateId,
      occurredAt: this.occurredAt,
    };
  }
}
