export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'AUTH_FAILED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TOKEN_BUDGET_EXCEEDED'
  | 'CONCURRENCY_LIMIT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'MISSING_SOURCE_DATA'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code: ApiErrorCode = 'VALIDATION_ERROR', details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static notFound(message: string) {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static rateLimited(message: string, details?: unknown) {
    return new AppError(429, 'RATE_LIMITED', message, details);
  }

  static tokenBudgetExceeded(message: string, details?: unknown) {
    return new AppError(429, 'TOKEN_BUDGET_EXCEEDED', message, details);
  }

  static concurrencyLimit(message: string, details?: unknown) {
    return new AppError(429, 'CONCURRENCY_LIMIT', message, details);
  }

  static idempotencyConflict(message: string, details?: unknown) {
    return new AppError(409, 'IDEMPOTENCY_CONFLICT', message, details);
  }
}
