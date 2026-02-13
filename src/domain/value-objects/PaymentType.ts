import { InvalidPaymentTypeError } from '../errors/DomainError';

export type PaymentTypeValue = 'TARJETA' | 'TRANSFERENCIA' | 'EFECTIVO';

const PAYMENT_TYPE_ALIASES: Record<string, PaymentTypeValue> = {
  TARJETA: 'TARJETA',
  TRAJETA: 'TARJETA',
  TRANSFERENCIA: 'TRANSFERENCIA',
  TRANFERENCIA: 'TRANSFERENCIA',
  EFECTIVO: 'EFECTIVO',
};

export class PaymentType {
  private readonly value: PaymentTypeValue;

  private constructor(value: PaymentTypeValue) {
    this.value = value;
  }

  static create(value: string): PaymentType {
    const normalized = value?.trim().toUpperCase();

    if (!normalized || !PAYMENT_TYPE_ALIASES[normalized]) {
      throw new InvalidPaymentTypeError(
        'El tipo de pago debe ser tarjeta, transferencia o efectivo'
      );
    }

    return new PaymentType(PAYMENT_TYPE_ALIASES[normalized]);
  }

  getValue(): PaymentTypeValue {
    return this.value;
  }

  equals(other: PaymentType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
