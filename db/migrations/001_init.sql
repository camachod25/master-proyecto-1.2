-- Create ENUM types
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE event_type AS ENUM ('OrderCreated', 'ItemAddedToOrder');

-- Orders table
CREATE TABLE orders (
  id VARCHAR(255) PRIMARY KEY,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);

-- Orders Items table
CREATE TABLE orders_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(19, 2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(19, 2) NOT NULL CHECK (total_price >= 0),
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_items_order_id ON orders_items(order_id);
CREATE INDEX idx_orders_items_sku ON orders_items(sku);
CREATE INDEX idx_orders_items_created_at ON orders_items(created_at);

-- Unique constraint to prevent duplicate items per order (one item per SKU per order)
CREATE UNIQUE INDEX idx_orders_items_order_sku ON orders_items(order_id, sku);

-- Outbox table (Event Sourcing pattern)
CREATE TABLE outbox (
  id BIGSERIAL PRIMARY KEY,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  event_type event_type NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP DEFAULT NULL
);


-- Index for aggregate queries
CREATE INDEX idx_outbox_aggregate_id ON outbox(aggregate_id);

-- Index for event type queries
CREATE INDEX idx_outbox_event_type ON outbox(event_type);

-- Index for published events (for archival/cleanup)
CREATE INDEX idx_outbox_published_at ON outbox(published_at) WHERE published_at IS NOT NULL;

-- Add trigger for updating 'updated_at' column on orders
CREATE OR REPLACE FUNCTION update_orders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_timestamp();
