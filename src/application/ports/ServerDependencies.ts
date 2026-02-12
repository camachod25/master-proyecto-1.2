import { CreateOrder } from '../use-cases/CreateOrder';
import { AddItemToOrder } from '../use-cases/AddItemToOrder';
import { Logger } from './Logger.js';

export interface ServerDependencies {
  createOrder: CreateOrder;
  addItemToOrder: AddItemToOrder;
  logger: Logger;
}