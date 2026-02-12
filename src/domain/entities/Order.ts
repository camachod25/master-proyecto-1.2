import { OrderId } from '../value-objects/OrderId';
import { LineItem } from '../value-objects/LineItem';
import { Price } from '../value-objects/Price';
import { Currency } from '../value-objects/Currency';
import { DomainEvent } from '../events/DomainEvent';
import { OrderCreated } from '../events/OrderCreated';
import { ItemAddedToOrder } from '../events/ItemAddedToOrder';
import { CurrencyMismatchError } from '../errors/DomainError';

export class Order {
  private readonly id: OrderId;
  private readonly lineItems: LineItem[] = [];
  private readonly domainEvents: DomainEvent[] = [];
  private currency: Currency | null = null;

  private constructor(id: OrderId) {
    this.id = id;
  }

  static create(id: OrderId): Order {
    const order = new Order(id);
    order.domainEvents.push(new OrderCreated(id.getValue()));
    return order;
  }

  static createWithId(): Order {
    return Order.create(OrderId.generate());
  }

  getId(): OrderId {
    return this.id;
  }

  addItem(lineItem: LineItem): void {
    // Validar que todos los items estén en la misma moneda
    if (this.currency === null) {
      this.currency = lineItem.getUnitPrice().getCurrency();
    } else {
      if (!this.currency.equals(lineItem.getUnitPrice().getCurrency())) {
        throw new CurrencyMismatchError(
          `No se puede añadir item en ${lineItem.getUnitPrice().getCurrency().getCode()} a pedido en ${this.currency.getCode()}`
        );
      }
    }

    // Verificar si ya existe un item con el mismo SKU
    const existingItemIndex = this.lineItems.findIndex((item) =>
      item.getSku().equals(lineItem.getSku())
    );

    if (existingItemIndex !== -1) {
      // Si existe, actualizamos la cantidad
      const existingItem = this.lineItems[existingItemIndex];
      const newQuantity = existingItem.getQuantity().add(lineItem.getQuantity());
      this.lineItems[existingItemIndex] = LineItem.create(
        existingItem.getSku(),
        newQuantity,
        existingItem.getUnitPrice()
      );
    } else {
      // Si no existe, lo añadimos
      this.lineItems.push(lineItem);
    }

    this.domainEvents.push(new ItemAddedToOrder(this.id.getValue(), lineItem));
  }

  getLineItems(): LineItem[] {
    return [...this.lineItems];
  }

  getTotal(): Price {
    if (this.lineItems.length === 0) {
      if (this.currency === null) {
        throw new Error('No hay items en el pedido');
      }
      return Price.create(0, this.currency);
    }

    let total = this.lineItems[0].getTotal();
    for (let i = 1; i < this.lineItems.length; i++) {
      total = total.add(this.lineItems[i].getTotal());
    }
    return total;
  }

  getTotalByAmount(): number {
    return this.getTotal().getAmount();
  }

  getCurrency(): Currency | null {
    return this.currency;
  }

  getItemCount(): number {
    return this.lineItems.reduce((acc, item) => acc + item.getQuantity().getValue(), 0);
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents.length = 0;
  }

  toString(): string {
    const total = this.lineItems.length > 0 ? this.getTotal().toString() : 'Vacío';
    return `Order ${this.id.getValue()} - ${this.lineItems.length} items - Total: ${total}`;
  }
}
