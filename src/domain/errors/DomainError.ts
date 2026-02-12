export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InvalidQuantityError extends DomainError {
  constructor(message: string = 'La cantidad debe ser mayor a 0') {
    super(message);
    this.name = 'InvalidQuantityError';
  }
}

export class InvalidPriceError extends DomainError {
  constructor(message: string = 'El precio debe ser mayor o igual a 0') {
    super(message);
    this.name = 'InvalidPriceError';
  }
}

export class InvalidSKUError extends DomainError {
  constructor(message: string = 'El SKU no puede estar vacío') {
    super(message);
    this.name = 'InvalidSKUError';
  }
}

export class InvalidCurrencyError extends DomainError {
  constructor(message: string = 'La moneda debe ser un código ISO válido') {
    super(message);
    this.name = 'InvalidCurrencyError';
  }
}

export class CurrencyMismatchError extends DomainError {
  constructor(
    message: string = 'No se pueden mezclar items de diferentes monedas'
  ) {
    super(message);
    this.name = 'CurrencyMismatchError';
  }
}
