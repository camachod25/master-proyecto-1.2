import { InvalidPaymentIdError } from '../errors/DomainError';

export class PaymentId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): PaymentId {
    if (!value || value.trim().length === 0) {
      throw new InvalidPaymentIdError('El PaymentId no puede estar vacío');
    }
    return new PaymentId(value.trim());
  }

  static generate(): PaymentId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return new PaymentId(`PAY-${timestamp}-${random}`);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: PaymentId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
