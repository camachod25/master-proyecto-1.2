import { SKU } from './SKU';
import { Quantity } from './Quantity';
import { Price } from './Price';

export class LineItem {
  private readonly sku: SKU;
  private readonly quantity: Quantity;
  private readonly unitPrice: Price;

  private constructor(sku: SKU, quantity: Quantity, unitPrice: Price) {
    this.sku = sku;
    this.quantity = quantity;
    this.unitPrice = unitPrice;
  }

  static create(sku: SKU, quantity: Quantity, unitPrice: Price): LineItem {
    return new LineItem(sku, quantity, unitPrice);
  }

  getSku(): SKU {
    return this.sku;
  }

  getQuantity(): Quantity {
    return this.quantity;
  }

  getUnitPrice(): Price {
    return this.unitPrice;
  }

  getTotal(): Price {
    return this.unitPrice.multiply(this.quantity.getValue());
  }

  equals(other: LineItem): boolean {
    return (
      this.sku.equals(other.sku) &&
      this.quantity.equals(other.quantity) &&
      this.unitPrice.equals(other.unitPrice)
    );
  }

  toString(): string {
    return `${this.sku.getValue()} x${this.quantity.getValue()} @ ${this.unitPrice.toString()} = ${this.getTotal().toString()}`;
  }
}
