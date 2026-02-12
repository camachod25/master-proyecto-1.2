import { Price } from '../domain/value-objects/Price';
import { SKU } from '../domain/value-objects/SKU';
import { Currency } from '../domain/value-objects/Currency';
import { Result } from '../../shared/Result';
import { AppError } from '../errors.js'

export interface PricingService {
  getPriceForSku(sku: SKU, currency: Currency): Promise<Result<Price, AppError>>;
}
