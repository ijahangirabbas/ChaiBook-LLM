import { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app.error';

export interface ApiErrorBody {
  success: false;
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
}

export interface ApiSuccessBody<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
  pagination?: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function getRequestId(res: Response): string {
  return (res.getHeader('x-request-id') as string) || 'unknown';
}

export function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
  const body: ApiErrorBody = {
    success: false,
    code,
    message,
    requestId: getRequestId(res),
    ...(details !== undefined ? { details } : {}),
  };
  res.status(statusCode).json(body);
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, pagination?: ApiSuccessBody['pagination']): void {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    requestId: getRequestId(res),
    ...(pagination ? { pagination } : {}),
  };
  res.status(statusCode).json(body);
}

/** For legacy endpoints that return a flat payload (not wrapped in `data`). */
export function sendJson(
  res: Response,
  statusCode: number,
  body: Record<string, unknown>
): void {
  res.status(statusCode).json({
    ...body,
    requestId: getRequestId(res),
  });
}

export function handleControllerError(res: Response, error: unknown, next: (err: unknown) => void): void {
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, error.details);
    return;
  }
  if (error instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request parameters or payload format.', {
      fields: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }
  next(error);
}
