import { describe, it, expect, beforeEach } from 'vitest';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase';
import { AddItemToOrderUseCase } from '@application/use-cases/AddItemToOrderUseCase';
import { CreatePaymentUseCase } from '@application/use-cases/CreatePaymentUseCase';
import { InMemoryOrderRepository } from '@infrastructure/persistence/in-memory/InMemoryOrderRepository';
import { InMemoryPaymentRepository } from '@infrastructure/persistence/in-memory/InMemoryPaymentRepository';
import { StaticPricingService } from '@infrastructure/http/StaticPricingService';
import { NoopEventBus } from '@infrastructure/messaging/NoopEventBus';
import { isError } from '@shared/Result';

class SystemClock {
  now(): Date {
    return new Date();
  }
}

describe('CreatePayment - Acceptance Test (In-Memory)', () => {
  let createOrderUseCase: CreateOrderUseCase;
  let addItemToOrderUseCase: AddItemToOrderUseCase;
  let createPaymentUseCase: CreatePaymentUseCase;
  let orderRepository: InMemoryOrderRepository;
  let paymentRepository: InMemoryPaymentRepository;
  let pricingService: StaticPricingService;
  let eventBus: NoopEventBus;
  let clock: SystemClock;

  beforeEach(() => {
    orderRepository = new InMemoryOrderRepository();
    paymentRepository = new InMemoryPaymentRepository();
    pricingService = new StaticPricingService();
    eventBus = new NoopEventBus();
    clock = new SystemClock();

    createOrderUseCase = new CreateOrderUseCase(orderRepository, eventBus, clock);
    addItemToOrderUseCase = new AddItemToOrderUseCase(orderRepository, pricingService, eventBus);
    createPaymentUseCase = new CreatePaymentUseCase(orderRepository, paymentRepository, eventBus);
  });

  it('debe crear un pago cuando el monto coincide con el total de la orden', async () => {
    const createOrderResult = await createOrderUseCase.execute({ orderSku: 'ORDER-PAY-001' });
    if (isError(createOrderResult)) return;

    const orderId = createOrderResult.value.orderId;

    const addItemResult = await addItemToOrderUseCase.execute({
      orderId,
      sku: 'WIDGET-001',
      quantity: 2,
      currency: 'USD',
    });

    if (isError(addItemResult)) return;

    const paymentResult = await createPaymentUseCase.execute({
      orderId,
      amount: addItemResult.value.total,
      currency: 'USD',
      type: 'tarjeta',
    });

    expect(!isError(paymentResult)).toBe(true);
    if (isError(paymentResult)) return;

    expect(paymentResult.value.paymentId).toMatch(/^PAY-/);
    expect(paymentResult.value.orderId).toBe(orderId);
    expect(paymentResult.value.amount).toBe(59.98);
    expect(paymentResult.value.currency).toBe('USD');
    expect(paymentResult.value.type).toBe('TARJETA');
  });

  it('debe rechazar pago si el monto no coincide con el total de la orden', async () => {
    const createOrderResult = await createOrderUseCase.execute({ orderSku: 'ORDER-PAY-002' });
    if (isError(createOrderResult)) return;

    const orderId = createOrderResult.value.orderId;

    const addItemResult = await addItemToOrderUseCase.execute({
      orderId,
      sku: 'WIDGET-001',
      quantity: 2,
      currency: 'USD',
    });

    if (isError(addItemResult)) return;

    const paymentResult = await createPaymentUseCase.execute({
      orderId,
      amount: 60,
      currency: 'USD',
      type: 'efectivo',
    });

    expect(isError(paymentResult)).toBe(true);
    if (!isError(paymentResult)) return;

    expect(paymentResult.error.type).toBe('CONFLICT');
  });

  it('debe rechazar tipo de pago inválido', async () => {
    const createOrderResult = await createOrderUseCase.execute({ orderSku: 'ORDER-PAY-003' });
    if (isError(createOrderResult)) return;

    const orderId = createOrderResult.value.orderId;

    const addItemResult = await addItemToOrderUseCase.execute({
      orderId,
      sku: 'WIDGET-001',
      quantity: 1,
      currency: 'USD',
    });

    if (isError(addItemResult)) return;

    const paymentResult = await createPaymentUseCase.execute({
      orderId,
      amount: addItemResult.value.total,
      currency: 'USD',
      type: 'cripto',
    });

    expect(isError(paymentResult)).toBe(true);
    if (!isError(paymentResult)) return;

    expect(paymentResult.error.type).toBe('VALIDATION_ERROR');
  });
});
