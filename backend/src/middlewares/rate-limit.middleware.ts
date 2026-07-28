import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { checkChatRateLimit, checkUploadRateLimit } from '../services/rate-limit.service';
import { sendError } from '../utils/http-response.utils';

function setRateLimitHeaders(res: Response, result: { limit: number; remaining: number; resetAt: number }) {
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
}

export async function chatRateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const workspaceId = req.user?.workspaceId || 'default';
  const result = await checkChatRateLimit(workspaceId);
  setRateLimitHeaders(res, result);

  if (!result.allowed) {
    sendError(res, 429, 'RATE_LIMITED', 'Chat rate limit exceeded (20 requests per minute per workspace).', {
      limit: result.limit,
      resetAt: result.resetAt,
    });
    return;
  }

  next();
}

export async function uploadRateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const workspaceId = req.user?.workspaceId || 'default';
  const result = await checkUploadRateLimit(workspaceId);
  setRateLimitHeaders(res, result);

  if (!result.allowed) {
    sendError(res, 429, 'RATE_LIMITED', 'Upload rate limit exceeded (10 uploads per hour per workspace).', {
      limit: result.limit,
      resetAt: result.resetAt,
    });
    return;
  }

  next();
}
