# Microservicio de Pedidos
- **Domain**: Order, Price, SKU, Quantity, Domain Events
- **Application**: Use cases CreateOrder, AddItemOrder, ports, DTOs
- **Infra**: Repository InMemory, static pricing, event bus no-op
- **HTTP**: endpoints with Fastify
- **Composition**: container.ts as root composition
- **Tests**: domain + cases use aceptation

# Comportamiento
- 'POST /orders' creates an order
- 'POST /orders/:id/items' adds a line (SKU + qty)
- Gets order´s total

# Estructura de carpetas

/src
    /domain
        /entities
        /value-objects
        /events
        /errors
    /application
        /use-cases
        /ports
        /dto
        /errors.ts
    /infrastructure
        /persistence/in-memory
        /http/controllers
        /http
        /messaging
    /composition
    /shared
/tests