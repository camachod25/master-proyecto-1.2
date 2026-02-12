import { describe, it, expect, beforeEach } from 'vitest';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase';
import { InMemoryOrderRepository } from '@infrastructure/persistence/in-memory/InMemoryOrderRepository';
import { StaticPricingService } from '@infrastructure/http/StaticPricingService';
import { NoopEventBus } from '@infrastructure/messaging/NoopEventBus';
import { SKU } from '@domain/value-objects/SKU';
import { Currency } from '@domain/value-objects/Currency';
import { isError } from '@shared/Result';

class SystemClock {
  now(): Date {
    return new Date();
  }
}

describe('AddItemToOrder - Acceptance Test (In-Memory)', () => {
  let createOrderUseCase: CreateOrderUseCase;
  let addItemToOrderUseCase: AddItemToOrderUseCase;
  let orderRepository: InMemoryOrderRepository;
  let pricingService: StaticPricingService;
  let eventBus: NoopEventBus;
  let clock: SystemClock;

  beforeEach(() => {
    orderRepository = new InMemoryOrderRepository();
    pricingService = new StaticPricingService();
    eventBus = new NoopEventBus();
    clock = new SystemClock();

    createOrderUseCase = new CreateOrderUseCase(
      orderRepository,
      eventBus,
      clock
    );
    addItemToOrderUseCase = new AddItemToOrderUseCase(
      orderRepository,
      pricingService,
      eventBus
    );
  });

  describe('Happy Path', () => {
    it('debe crear una orden y añadir items correctamente', async () => {
      // 1. Crear orden
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-001' });
      expect(!isError(createResult)).toBe(true);

      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      // 2. Añadir primer item
      const addResult1 = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'USD',
      });

      expect(!isError(addResult1)).toBe(true);
      if (isError(addResult1)) return;

      expect(addResult1.value.itemCount).toBe(2);
      expect(addResult1.value.total).toBe(59.98); // 2 * 29.99
      expect(addResult1.value.currency).toBe('USD');

      // 3. Añadir segundo item diferente
      const addResult2 = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'GADGET-002',
        quantity: 3,
        currency: 'USD',
      });

      expect(!isError(addResult2)).toBe(true);
      if (isError(addResult2)) return;

      expect(addResult2.value.itemCount).toBe(5); // 2 + 3
      expect(addResult2.value.total).toBe(195.47); // (2 * 29.99) + (3 * 49.99)
      expect(addResult2.value.currency).toBe('USD');
    });

    it('debe incrementar cantidad si añade SKU existente', async () => {
      // Crear orden
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-002' });
      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      // Añadir item primera vez
      const addResult1 = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'USD',
      });
      expect(!isError(addResult1)).toBe(true);

      // Añadir mismo item segunda vez
      const addResult2 = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'WIDGET-001',
        quantity: 3,
        currency: 'USD',
      });

      expect(!isError(addResult2)).toBe(true);
      if (isError(addResult2)) return;

      expect(addResult2.value.itemCount).toBe(5); // 2 + 3
      expect(addResult2.value.total).toBe(149.95); // 5 * 29.99
    });

    it('debe funcionar con diferentes monedas', async () => {
      // Crear orden en EUR
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-003' });
      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      // Añadir item en EUR
      const addResult = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'EUR',
      });

      expect(!isError(addResult)).toBe(true);
      if (isError(addResult)) return;

      expect(addResult.value.currency).toBe('EUR');
      expect(addResult.value.total).toBe(55.98); // 2 * 27.99
    });
  });

  describe('Error Cases', () => {
    it('debe rechazar orden con ID inválido', async () => {
      const result = await addItemToOrderUseCase.execute({
        orderId: '',
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'USD',
      });

      expect(isError(result)).toBe(true);
      if (!isError(result)) return;
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.field).toBe('orderId');
    });

    it('debe rechazar SKU vacío', async () => {
      const result = await addItemToOrderUseCase.execute({
        orderId: 'ORD-123',
        sku: '',
        quantity: 2,
        currency: 'USD',
      });

      expect(isError(result)).toBe(true);
      if (!isError(result)) return;
      expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(result.error.field).toBe('sku');
    });

    it('debe rechazar cantidad invalida', async () => {
      const result1 = await addItemToOrderUseCase.execute({
        orderId: 'ORD-123',
        sku: 'WIDGET-001',
        quantity: 0,
        currency: 'USD',
      });

      expect(isError(result1)).toBe(true);
      if (!isError(result1)) return;
      expect(result1.error.type).toBe('VALIDATION_ERROR');
      expect(result1.error.field).toBe('quantity');

      const result2 = await addItemToOrderUseCase.execute({
        orderId: 'ORD-123',
        sku: 'WIDGET-001',
        quantity: -5,
        currency: 'USD',
      });

      expect(isError(result2)).toBe(true);
    });

    it('debe retornar NOT_FOUND para orden inexistente', async () => {
      const result = await addItemToOrderUseCase.execute({
        orderId: 'NONEXISTENT-ORDER-ID',
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'USD',
      });

      expect(isError(result)).toBe(true);
      if (!isError(result)) return;
      expect(result.error.type).toBe('NOT_FOUND');
      expect(result.error.resource).toBe('Order');
    });

    it('debe rechazar SKU no válido', async () => {
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-004' });
      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      const result = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'A'.repeat(51), // SKU excede 50 caracteres
        quantity: 2,
        currency: 'USD',
      });

      expect(isError(result)).toBe(true);
      if (!isError(result)) return;
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar precio no disponible para SKU', async () => {
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-005' });
      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      const result = await addItemToOrderUseCase.execute({
        orderId,
        sku: 'NONEXISTENT-SKU',
        quantity: 2,
        currency: 'USD',
      });

      expect(isError(result)).toBe(true);
      if (!isError(result)) return;
      expect(result.error.type).toBe('INFRA_ERROR');
    });
  });

  describe('Integration', () => {
    it('debe mantener persistencia en repositorio en memoria', async () => {
      // Crear orden
      const createResult = await createOrderUseCase.execute({ orderSku: 'ORDER-006' });
      if (isError(createResult)) return;
      const orderId = createResult.value.orderId;

      // Añadir item
      await addItemToOrderUseCase.execute({
        orderId,
        sku: 'WIDGET-001',
        quantity: 5,
        currency: 'MXN',
      });

      // Recuperar orden del repositorio
      const orderResult = await orderRepository.getById(
        { getValue: () => orderId } as any
      );

      expect(!isError(orderResult)).toBe(true);
      if (isError(orderResult)) return;

      const order = orderResult.value;
      expect(order.getItemCount()).toBe(5);
      expect(order.getCurrency()?.getCode()).toBe('MXN');
    });

    it('debe funcionar con múltiples órdenes independientes', async () => {
      // Crear orden 1
      const create1 = await createOrderUseCase.execute({ orderSku: 'ORDER-007' });
      if (isError(create1)) return;
      const orderId1 = create1.value.orderId;

      // Crear orden 2
      const create2 = await createOrderUseCase.execute({ orderSku: 'ORDER-008' });
      if (isError(create2)) return;
      const orderId2 = create2.value.orderId;

      // Añadir items a orden 1
      const add1 = await addItemToOrderUseCase.execute({
        orderId: orderId1,
        sku: 'WIDGET-001',
        quantity: 2,
        currency: 'USD',
      });

      // Añadir items a orden 2
      const add2 = await addItemToOrderUseCase.execute({
        orderId: orderId2,
        sku: 'GADGET-002',
        quantity: 3,
        currency: 'EUR',
      });

      expect(!isError(add1)).toBe(true);
      expect(!isError(add2)).toBe(true);
      if (isError(add1) || isError(add2)) return;

      expect(add1.value.currency).toBe('USD');
      expect(add2.value.currency).toBe('EUR');
      expect(add1.value.total).not.toBe(add2.value.total);
    });
  });
});
