import { describe, it, expect, beforeEach } from 'vitest';
import { Order } from '@domain/entities/Order';
import { SKU } from '@domain/value-objects/SKU';
import { Quantity } from '@domain/value-objects/Quantity';
import { Price } from '@domain/value-objects/Price';
import { Currency } from '@domain/value-objects/Currency';
import { LineItem } from '@domain/value-objects/LineItem';
import { CurrencyMismatchError } from '@domain/errors/DomainError';

describe('Order Aggregate Root', () => {
  let order: Order;
  let currency: Currency;
  let sku: SKU;
  let quantity: Quantity;
  let price: Price;

  beforeEach(() => {
    order = Order.createWithId();
    currency = Currency.create('USD');
    sku = SKU.create('WIDGET-001');
    quantity = Quantity.create(5);
    price = Price.create(29.99, currency);
  });

  describe('create', () => {
    it('debe crear una orden con ID generado', () => {
      const newOrder = Order.createWithId();

      expect(newOrder.getId()).toBeDefined();
      expect(newOrder.getId().getValue()).toMatch(/^ORD-/);
    });

    it('debe crear una orden vacía sin items', () => {
      expect(order.getLineItems()).toHaveLength(0);
    });

    it('debe generar evento OrderCreated al crear', () => {
      const newOrder = Order.createWithId();

      const events = newOrder.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].getEventName()).toBe('OrderCreated');
    });

    it('debe tener moneda null al inicio', () => {
      expect(order.getCurrency()).toBeNull();
    });
  });

  describe('addItem', () => {
    it('debe añadir un item a la orden vacía', () => {
      const lineItem = LineItem.create(sku, quantity, price);

      order.addItem(lineItem);

      expect(order.getLineItems()).toHaveLength(1);
      expect(order.getLineItems()[0].getSku().equals(sku)).toBe(true);
    });

    it('debe asignar la moneda al primer item', () => {
      const lineItem = LineItem.create(sku, quantity, price);

      order.addItem(lineItem);

      expect(order.getCurrency()?.getCode()).toBe('USD');
    });

    it('debe rechazar item de diferente moneda', () => {
      const lineItem1 = LineItem.create(sku, quantity, price);
      order.addItem(lineItem1);

      const eurPrice = Price.create(27.99, Currency.create('EUR'));
      const sku2 = SKU.create('GADGET-002');
      const lineItem2 = LineItem.create(sku2, quantity, eurPrice);

      expect(() => order.addItem(lineItem2)).toThrow(CurrencyMismatchError);
    });

    it('debe incrementar cantidad si SKU ya existe', () => {
      const lineItem1 = LineItem.create(sku, Quantity.create(5), price);
      order.addItem(lineItem1);

      const lineItem2 = LineItem.create(sku, Quantity.create(3), price);
      order.addItem(lineItem2);

      expect(order.getLineItems()).toHaveLength(1);
      expect(order.getLineItems()[0].getQuantity().getValue()).toBe(8);
    });

    it('debe añadir item con diferente SKU como nuevo', () => {
      const lineItem1 = LineItem.create(sku, quantity, price);
      order.addItem(lineItem1);

      const sku2 = SKU.create('GADGET-002');
      const lineItem2 = LineItem.create(sku2, quantity, price);
      order.addItem(lineItem2);

      expect(order.getLineItems()).toHaveLength(2);
    });

    it('debe generar evento ItemAddedToOrder al añadir', () => {
      order.getDomainEvents(); // Clear initial event

      const lineItem = LineItem.create(sku, quantity, price);
      order.addItem(lineItem);

      const events = order.getDomainEvents();
      expect(events.some((e) => e.getEventName() === 'ItemAddedToOrder')).toBe(
        true
      );
    });
  });

  describe('getTotal', () => {
    it('debe rechazar calcular total si no hay items', () => {
      expect(() => order.getTotal()).toThrow('No hay items en el pedido');
    });

    it('debe calcular total con un item', () => {
      const lineItem = LineItem.create(
        sku,
        Quantity.create(2),
        Price.create(29.99, currency)
      );
      order.addItem(lineItem);

      const total = order.getTotal();

      expect(total.getAmount()).toBe(59.98);
      expect(total.getCurrency().getCode()).toBe('USD');
    });

    it('debe calcular total con múltiples items', () => {
      const lineItem1 = LineItem.create(
        SKU.create('WIDGET-001'),
        Quantity.create(2),
        Price.create(29.99, currency)
      );
      order.addItem(lineItem1);

      const lineItem2 = LineItem.create(
        SKU.create('GADGET-002'),
        Quantity.create(3),
        Price.create(15.50, currency)
      );
      order.addItem(lineItem2);

      const total = order.getTotal();

      expect(total.getAmount()).toBe(105.48); // (2 * 29.99) + (3 * 15.50)
    });
  });

  describe('getTotalByAmount', () => {
    it('debe retornar el monto total como número', () => {
      const lineItem = LineItem.create(
        sku,
        Quantity.create(2),
        Price.create(29.99, currency)
      );
      order.addItem(lineItem);

      const total = order.getTotalByAmount();

      expect(typeof total).toBe('number');
      expect(total).toBe(59.98);
    });
  });

  describe('getItemCount', () => {
    it('debe retornar 0 para orden vacía', () => {
      expect(order.getItemCount()).toBe(0);
    });

    it('debe retornar cantidad correcta con un item', () => {
      const lineItem = LineItem.create(sku, Quantity.create(5), price);
      order.addItem(lineItem);

      expect(order.getItemCount()).toBe(5);
    });

    it('debe retornar cantidad acumulada con múltiples items', () => {
      order.addItem(LineItem.create(SKU.create('SKU1'), Quantity.create(2), price));
      order.addItem(LineItem.create(SKU.create('SKU2'), Quantity.create(3), price));

      expect(order.getItemCount()).toBe(5);
    });

    it('debe actualizar cantidad cuando se añade SKU existente', () => {
      order.addItem(LineItem.create(sku, Quantity.create(5), price));
      order.addItem(LineItem.create(sku, Quantity.create(3), price));

      expect(order.getItemCount()).toBe(8);
    });
  });

  describe('getDomainEvents', () => {
    it('debe retornar copia de eventos', () => {
      const events1 = order.getDomainEvents();
      const events2 = order.getDomainEvents();

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  describe('clearDomainEvents', () => {
    it('debe limpiar los eventos publicados', () => {
      expect(order.getDomainEvents()).toHaveLength(1); // OrderCreated

      order.clearDomainEvents();

      expect(order.getDomainEvents()).toHaveLength(0);
    });

    it('debe permitir acumular nuevos eventos después de limpiar', () => {
      order.clearDomainEvents();

      const lineItem = LineItem.create(sku, quantity, price);
      order.addItem(lineItem);

      expect(order.getDomainEvents()).toHaveLength(1);
      expect(order.getDomainEvents()[0].getEventName()).toBe('ItemAddedToOrder');
    });
  });
});
