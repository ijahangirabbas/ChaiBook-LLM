import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app.error';
import { sendError } from '../utils/http-response.utils';
import { logger } from '../lib/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) {
    // SSE / streaming response already started — finish with an SSE error if possible.
    try {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'failed', error: err.message || 'Stream error' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch {
      // ignore secondary write failures
    }
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request parameters or payload format.', {
      fields: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  console.error('💥 Express Global Error Handler:', err);
  logger.error({ err, requestId: req.requestId }, 'Unhandled error');
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', err.message || 'Internal Server Error');
}
