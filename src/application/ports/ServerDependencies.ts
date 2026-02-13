import { CreateOrder } from '../use-cases/CreateOrder';
import { AddItemToOrder } from '../use-cases/AddItemToOrder';
import { CreatePayment } from '../use-cases/CreatePayment';
import { Logger } from './Logger.js';

export interface ServerDependencies {
  createOrder: CreateOrder;
  addItemToOrder: AddItemToOrder;
  createPayment: CreatePayment;
  logger: Logger;
}