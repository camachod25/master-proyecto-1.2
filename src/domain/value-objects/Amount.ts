import { InvalidAmountError } from '../errors/DomainError';

export class Amount {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): Amount {
    if (!Number.isFinite(value)) {
      throw new InvalidAmountError('El monto debe ser un número válido');
    }

    if (value < 0) {
      throw new InvalidAmountError('El monto no puede ser negativo');
    }

    const decimalCount = (value.toString().split('.')[1] || '').length;
    if (decimalCount > 2) {
      throw new InvalidAmountError('El monto no puede tener más de 2 decimales');
    }

    return new Amount(value);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: Amount): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toFixed(2);
  }
}
