import { describe, it, expect } from 'vitest';
import { Payment } from '@domain/entities/Payment';
import { Currency } from '@domain/value-objects/Currency';
import { PaymentId } from '@domain/value-objects/PaymentId';
import { Amount } from '@domain/value-objects/Amount';
import { PaymentType } from '@domain/value-objects/PaymentType';
import {
  InvalidAmountError,
  InvalidPaymentIdError,
  InvalidPaymentTypeError,
  PaymentAmountMismatchError,
} from '@domain/errors/DomainError';

describe('Payment Domain', () => {
  describe('PaymentId', () => {
    it('debe crear un PaymentId válido', () => {
      const id = PaymentId.create('PAY-001');
      expect(id.getValue()).toBe('PAY-001');
    });

    it('debe rechazar PaymentId vacío', () => {
      expect(() => PaymentId.create('')).toThrow(InvalidPaymentIdError);
    });

    it('debe generar PaymentId con prefijo PAY-', () => {
      const id = PaymentId.generate();
      expect(id.getValue()).toMatch(/^PAY-/);
    });
  });

  describe('Amount', () => {
    it('debe crear monto válido', () => {
      const amount = Amount.create(100.5);
      expect(amount.getValue()).toBe(100.5);
    });

    it('debe rechazar monto negativo', () => {
      expect(() => Amount.create(-1)).toThrow(InvalidAmountError);
    });

    it('debe rechazar monto con más de 2 decimales', () => {
      expect(() => Amount.create(100.999)).toThrow(InvalidAmountError);
    });
  });

  describe('PaymentType', () => {
    it('debe aceptar tarjeta', () => {
      const paymentType = PaymentType.create('tarjeta');
      expect(paymentType.getValue()).toBe('TARJETA');
    });

    it('debe aceptar transferencia', () => {
      const paymentType = PaymentType.create('transferencia');
      expect(paymentType.getValue()).toBe('TRANSFERENCIA');
    });

    it('debe aceptar efectivo', () => {
      const paymentType = PaymentType.create('efectivo');
      expect(paymentType.getValue()).toBe('EFECTIVO');
    });

    it('debe aceptar typo "trajeta" y normalizarlo', () => {
      const paymentType = PaymentType.create('trajeta');
      expect(paymentType.getValue()).toBe('TARJETA');
    });

    it('debe aceptar typo "tranferencia" y normalizarlo', () => {
      const paymentType = PaymentType.create('tranferencia');
      expect(paymentType.getValue()).toBe('TRANSFERENCIA');
    });

    it('debe rechazar tipo de pago inválido', () => {
      expect(() => PaymentType.create('cripto')).toThrow(InvalidPaymentTypeError);
    });
  });

  describe('Payment Entity', () => {
    it('debe crear pago válido cuando amount == total de orden', () => {
      const payment = Payment.create(
        PaymentId.create('PAY-001'),
        Currency.create('USD'),
        Amount.create(150),
        PaymentType.create('efectivo'),
        150
      );

      expect(payment.getId().getValue()).toBe('PAY-001');
      expect(payment.getCurrency().getCode()).toBe('USD');
      expect(payment.getAmount().getValue()).toBe(150);
      expect(payment.getPaymentType().getValue()).toBe('EFECTIVO');
    });

    it('debe rechazar pago cuando amount != total de orden', () => {
      expect(() =>
        Payment.create(
          PaymentId.create('PAY-002'),
          Currency.create('USD'),
          Amount.create(149.99),
          PaymentType.create('tarjeta'),
          150
        )
      ).toThrow(PaymentAmountMismatchError);
    });

    it('debe crear pago con id autogenerado', () => {
      const payment = Payment.createWithGeneratedId(
        Currency.create('MXN'),
        Amount.create(200),
        PaymentType.create('transferencia'),
        200
      );

      expect(payment.getId().getValue()).toMatch(/^PAY-/);
      expect(payment.getCurrency().getCode()).toBe('MXN');
      expect(payment.getAmount().getValue()).toBe(200);
      expect(payment.getPaymentType().getValue()).toBe('TRANSFERENCIA');
    });
  });
});
