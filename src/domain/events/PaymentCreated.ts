import { DomainEvent } from './DomainEvent';

export class PaymentCreated extends DomainEvent {
  private readonly amount: number;
  private readonly currency: string;

  constructor(
    paymentId: string,
    amount: number,
    currency: string,
    occurredAt: Date = new Date()
  ) {
    super(paymentId, occurredAt);
    this.amount = amount;
    this.currency = currency;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  getEventName(): string {
    return 'PaymentCreated';
  }

  getPayload() {
    return {
      paymentId: this.aggregateId,
      amount: this.amount,
      currency: this.currency,
      occurredAt: this.occurredAt,
    };
  }
}