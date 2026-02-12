import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { CreateOrderUseCase } from '../../../application/use-cases/CreateOrderUseCase';
import { AddItemToOrderUseCase } from '../../../application/use-cases/AddItemToOrderUseCase';
import { CreateOrderRequest } from '../../../application/dto/CreateOrderDTO';
import { AddItemToOrderRequest } from '../../../application/dto/AddItemToOrderDTO';
import { isError } from '../../../shared/Result';
import { Logger } from '../../../application/ports/Logger.js';
import { randomUUID,  } from 'crypto';
import { AppError } from '../../../application/errors.js';

export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly addItemToOrderUseCase: AddItemToOrderUseCase,
    private readonly logger: Logger
  ) {}

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/orders', this.createOrder.bind(this));
    fastify.post('/orders/:id/items', this.addItemToOrder.bind(this));
  }

  private async createOrder(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const requestId = randomUUID();
    const logger = this.logger.child({ 
      requestId,
      operation: 'createOrder',
      method: request.method,
      url: request.url,
    });

    logger.info('Received request to create order', { orderSku: request.body.orderSku });

    const dto: CreateOrderRequest = request.body as CreateOrderRequest;

    const result = await this.createOrderUseCase.execute(dto);

    if (isError(result)) {
      const statusCode = this.mapErrorToStatusCode(result.error);
      logger.error('Failed to create order', { 
        orderSku: request.body.orderSku,
        error: result.error.type,
        message: result.error.message,
        statusCode
      });
      return this.handleError(reply, result.error);
    }

    logger.info('Order created successfully', { orderId: result.value.id });
    reply.status(201).send({
      success: true,
      data: result.value,
    });
  }

  private async addItemToOrder(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const requestId = randomUUID();
    const logger = this.logger.child({ 
      requestId,
      operation: 'addItemToOrder',
      method: request.method,
      url: request.url,
    });

    const orderId = request.params.id as string;
    const body = request.body as Omit<AddItemToOrderRequest, 'orderId'>;

    logger.info('Received request to add item to order', { orderId, sku: body.sku });
    
    const dto: AddItemToOrderRequest = {
      orderId,
      sku: body.sku,
      quantity: body.quantity,
      currency: body.currency,
    };

    const result = await this.addItemToOrderUseCase.execute(dto);

    if (isError(result)) {
      const statusCode = this.mapErrorToStatusCode(result.error);
      logger.error('Failed to add item to order', { 
        orderId,
        error: result.error.type,
        message: result.error.message,
        statusCode
      });
      return this.handleError(reply, result.error);
    }

    logger.info('Item added to order successfully', { orderId, sku: body.sku });
    
    reply.status(200).send({
      success: true,
      data: result.value,
    });
  }

  private mapErrorToStatusCode(error: AppError): number {
    switch (error.name) {
      case 'ValidationError':
        return 400
      case 'NotFoundError':
        return 404
      case 'ConflictError':
        return 409
      case 'InfraError':
        return 503
      default:
        return 500
    }
  }

  private handleError(reply: FastifyReply, error: any): void {
    switch (error.type) {
      case 'VALIDATION_ERROR':
        reply.status(400).send({
          success: false,
          error: {
            type: error.type,
            message: error.message,
            field: error.field,
          },
        });
        break;

      case 'NOT_FOUND':
        reply.status(404).send({
          success: false,
          error: {
            type: error.type,
            message: error.message,
            resource: error.resource,
          },
        });
        break;

      case 'CONFLICT':
        reply.status(409).send({
          success: false,
          error: {
            type: error.type,
            message: error.message,
          },
        });
        break;

      case 'INFRA_ERROR':
        reply.status(503).send({
          success: false,
          error: {
            type: error.type,
            message: error.message,
          },
        });
        break;

      case 'UNKNOWN':
      default:
        reply.status(500).send({
          success: false,
          error: {
            type: 'UNKNOWN',
            message: error.message,
          },
        });
    }
  }
}
