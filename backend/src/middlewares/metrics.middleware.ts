import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal, normalizeRoute } from '../lib/metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSec = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const route = normalizeRoute(req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.observe(labels, durationSec);
    httpRequestsTotal.inc(labels);
  });

  next();
}
