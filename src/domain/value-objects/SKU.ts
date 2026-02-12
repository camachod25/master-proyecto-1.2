import { InvalidSKUError } from '../errors/DomainError';

export class SKU {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): SKU {
    if (!value || value.trim().length === 0) {
      throw new InvalidSKUError('El SKU no puede estar vacío');
    }
    if (value.length > 50) {
      throw new InvalidSKUError('El SKU no puede exceder 50 caracteres');
    }
    return new SKU(value.trim().toUpperCase());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SKU): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
