export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    cause?: Error
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    if (cause) {
      this.cause = cause;
    }
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, 400);
    this.field = field;
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} no encontrado: ${message}`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class InfraError extends AppError {
  constructor(message: string, cause?: Error) {
    super('INFRA_ERROR', message, 500, cause);
    this.name = 'InfraError';
  }
}
