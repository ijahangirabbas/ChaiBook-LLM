import { redisConnection } from '../queue/ingestion.queue';
import { config } from '../config/env.config';
import { AppError } from '../errors/app.error';

function todayKey(workspaceId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `tokens:${workspaceId}:${day}`;
}

function activeIngestionKey(workspaceId: string): string {
  return `ingest:active:${workspaceId}`;
}

export async function assertTokenBudget(workspaceId: string, estimatedTokens: number): Promise<void> {
  if (estimatedTokens <= 0) return;

  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }

    const key = todayKey(workspaceId);
    const usedRaw = await redisConnection.get(key);
    const used = usedRaw ? parseInt(usedRaw, 10) : 0;
    const budget = config.workspaceDailyTokenBudget;

    if (used + estimatedTokens > budget) {
      throw AppError.tokenBudgetExceeded(
        `Daily token budget exceeded for this workspace (${budget.toLocaleString()} tokens/day).`,
        { used, budget, requested: estimatedTokens }
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Fail open if Redis unavailable outside production
    if (config.nodeEnv === 'production') {
      throw AppError.tokenBudgetExceeded('Unable to verify workspace token budget.');
    }
  }
}

export async function recordTokenUsage(workspaceId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;

  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const key = todayKey(workspaceId);
    await redisConnection.incrby(key, tokens);
    await redisConnection.expire(key, 60 * 60 * 48);
  } catch {
    // non-fatal
  }
}

export async function assertIngestionConcurrency(workspaceId: string): Promise<void> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }

    const key = activeIngestionKey(workspaceId);
    const activeRaw = await redisConnection.get(key);
    const active = activeRaw ? parseInt(activeRaw, 10) : 0;

    if (active >= config.workspaceIngestionConcurrency) {
      throw AppError.concurrencyLimit(
        `Too many ingestion jobs running for this workspace (max ${config.workspaceIngestionConcurrency}).`,
        { active, limit: config.workspaceIngestionConcurrency }
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (config.nodeEnv === 'production') {
      throw AppError.concurrencyLimit('Unable to verify ingestion concurrency limits.');
    }
  }
}

export async function incrementIngestionConcurrency(workspaceId: string): Promise<void> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const key = activeIngestionKey(workspaceId);
    await redisConnection.incr(key);
    await redisConnection.expire(key, 60 * 60 * 6);
  } catch {
    // non-fatal
  }
}

export async function decrementIngestionConcurrency(workspaceId: string): Promise<void> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const key = activeIngestionKey(workspaceId);
    const next = await redisConnection.decr(key);
    if (next < 0) {
      await redisConnection.set(key, '0');
    }
  } catch {
    // non-fatal
  }
}
