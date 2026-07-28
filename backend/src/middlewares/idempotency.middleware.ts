import { Response, NextFunction } from 'express';
import { redisConnection } from '../queue/ingestion.queue';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/http-response.utils';

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

export interface IdempotencyRecord {
  status: 'processing' | 'completed';
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
  createdAt: string;
}

function idempotencyRedisKey(workspaceId: string, scope: string, key: string): string {
  return `idempotency:${workspaceId}:${scope}:${key}`;
}

export async function getIdempotencyRecord(
  workspaceId: string,
  scope: string,
  key: string
): Promise<IdempotencyRecord | null> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const raw = await redisConnection.get(idempotencyRedisKey(workspaceId, scope, key));
    if (!raw) return null;
    return JSON.parse(raw) as IdempotencyRecord;
  } catch {
    return null;
  }
}

export async function saveIdempotencyRecord(
  workspaceId: string,
  scope: string,
  key: string,
  record: IdempotencyRecord
): Promise<void> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    await redisConnection.set(
      idempotencyRedisKey(workspaceId, scope, key),
      JSON.stringify(record),
      'EX',
      IDEMPOTENCY_TTL_SECONDS
    );
  } catch {
    // non-fatal
  }
}

export async function markIdempotencyProcessing(
  workspaceId: string,
  scope: string,
  key: string
): Promise<boolean> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const redisKey = idempotencyRedisKey(workspaceId, scope, key);
    const result = await redisConnection.set(
      redisKey,
      JSON.stringify({
        status: 'processing',
        statusCode: 102,
        body: null,
        createdAt: new Date().toISOString(),
      } satisfies IdempotencyRecord),
      'EX',
      IDEMPOTENCY_TTL_SECONDS,
      'NX'
    );
    return result === 'OK';
  } catch {
    return true;
  }
}

export async function runIdempotencyGuard(
  req: AuthenticatedRequest,
  res: Response,
  scope: string
): Promise<{ key: string; workspaceId: string } | null> {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return null;
  }

  const workspaceId = req.user?.workspaceId || 'default';
  const existing = await getIdempotencyRecord(workspaceId, scope, idempotencyKey);

  if (existing?.status === 'completed') {
    if (existing.headers) {
      Object.entries(existing.headers).forEach(([k, v]) => res.setHeader(k, v));
    }
    res.status(existing.statusCode).json(existing.body);
    return null;
  }

  if (existing?.status === 'processing') {
    sendError(res, 409, 'IDEMPOTENCY_CONFLICT', 'A request with this Idempotency-Key is already in progress.', {
      idempotencyKey,
    });
    return null;
  }

  const acquired = await markIdempotencyProcessing(workspaceId, scope, idempotencyKey);
  if (!acquired) {
    sendError(res, 409, 'IDEMPOTENCY_CONFLICT', 'A request with this Idempotency-Key is already in progress.', {
      idempotencyKey,
    });
    return null;
  }

  return { key: idempotencyKey, workspaceId };
}

export function idempotencyMiddleware(scope: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const guard = await runIdempotencyGuard(req, res, scope);
    if (!guard) {
      if (res.headersSent) return;
      if (!req.headers['idempotency-key']) {
        next();
      }
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      void saveIdempotencyRecord(guard.workspaceId, scope, guard.key, {
        status: 'completed',
        statusCode: res.statusCode || 200,
        body,
        createdAt: new Date().toISOString(),
      });
      return originalJson(body);
    };

    next();
  };
}

export async function completeIdempotencyFromResponse(
  workspaceId: string,
  scope: string,
  key: string,
  statusCode: number,
  body: unknown
): Promise<void> {
  await saveIdempotencyRecord(workspaceId, scope, key, {
    status: 'completed',
    statusCode,
    body,
    createdAt: new Date().toISOString(),
  });
}
