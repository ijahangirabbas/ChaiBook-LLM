import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request parameters or payload format.',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  console.error('💥 Express Global Error Handler:', err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Internal Server Error',
  });
}
