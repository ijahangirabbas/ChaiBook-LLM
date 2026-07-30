import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sourceService, ProcessSourceParams } from '../services/source.service';
import { ingestionJobService } from '../services/job.service';
import { config } from '../config/env.config';
import { decrementIngestionConcurrency } from '../services/workspace-quota.service';
import { logger } from '../lib/logger';
import { ingestionJobsTotal } from '../lib/metrics';

const rawRedisUrl = config.redisUrl;
// Valkey / Redis / ElastiCache: enable TLS when URL scheme is rediss://
const useTls = rawRedisUrl.startsWith('rediss://');

export const redisConnection = new IORedis(rawRedisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  tls: useTls ? {} : undefined,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  },
});

export const INGESTION_QUEUE_NAME = 'chaibook-source-ingestion';

export const ingestionQueue = new Queue<ProcessSourceParams>(INGESTION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export async function checkRedisConnection(): Promise<{
  connected: boolean;
  status: string;
  url: string;
  error?: string;
}> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const res = await redisConnection.ping();
    return {
      connected: res === 'PONG',
      status: redisConnection.status,
      url: rawRedisUrl,
    };
  } catch (err: any) {
    return {
      connected: false,
      status: redisConnection.status || 'disconnected',
      url: rawRedisUrl,
      error: err.message || 'Unable to connect to Redis server',
    };
  }
}

export async function enqueueIngestionJob(params: ProcessSourceParams): Promise<{ jobId: string }> {
  const jobId = await ingestionJobService.createJob(params.sourceId);

  const redisCheck = await checkRedisConnection();
  if (!redisCheck.connected) {
    if (config.nodeEnv === 'production') {
      throw new Error(
        `Ingestion queue unavailable: Redis is not connected (${redisCheck.error || 'unknown error'})`
      );
    }

    console.warn(
      '⚠️ Redis unavailable in development — running ingestion inline (not suitable for production).'
    );
    logger.warn({ sourceId: params.sourceId }, 'Redis unavailable — running ingestion inline');
    setImmediate(async () => {
      try {
        await processIngestionPipeline(params, jobId);
      } catch (err: any) {
        console.error(`Development fallback ingestion failed for source ${params.sourceId}:`, err.message);
      }
    });
    return { jobId };
  }

  await ingestionQueue.add(`ingest-${params.sourceId}`, { ...params, jobId }, { jobId });
  return { jobId };
}

async function processIngestionPipeline(params: ProcessSourceParams, jobId: string) {
  const { sourceId, workspaceId } = params;
  try {
    await ingestionJobService.recordStageEvent(
      jobId,
      sourceId,
      'validating',
      10,
      'Validating source format and content parameters...'
    );

    await sourceService.processAndIndexSource({ ...params, jobId });

    await ingestionJobService.recordStageEvent(
      jobId,
      sourceId,
      'ready',
      100,
      'Source processing and vector indexing complete.'
    );
  } catch (err: any) {
    await ingestionJobService.recordStageEvent(
      jobId,
      sourceId,
      'failed',
      0,
      err.message || 'Ingestion pipeline failed.',
      'PROCESSING_ERROR',
      err.stack
    );
    throw err;
  } finally {
    if (workspaceId) {
      await decrementIngestionConcurrency(workspaceId);
    }
  }
}

export function startIngestionWorker(): Worker<ProcessSourceParams> | null {
  try {
    const worker = new Worker<ProcessSourceParams>(
      INGESTION_QUEUE_NAME,
      async (job: Job<ProcessSourceParams & { jobId?: string }>) => {
        logger.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Processing ingestion job');
        const dbJobId = job.data.jobId || (await ingestionJobService.createJob(job.data.sourceId));
        await processIngestionPipeline(job.data, dbJobId);
        logger.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Ingestion job completed');
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    worker.on('completed', () => {
      ingestionJobsTotal.inc({ status: 'success' });
    });

    worker.on('failed', async (job, err) => {
      ingestionJobsTotal.inc({ status: 'failed' });
      logger.error({ jobId: job?.id, sourceId: job?.data?.sourceId, err: err.message }, 'Ingestion job failed');
      if (job?.data?.sourceId && job?.data?.jobId) {
        await ingestionJobService.recordStageEvent(
          job.data.jobId,
          job.data.sourceId,
          'failed',
          0,
          err.message,
          'WORKER_FAILURE'
        );
      }
    });

    return worker;
  } catch {
    logger.warn('Redis not connected; BullMQ worker skipped');
    return null;
  }
}
