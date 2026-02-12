import { InMemoryOrderRepository } from '../infrastructure/persistence/in-memory/InMemoryOrderRepository';
import { StaticPricingService } from '../infrastructure/http/StaticPricingService';
import { NoopEventBus } from '../infrastructure/messaging/NoopEventBus';
import { OutBoxEventBus } from '../infrastructure/messaging/OutBoxEventBus';
import { CreateOrderUseCase } from '../application/use-cases/CreateOrderUseCase';
import { AddItemToOrderUseCase } from '../application/use-cases/AddItemToOrderUseCase';
import { OrdersController } from '../infrastructure/http/controllers/OrdersController';
import { Clock } from '../application/ports/Clock';
import { OrderRepository } from '../application/ports/OrderRepository';
import { EventBus } from '../application/ports/EventBus';
import { UnitOfWork } from '../application/ports/UnitOfWork';
import { PgUnitOfWork } from '../infrastructure/persistence/db/PgUnitOfWork';
import { PostgresOrderRepository } from '../infrastructure/persistence/db/PostgresOrderRepository';
import { PinoLogger } from '../infrastructure/logging/PinoLogger';
import config from './config';
import pkg from 'pg';

const { Pool } = pkg;

/**
 * Implementación simple de Clock que devuelve la hora actual
 */
class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Contenedor de inyección de dependencias.
 * Instancia todos los puertos, adaptadores, casos de uso y controladores.
 */
export interface Container {
  // Puertos
  orderRepository: OrderRepository;
  pricingService: StaticPricingService;
  eventBus: EventBus;
  clock: Clock;
  unitOfWork?: UnitOfWork;
  persistenceDriver: 'memory' | 'postgres';
  cleanup: () => Promise<void>;

  // Casos de uso
  createOrderUseCase: CreateOrderUseCase;
  addItemToOrderUseCase: AddItemToOrderUseCase;

  // Controladores
  ordersController: OrdersController;
  logger: PinoLogger;
}

export function buildContainer(): Container {
  const persistenceDriver = config.persistenceDriver;
  const pricingService = new StaticPricingService();
  const clock = new SystemClock();
  const logger = new PinoLogger();

  let orderRepository: OrderRepository;
  let eventBus: EventBus;
  let unitOfWork: UnitOfWork | undefined;
  let pool: InstanceType<typeof Pool> | undefined;

  if (persistenceDriver === 'postgres') {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
    });
    orderRepository = new PostgresOrderRepository(pool);
    eventBus = new OutBoxEventBus(pool);
    unitOfWork = new PgUnitOfWork(pool);
  } else {
    orderRepository = new InMemoryOrderRepository();
    eventBus = new NoopEventBus();
  }

  const cleanup = async (): Promise<void> => {
    if (pool) {
      await pool.end();
    }
  };

  // Instanciar casos de uso
  const createOrderUseCase = new CreateOrderUseCase(
    orderRepository,
    eventBus,
    clock,
    unitOfWork
  );

  const addItemToOrderUseCase = new AddItemToOrderUseCase(
    orderRepository,
    pricingService,
    eventBus,
    unitOfWork
  );

  // Instanciar controladores
  const ordersController = new OrdersController(
    createOrderUseCase,
    addItemToOrderUseCase,
    logger
  );

  return {
    // Puertos
    orderRepository,
    pricingService,
    eventBus,
    clock,
    unitOfWork,
    persistenceDriver,
    cleanup,

    // Casos de uso
    createOrderUseCase,
    addItemToOrderUseCase,

    // Controladores
    ordersController,
    logger,
  };
}
