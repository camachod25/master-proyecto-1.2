import { PaymentAmountMismatchError } from '../errors/DomainError';
import { Amount } from '../value-objects/Amount';
import { Currency } from '../value-objects/Currency';
import { PaymentId } from '../value-objects/PaymentId';
import { PaymentType } from '../value-objects/PaymentType';

export class Payment {
  private readonly id: PaymentId;
  private readonly currency: Currency;
  private readonly amount: Amount;
  private readonly paymentType: PaymentType;

  private constructor(
    id: PaymentId,
    currency: Currency,
    amount: Amount,
    paymentType: PaymentType
  ) {
    this.id = id;
    this.currency = currency;
    this.amount = amount;
    this.paymentType = paymentType;
  }

  static create(
    id: PaymentId,
    currency: Currency,
    amount: Amount,
    paymentType: PaymentType,
    orderTotal: number
  ): Payment {
    if (amount.getValue() !== orderTotal) {
      throw new PaymentAmountMismatchError(
        `El monto del pago (${amount.getValue()}) debe ser igual al total de la orden (${orderTotal})`
      );
    }

    return new Payment(id, currency, amount, paymentType);
  }

  static createWithGeneratedId(
    currency: Currency,
    amount: Amount,
    paymentType: PaymentType,
    orderTotal: number
  ): Payment {
    return Payment.create(PaymentId.generate(), currency, amount, paymentType, orderTotal);
  }

  getId(): PaymentId {
    return this.id;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  getAmount(): Amount {
    return this.amount;
  }

  getPaymentType(): PaymentType {
    return this.paymentType;
  }

  toString(): string {
    return `Payment ${this.id.getValue()} - ${this.amount.toString()} ${this.currency.getCode()} - ${this.paymentType.getValue()}`;
  }
}
