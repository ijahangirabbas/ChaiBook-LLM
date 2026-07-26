import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sourceService, ProcessSourceParams } from '../services/source.service';
import { ingestionJobService } from '../services/job.service';

const rawRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = rawRedisUrl.includes('upstash.io');
const redisUrl = isUpstash && rawRedisUrl.startsWith('redis://')
  ? rawRedisUrl.replace('redis://', 'rediss://')
  : rawRedisUrl;

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  tls: isUpstash || redisUrl.startsWith('rediss://') ? {} : undefined,
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

export async function checkRedisConnection(): Promise<{ connected: boolean; status: string; url: string; error?: string }> {
  try {
    if (redisConnection.status === 'wait' || redisConnection.status === 'close') {
      await redisConnection.connect();
    }
    const res = await redisConnection.ping();
    return {
      connected: res === 'PONG',
      status: redisConnection.status,
      url: redisUrl,
    };
  } catch (err: any) {
    return {
      connected: false,
      status: redisConnection.status || 'disconnected',
      url: redisUrl,
      error: err.message || 'Unable to connect to Redis server',
    };
  }
}

export async function enqueueIngestionJob(params: ProcessSourceParams): Promise<{ jobId: string }> {
  const jobId = await ingestionJobService.createJob(params.sourceId);

  try {
    const redisCheck = await checkRedisConnection();
    if (redisCheck.connected) {
      await ingestionQueue.add(`ingest-${params.sourceId}`, { ...params, jobId }, { jobId });
      return { jobId };
    }
  } catch {
    // Redis unavailable, fallback to async process execution
  }

  setImmediate(async () => {
    try {
      await processIngestionPipeline(params, jobId);
    } catch (err: any) {
      console.error(`Fallback ingestion failed for source ${params.sourceId}:`, err.message);
    }
  });

  return { jobId };
}

async function processIngestionPipeline(params: ProcessSourceParams, jobId: string) {
  const { sourceId } = params;
  try {
    await ingestionJobService.recordStageEvent(jobId, sourceId, 'validating', 20, 'Validating source format and content parameters...');
    await ingestionJobService.recordStageEvent(jobId, sourceId, 'extracting', 40, 'Extracting text content and document structure...');
    await ingestionJobService.recordStageEvent(jobId, sourceId, 'chunking', 60, 'Splitting content into semantic passage chunks...');
    await ingestionJobService.recordStageEvent(jobId, sourceId, 'embedding', 80, 'Generating vector embeddings and indexing in Qdrant...');

    await sourceService.processAndIndexSource(params);

    await ingestionJobService.recordStageEvent(jobId, sourceId, 'ready', 100, 'Source processing and vector indexing complete.');
  } catch (err: any) {
    await ingestionJobService.recordStageEvent(jobId, sourceId, 'failed', 0, err.message || 'Ingestion pipeline failed.', 'PROCESSING_ERROR', err.stack);
    throw err;
  }
}

export function startIngestionWorker(): Worker<ProcessSourceParams> | null {
  try {
    const worker = new Worker<ProcessSourceParams>(
      INGESTION_QUEUE_NAME,
      async (job: Job<ProcessSourceParams & { jobId?: string }>) => {
        console.log(`⚙️ BullMQ Processing Job ${job.id} for Source: ${job.data.sourceId}...`);
        const dbJobId = job.data.jobId || (await ingestionJobService.createJob(job.data.sourceId));
        await processIngestionPipeline(job.data, dbJobId);
        console.log(`✅ BullMQ Job ${job.id} completed successfully.`);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    worker.on('failed', async (job, err) => {
      console.error(`💥 BullMQ Job ${job?.id} failed with error:`, err.message);
      if (job?.data?.sourceId && job?.data?.jobId) {
        await ingestionJobService.recordStageEvent(job.data.jobId, job.data.sourceId, 'failed', 0, err.message, 'WORKER_FAILURE');
      }
    });

    return worker;
  } catch {
    console.warn('⚠️ Redis not connected; BullMQ worker skipped.');
    return null;
  }
}
