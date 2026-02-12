import { ServerDependencies } from '../../application/ports/ServerDependencies.js';
import { OrdersController } from './controllers/OrdersController.js';
import fastify from 'fastify';

export async function buildServer(dependencies: ServerDependencies) {
    const server = fastify({
        logger: false,
    });

    const ordersController = new OrdersController(
        dependencies.createOrder,
        dependencies.addItemToOrder
    );

    await ordersController.registerRoutes(server);

    server.get('/health', async () => {
        dependencies.logger.info('Health check endpoint called');
        return { status: 'OK' };
    });

    return server;
}