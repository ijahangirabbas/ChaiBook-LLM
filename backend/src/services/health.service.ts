import { prisma } from '../db/prisma.client';
import { qdrantClient } from '../config/qdrant.config';
import { checkRedisConnection, ingestionQueue } from '../queue/ingestion.queue';
import { config } from '../config/env.config';
import { ingestionQueueDepth } from '../lib/metrics';

export interface DependencyCheck {
  name: string;
  ok: boolean;
  status: string;
  latencyMs?: number;
  error?: string;
}

export interface ReadinessReport {
  ready: boolean;
  checks: DependencyCheck[];
  timestamp: string;
}

async function timedCheck(name: string, fn: () => Promise<void>): Promise<DependencyCheck> {
  const start = Date.now();
  try {
    await fn();
    return {
      name,
      ok: true,
      status: 'up',
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name,
      ok: false,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err.message || 'check failed',
    };
  }
}

export async function checkPostgres(): Promise<DependencyCheck> {
  if (!config.databaseUrl) {
    return {
      name: 'postgres',
      ok: config.nodeEnv !== 'production',
      status: config.nodeEnv === 'production' ? 'down' : 'skipped',
      error: config.nodeEnv === 'production' ? 'DATABASE_URL not configured' : undefined,
    };
  }

  return timedCheck('postgres', async () => {
    await prisma.$queryRaw`SELECT 1`;
  });
}

export async function checkRedis(): Promise<DependencyCheck> {
  const result = await checkRedisConnection();
  return {
    name: 'redis',
    ok: result.connected,
    status: result.connected ? 'up' : 'down',
    error: result.error,
  };
}

export async function checkQdrant(): Promise<DependencyCheck> {
  return timedCheck('qdrant', async () => {
    await qdrantClient.getCollections();
  });
}

export async function checkEmbeddings(): Promise<DependencyCheck> {
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  const hasKey = Boolean(jinaKey) || Boolean(config.openaiApiKey && !config.openaiApiKey.startsWith('mock-'));

  if (!hasKey) {
    return {
      name: 'embeddings',
      ok: config.nodeEnv !== 'production',
      status: config.nodeEnv === 'production' ? 'down' : 'skipped',
      error: 'No JINA_API_KEY or OPENAI_API_KEY configured for embeddings',
    };
  }

  return {
    name: 'embeddings',
    ok: true,
    status: 'configured',
  };
}

export async function updateQueueMetrics(): Promise<void> {
  try {
    const counts = await ingestionQueue.getJobCounts('waiting', 'active', 'delayed', 'failed');
    ingestionQueueDepth.set(counts.waiting + counts.delayed);
  } catch {
    ingestionQueueDepth.set(0);
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [postgres, redis, qdrant, embeddings] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkQdrant(),
    checkEmbeddings(),
  ]);

  await updateQueueMetrics();

  const checks = [postgres, redis, qdrant, embeddings];
  const ready = checks.every((check) => check.ok);

  return {
    ready,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export async function getLivenessReport(): Promise<{ alive: boolean; uptimeSeconds: number }> {
  return {
    alive: true,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
