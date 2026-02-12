import type { Pool, PoolClient } from 'pg';
import { Order } from '../../../domain/entities/Order';
import { OrderId } from '../../../domain/value-objects/OrderId';
import { SKU } from '../../../domain/value-objects/SKU';
import { Quantity } from '../../../domain/value-objects/Quantity';
import { Currency } from '../../../domain/value-objects/Currency';
import { Price } from '../../../domain/value-objects/Price';
import { LineItem } from '../../../domain/value-objects/LineItem';
import { OrderRepository } from '../../../application/ports/OrderRepository';
import { InfraError, NotFoundError } from '../../../application/errors';
import { Result, ok, fail } from '../../../shared/Result';

interface OrderRow {
  id: string;
}

interface OrderWithItemsRow {
  order_id: string;
  sku: string | null;
  quantity: number | null;
  unit_price: string | null;
  item_currency: string | null;
}

interface PersistedOrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  totalPrice: number;
}

type Queryable = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Queryable) {}

  async save(order: Order): Promise<Result<void, InfraError>> {
    try {
      const orderId = order.getId().getValue();
      const items = this.extractItems(order);

      await this.db.query(
        `
          INSERT INTO orders (id, status)
          VALUES ($1, 'pending')
          ON CONFLICT (id) DO UPDATE
          SET status = EXCLUDED.status,
              updated_at = CURRENT_TIMESTAMP
        `,
        [orderId]
      );

      await this.db.query('DELETE FROM orders_items WHERE order_id = $1', [orderId]);

      if (items.length > 0) {
        await this.insertItems(this.db, orderId, items);
      }

      return ok(undefined);
    } catch (error) {
      console.error(`Error saving order ${order.getId().getValue()} to PostgreSQL:`, error instanceof Error ? error.message : error);
      return fail(
        new InfraError(
          `No se pudo guardar la orden ${order.getId().getValue()} en PostgreSQL`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async getById(id: OrderId): Promise<Result<Order, InfraError | NotFoundError>> {
    try {
      const orderResult = await this.db.query<OrderRow>(
        'SELECT id FROM orders WHERE id = $1',
        [id.getValue()]
      );

      if (orderResult.rowCount === 0) {
        return fail(new NotFoundError(id.getValue(), 'Order'));
      }

      const itemsResult = await this.db.query<OrderWithItemsRow>(
        `
          SELECT
            o.id AS order_id,
            oi.sku,
            oi.quantity,
            oi.unit_price::text AS unit_price,
            oi.currency AS item_currency
          FROM orders o
          LEFT JOIN orders_items oi ON oi.order_id = o.id
          WHERE o.id = $1
          ORDER BY oi.id ASC
        `,
        [id.getValue()]
      );

      const order = this.rebuildOrder(id.getValue(), itemsResult.rows);
      return ok(order);
    } catch (error) {
      return fail(
        new InfraError(
          `No se pudo recuperar la orden ${id.getValue()} desde PostgreSQL`,
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  async getAll(): Promise<Result<Order[], InfraError>> {
    try {
      const result = await this.db.query<OrderWithItemsRow>(
        `
          SELECT
            o.id AS order_id,
            oi.sku,
            oi.quantity,
            oi.unit_price::text AS unit_price,
            oi.currency AS item_currency
          FROM orders o
          LEFT JOIN orders_items oi ON oi.order_id = o.id
          ORDER BY o.created_at ASC, oi.id ASC
        `
      );

      if (result.rows.length === 0) {
        return ok([]);
      }

      const rowsByOrder = new Map<string, OrderWithItemsRow[]>();
      for (const row of result.rows) {
        if (!rowsByOrder.has(row.order_id)) {
          rowsByOrder.set(row.order_id, []);
        }
        rowsByOrder.get(row.order_id)!.push(row);
      }

      const orders: Order[] = [];
      for (const [orderId, rows] of rowsByOrder.entries()) {
        orders.push(this.rebuildOrder(orderId, rows));
      }

      return ok(orders);
    } catch (error) {
      return fail(
        new InfraError(
          'No se pudo recuperar el listado de órdenes desde PostgreSQL',
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  private extractItems(order: Order): PersistedOrderItem[] {
    return order.getLineItems().map((item) => {
      const unitPrice = item.getUnitPrice().getAmount();
      const quantity = item.getQuantity().getValue();

      return {
        sku: item.getSku().getValue(),
        quantity,
        unitPrice,
        currency: item.getUnitPrice().getCurrency().getCode(),
        totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      };
    });
  }

  private async insertItems(db: Queryable, orderId: string, items: PersistedOrderItem[]): Promise<void> {
    const valuesSql: string[] = [];
    const params: Array<string | number> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const base = i * 6;

      valuesSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      params.push(
        orderId,
        item.sku,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.currency
      );
    }

    await db.query(
      `
        INSERT INTO orders_items (order_id, sku, quantity, unit_price, total_price, currency)
        VALUES ${valuesSql.join(', ')}
      `,
      params
    );
  }

  private rebuildOrder(orderId: string, rows: OrderWithItemsRow[]): Order {
    const order = Order.create(OrderId.create(orderId));

    for (const row of rows) {
      if (!row.sku || row.quantity === null || row.unit_price === null || !row.item_currency) {
        continue;
      }

      const lineItem = LineItem.create(
        SKU.create(row.sku),
        Quantity.create(Number(row.quantity)),
        Price.create(Number(row.unit_price), Currency.create(row.item_currency))
      );
      order.addItem(lineItem);
    }

    order.clearDomainEvents();
    return order;
  }

}
