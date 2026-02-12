import { PricingService } from '../../application/ports/PricingService.js';
import { Price } from '../../domain/value-objects/Price.js';
import { SKU } from '../../domain/value-objects/SKU.js';
import { Currency } from '../../domain/value-objects/Currency.js';
import { Result, ok, fail } from '../../shared/Result.js';
import { InfraError } from '../../application/errors.js';

/**
 * Implementación estática del servicio de precios.
 * Simula un servicio externo que retorna precios ficticios basados en SKU y moneda.
 */
export class StaticPricingService implements PricingService {
  private readonly priceDatabase: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.initializePrices();
  }

  private initializePrices(): void {
    // Precios en USD
    const usdPrices = new Map<string, number>([
      ['WIDGET-001', 29.99],
      ['GADGET-002', 49.99],
      ['DEVICE-003', 99.99],
      ['COMPONENT-04', 15.50],
      ['ACCESSORY-05', 9.99],
    ]);

    // Precios en EUR
    const eurPrices = new Map<string, number>([
      ['WIDGET-001', 27.99],
      ['GADGET-002', 46.99],
      ['DEVICE-003', 93.99],
      ['COMPONENT-04', 14.50],
      ['ACCESSORY-05', 9.49],
    ]);

    // Precios en GBP
    const gbpPrices = new Map<string, number>([
      ['WIDGET-001', 23.99],
      ['GADGET-002', 39.99],
      ['DEVICE-003', 79.99],
      ['COMPONENT-04', 12.49],
      ['ACCESSORY-05', 7.99],
    ]);

    // Precios en MXN
    const mxnPrices = new Map<string, number>([
      ['WIDGET-001', 509.83],
      ['GADGET-002', 849.83],
      ['DEVICE-003', 1699.83],
      ['COMPONENT-04', 263.50],
      ['ACCESSORY-05', 169.83],
    ]);

    this.priceDatabase.set('USD', usdPrices);
    this.priceDatabase.set('EUR', eurPrices);
    this.priceDatabase.set('GBP', gbpPrices);
    this.priceDatabase.set('MXN', mxnPrices);
  }

  async getPriceForSku(
    sku: SKU,
    currency: Currency
  ): Promise<Result<Price, InfraError>> {
    try {
      const currencyCode = currency.getCode();
      const skuValue = sku.getValue();

      const currencyPrices = this.priceDatabase.get(currencyCode);
      if (!currencyPrices) {
        return fail({
          type: 'INFRA_ERROR',
          message: `No hay precios disponibles para la moneda ${currencyCode}`,
        } as InfraError);
      }

      const amount = currencyPrices.get(skuValue);
      if (amount === undefined) {
        return fail({
          type: 'INFRA_ERROR',
          message: `No hay precio disponible para el SKU ${skuValue} en ${currencyCode}`,
        } as InfraError);
      }

      const price = Price.create(amount, currency);
      return ok<Price>(price);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      return fail({
        type: 'INFRA_ERROR',
        message: `Error al obtener precio: ${message}`,
      } as InfraError);
    }
  }

  /**
   * Método para agregar precios dinámicamente (útil para testing)
   */
  addPrice(
    sku: SKU,
    currency: Currency,
    amount: number
  ): void {
    const currencyCode = currency.getCode();
    let currencyPrices = this.priceDatabase.get(currencyCode);

    if (!currencyPrices) {
      currencyPrices = new Map();
      this.priceDatabase.set(currencyCode, currencyPrices);
    }

    currencyPrices.set(sku.getValue(), amount);
  }

  /**
   * Retorna todos los precios disponibles (útil para inspección y debugging)
   */
  getAllPrices(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};

    this.priceDatabase.forEach((priceMap, currency) => {
      result[currency] = Object.fromEntries(priceMap);
    });

    return result;
  }
}
