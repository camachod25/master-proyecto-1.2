import { DomainEvent } from './DomainEvent';
import { LineItem } from '../value-objects/LineItem';

export class ItemAddedToOrder extends DomainEvent {
  private readonly lineItem: LineItem;

  constructor(
    orderId: string,
    lineItem: LineItem,
    occurredAt: Date = new Date()
  ) {
    super(orderId, occurredAt);
    this.lineItem = lineItem;
  }

  getLineItem(): LineItem {
    return this.lineItem;
  }

  getEventName(): string {
    return 'ItemAddedToOrder';
  }

  getPayload() {
    return {
      orderId: this.aggregateId,
      sku: this.lineItem.getSku().getValue(),
      quantity: this.lineItem.getQuantity().getValue(),
      unitPrice: this.lineItem.getUnitPrice().getAmount(),
      currency: this.lineItem.getUnitPrice().getCurrency().getCode(),
      lineTotal: this.lineItem.getTotal().getAmount(),
      occurredAt: this.occurredAt,
    };
  }
}
