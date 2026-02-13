import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { CreatePaymentUseCase } from '../../../application/use-cases/CreatePaymentUseCase';
import { CreatePaymentRequest } from '../../../application/dto/CreatePaymentDTO';
import { isError } from '../../../shared/Result';
import { Logger } from '../../../application/ports/Logger.js';
import { AppError } from '../../../application/errors.js';

export class PaymentsController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly logger: Logger
  ) {}

  async registerRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/orders/:id/payments', this.createPayment.bind(this));
  }

  private async createPayment(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const requestId = randomUUID();
    const logger = this.logger.child({
      requestId,
      operation: 'createPayment',
      method: request.method,
      url: request.url,
    });

    const orderId = (request.params as { id: string }).id;
    const body = request.body as Omit<CreatePaymentRequest, 'orderId'>;

    logger.info('Received request to create payment', { orderId, type: body.type });

    const dto: CreatePaymentRequest = {
      orderId,
      amount: body.amount,
      currency: body.currency,
      type: body.type,
    };

    const result = await this.createPaymentUseCase.execute(dto);

    if (isError(result)) {
      const statusCode = this.mapErrorToStatusCode(result.error);
      logger.error('Failed to create payment', {
        orderId,
        error: (result.error as { type?: string }).type,
        message: (result.error as { message?: string }).message,
        statusCode,
      });
      return this.handleError(reply, result.error);
    }

    logger.info('Payment created successfully', {
      orderId,
      paymentId: result.value.paymentId,
    });

    reply.status(201).send({
      success: true,
      data: result.value,
    });
  }

  private mapErrorToStatusCode(error: AppError): number {
    switch (error.name) {
      case 'ValidationError':
        return 400;
      case 'NotFoundError':
        return 404;
      case 'ConflictError':
        return 409;
      case 'InfraError':
        return 503;
      default:
        return 500;
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
      default:
        reply.status(500).send({
          success: false,
          error: {
            type: 'UNKNOWN',
            message: error?.message ?? 'Error desconocido',
          },
        });
    }
  }
}
