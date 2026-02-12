export class OrderId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): OrderId {
    if (!value || value.trim().length === 0) {
      throw new Error('El OrderId no puede estar vacío');
    }
    return new OrderId(value.trim());
  }

  static generate(): OrderId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return new OrderId(`ORD-${timestamp}-${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
