import { EventBus } from '../../application/ports/EventBus';
import { DomainEvent } from '../../domain/events/DomainEvent';
/**
 * Implementación No-Op (No Operation) del EventBus.
 * Simula la publicación de eventos sin hacer nada realmente.
 * Útil para desarrollo inicial y testing.
 */
export class NoopEventBus implements EventBus {
  async publish(_event: DomainEvent): Promise<void> {
    // No hace nada - propósito puramente de cumplir la interfaz
    // En un escenario real, esto enviaría el evento a un message broker
  }

  async publishBatch(_events: DomainEvent[]): Promise<void> {
    // No hace nada - propósito puramente de cumplir la interfaz
    // En un escenario real, esto enviaría un lote de eventos a un message broker
  }
}
