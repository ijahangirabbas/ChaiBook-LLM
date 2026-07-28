import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { AuthenticatedRequest } from './auth.middleware';

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const authReq = req as AuthenticatedRequest;
    const log = logger.child({
      requestId: req.requestId,
      userId: authReq.user?.id,
      workspaceId: authReq.user?.workspaceId,
    });

    const payload = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      userAgent: req.headers['user-agent'],
    };

    if (res.statusCode >= 500) {
      log.error(payload, 'request completed');
      return;
    }
    if (res.statusCode >= 400) {
      log.warn(payload, 'request completed');
      return;
    }
    log.info(payload, 'request completed');
  });

  next();
}
