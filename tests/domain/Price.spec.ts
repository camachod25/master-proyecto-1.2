import { describe, it, expect, beforeEach } from 'vitest';
import { Price } from '@domain/value-objects/Price';
import { Currency } from '@domain/value-objects/Currency';
import { InvalidPriceError } from '@domain/errors/DomainError';

describe('Price Value Object', () => {
  let currency: Currency;

  beforeEach(() => {
    currency = Currency.create('USD');
  });

  describe('create', () => {
    it('debe crear un precio válido', () => {
      const price = Price.create(29.99, currency);
      expect(price.getAmount()).toBe(29.99);
      expect(price.getCurrency().getCode()).toBe('USD');
    });

    it('debe aceptar precio cero', () => {
      const price = Price.create(0, currency);
      expect(price.getAmount()).toBe(0);
    });

    it('debe rechazar precio negativo', () => {
      expect(() => Price.create(-10, currency)).toThrow(InvalidPriceError);
    });

    it('debe rechazar precio con más de 2 decimales', () => {
      expect(() => Price.create(29.999, currency)).toThrow(InvalidPriceError);
    });

    it('debe aceptar precio con 2 decimales', () => {
      const price = Price.create(29.99, currency);
      expect(price.getAmount()).toBe(29.99);
    });

    it('debe aceptar precio con 1 decimal', () => {
      const price = Price.create(29.9, currency);
      expect(price.getAmount()).toBe(29.9);
    });

    it('debe aceptar precio entero', () => {
      const price = Price.create(30, currency);
      expect(price.getAmount()).toBe(30);
    });
  });

  describe('add', () => {
    it('debe sumar dos precios de la misma moneda', () => {
      const price1 = Price.create(29.99, currency);
      const price2 = Price.create(15.50, currency);

      const result = price1.add(price2);

      expect(result.getAmount()).toBe(45.49);
      expect(result.getCurrency().getCode()).toBe('USD');
    });

    it('debe rechazar suma de precios de diferentes monedas', () => {
      const priceUsd = Price.create(29.99, Currency.create('USD'));
      const priceEur = Price.create(27.99, Currency.create('EUR'));

      expect(() => priceUsd.add(priceEur)).toThrow();
    });

    it('debe sumar correctamente con decimales', () => {
      const price1 = Price.create(10.50, currency);
      const price2 = Price.create(5.49, currency);

      const result = price1.add(price2);

      expect(result.getAmount()).toBe(15.99);
    });
  });

  describe('multiply', () => {
    it('debe multiplicar precio por cantidad entera', () => {
      const price = Price.create(29.99, currency);

      const result = price.multiply(3);

      expect(result.getAmount()).toBe(89.97);
    });

    it('debe multiplicar por 1 devolviendo el mismo precio', () => {
      const price = Price.create(29.99, currency);

      const result = price.multiply(1);

      expect(result.getAmount()).toBe(29.99);
    });

    it('debe multiplicar por 0 devolviendo cero', () => {
      const price = Price.create(29.99, currency);

      const result = price.multiply(0);

      expect(result.getAmount()).toBe(0);
    });

    it('debe rechazar multiplicación por número negativo', () => {
      const price = Price.create(29.99, currency);

      expect(() => price.multiply(-5)).toThrow(InvalidPriceError);
    });

    it('debe redondear correctamente a 2 decimales', () => {
      const price = Price.create(10, currency);

      const result = price.multiply(0.15); // 1.5

      expect(result.getAmount()).toBe(1.5);
    });

    it('debe preservar la moneda al multiplicar', () => {
      const price = Price.create(29.99, currency);

      const result = price.multiply(5);

      expect(result.getCurrency().getCode()).toBe('USD');
    });
  });

  describe('equals', () => {
    it('debe considerar iguales dos precios con mismo monto y moneda', () => {
      const price1 = Price.create(29.99, currency);
      const price2 = Price.create(29.99, currency);

      expect(price1.equals(price2)).toBe(true);
    });

    it('debe considerar diferentes dos precios con distinto monto', () => {
      const price1 = Price.create(29.99, currency);
      const price2 = Price.create(30, currency);

      expect(price1.equals(price2)).toBe(false);
    });

    it('debe considerar diferentes dos precios de distinta moneda', () => {
      const priceUsd = Price.create(29.99, Currency.create('USD'));
      const priceEur = Price.create(29.99, Currency.create('EUR'));

      expect(priceUsd.equals(priceEur)).toBe(false);
    });
  });

  describe('toString', () => {
    it('debe retornar representación en string', () => {
      const price = Price.create(29.99, currency);

      expect(price.toString()).toBe('29.99 USD');
    });

    it('debe formatear correctamente con dos decimales', () => {
      const price = Price.create(100, currency);

      expect(price.toString()).toBe('100.00 USD');
    });
  });
});
