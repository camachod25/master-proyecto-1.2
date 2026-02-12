import { Pool } from 'pg';
import { DatabaseFactory } from '../database/DataBaseFactory';


interface OutboxEvent {
  id: string
  aggregate_id: string
  aggregate_type: string
  event_type: string
  event_data: object
  created_at: Date
}

export class OutBoxDispatcher {
  private readonly pool: Pool;
  private isRunning = false;
  private batchSize: number;
  private intervalMs: number;

  constructor(batchSize = 100, intervalMs = 5000) {
    this.pool = DatabaseFactory.createPool();
    this.batchSize = batchSize;
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('OutBoxDispatcher ya está en ejecución');
      return;
    }

    this.isRunning = true;
    console.log('OutBoxDispatcher iniciado');

    while (this.isRunning) {
        try {
            await this.proccesUnpublishedEvents();
            await this.sleep(this.intervalMs);
        } catch (error) {
            console.error('Error en OutBoxDispatcher:', error instanceof Error ? error.message : error);
            await this.sleep(this.intervalMs); // Backoff en caso de error
            // Opcional: implementar backoff exponencial o lógica de reintentos aquí
        }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log('OutBoxDispatcher detenido');
  }

  private async proccesUnpublishedEvents(): Promise<void> {
    const client = await this.pool.connect();

    try {
        await client.query('BEGIN');

        const selectQuery = `
            SELECT id, aggregate_id, aggregate_type, event_type, event_data, created_at
            FROM outbox
            WHERE published_at IS NULL
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        `;

        const result = await client.query(selectQuery, [this.batchSize]);
        const events: OutboxRecord[] = result.rows;

        if (events.length === 0) {
            await client.query('COMMIT');
            return;
        }

        for (const event of events) {
            try {
                await this.publishEvent(event);
                // Aquí se implementaría la lógica de publicación real, e.g., enviar a un message broker
                console.log(`Publicando evento ${event.event_type} con ID ${event.id}`);
            } catch (error) {
                console.error(`Error al publicar evento ${event.id}:`, error instanceof Error ? error.message : error);
                throw error; // Lanzamos el error para que se maneje en el bloque superior, pero no hacemos rollback para no bloquear otros eventos
                // No hacemos rollback para no bloquear otros eventos, simplemente lo dejamos sin publicar para reintentar después
            }
        }

        const ids = events.map(e => e.id);
        const updateQuery = `
            UPDATE outbox
            SET published_at = NOW()
            WHERE id = ANY($1)
        `;

        await client.query(updateQuery, [ids]);
        await client.query('COMMIT');
        
        console.log(`Procesados y marcados como publicados ${events.length} evento(s)`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error; // Lanzamos el error para que se maneje en el bloque superior
    } finally {
        client.release();
    }
  }

  private async publishEvent(event: OutboxEvent): Promise<void> {
    console.log(`Publishing event: ${event.event_type} for aggregate ${event.aggregate_type}:${event.aggregate_id}`)
    
    // Here you would integrate with your actual message broker (RabbitMQ, Apache Kafka, AWS SQS, etc.)
    // For now, we'll just log the event
    console.log('Event data:', JSON.stringify(event.event_data, null, 2))
    
    // Simulate async publishing
    await this.sleep(10)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
async function runDispatcher() {
    const dispatcher = new OutBoxDispatcher();

    process.on('SIGINT', () => {
        console.log('Recibida señal SIGINT, deteniendo OutBoxDispatcher...');
        dispatcher.stop();
        process.exit(0);
    })

    process.on('SIGTERM', () => {
        console.log('Recibida señal SIGTERM, deteniendo OutBoxDispatcher...');
        dispatcher.stop();
        process.exit(0);
    })

    try {
        await dispatcher.start();
    } catch (error) {
        console.error('Error en OutBoxDispatcher:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
    runDispatcher();
}