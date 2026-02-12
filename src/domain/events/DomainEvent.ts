export abstract class DomainEvent {
  public readonly occurredAt: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string, occurredAt: Date = new Date()) {
    this.aggregateId = aggregateId;
    this.occurredAt = occurredAt;
  }

  abstract getEventName(): string;
  abstract getPayload(): Record<string, unknown>;
}
