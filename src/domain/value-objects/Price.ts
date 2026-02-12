import { InvalidPriceError } from '../errors/DomainError';
import { Currency } from './Currency';

export class Price {
  private readonly amount: number;
  private readonly currency: Currency;

  private constructor(amount: number, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
  }

  static create(amount: number, currency: Currency): Price {
    if (amount < 0) {
      throw new InvalidPriceError('El precio no puede ser negativo');
    }
    // Validar que sea un número válido (máximo 2 decimales)
    const decimalCount = (amount.toString().split('.')[1] || '').length;
    if (decimalCount > 2) {
      return new Price(Math.round(amount * 100) / 100, currency);
    }
    return new Price(amount, currency);
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  add(other: Price): Price {
    if (!this.currency.equals(other.currency)) {
      throw new Error('No se pueden sumar precios de diferentes monedas');
    }
    return Price.create(this.amount + other.amount, this.currency);
  }

  multiply(quantity: number): Price {
    if (quantity < 0) {
      throw new InvalidPriceError('La cantidad para multiplicar no puede ser negativa');
    }
    return Price.create(
      Math.round(this.amount * quantity * 100) / 100,
      this.currency
    );
  }

  equals(other: Price): boolean {
    return (
      this.amount === other.amount && this.currency.equals(other.currency)
    );
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency.getCode()}`;
  }
}
