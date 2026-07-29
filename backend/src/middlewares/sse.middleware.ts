import { Request, Response, NextFunction } from 'express';

/** Marks the request as an SSE route. Headers are applied only after validation succeeds. */
export function sseMiddleware(_req: Request, res: Response, next: NextFunction): void {
  ;(res as Response & { __ssePending?: boolean }).__ssePending = true
  next()
}

/** Call only after auth/validation so error responses can still be normal JSON. */
export function beginSSE(res: Response): void {
  if (res.headersSent) return
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}
