import { InvalidQuantityError } from '../errors/DomainError';

export class Quantity {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): Quantity {
    if (!Number.isInteger(value)) {
      throw new InvalidQuantityError('La cantidad debe ser un número entero');
    }
    if (value <= 0) {
      throw new InvalidQuantityError('La cantidad debe ser mayor a 0');
    }
    return new Quantity(value);
  }

  getValue(): number {
    return this.value;
  }

  add(other: Quantity): Quantity {
    return Quantity.create(this.value + other.value);
  }

  equals(other: Quantity): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toString();
  }
}
