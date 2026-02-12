import { InvalidCurrencyError } from '../errors/DomainError';

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'MXN', 'ARS', 'COP'];

export class Currency {
  private readonly code: string;

  private constructor(code: string) {
    this.code = code;
  }

  static create(code: string): Currency {
    const upperCode = code.toUpperCase();
    if (!VALID_CURRENCIES.includes(upperCode)) {
      throw new InvalidCurrencyError(
        `La moneda debe ser una de: ${VALID_CURRENCIES.join(', ')}`
      );
    }
    return new Currency(upperCode);
  }

  getCode(): string {
    return this.code;
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}
