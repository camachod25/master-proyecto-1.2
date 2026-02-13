import Fastify from 'fastify';
import { buildContainer } from './composition/container.js';
import config from './composition/config.js';

const PORT = config.port;
const HOST = config.host;

async function main() {
  const container = buildContainer();
  const fastify = Fastify({
    logger: true,
  });
  let isShuttingDown = false;

  const shutdown = async (signal: string, error?: unknown): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    try {
      console.log(`Cerrando servidor (${signal})`);
      await fastify.close();
      await container.cleanup();
      if (error) {
        console.error('Cierre por error fatal', { signal, error });
        process.exit(1);
      }
      process.exit(0);
    } catch (shutdownError) {
      console.error('Error durante cierre', { signal, shutdownError });
      process.exit(1);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.once('unhandledRejection', (reason) => {
    void shutdown('unhandledRejection', reason);
  });

  process.once('uncaughtException', (error) => {
    void shutdown('uncaughtException', error);
  });

  try {
    await container.ordersController.registerRoutes(fastify);
    await container.paymentsController.registerRoutes(fastify);

    // Health check
    fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    // Iniciar servidor
    await fastify.listen({ port: PORT, host: HOST });

    console.log(
      `Servidor iniciado en ${HOST}:${PORT} (persistence=${container.persistenceDriver})`
    );
  } catch (error) {
    await shutdown('startup_error', error);
  }
}

// Ejecutar main
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
