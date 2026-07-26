import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sourceService, ProcessSourceParams } from '../services/source.service';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) return null; // Stop retrying after 3 attempts if Redis is offline
    return Math.min(times * 500, 2000);
  },
});

export const INGESTION_QUEUE_NAME = 'chaibook-source-ingestion';

// BullMQ Ingestion Queue
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

// BullMQ Worker Process Handler
export function startIngestionWorker(): Worker<ProcessSourceParams> {
  const worker = new Worker<ProcessSourceParams>(
    INGESTION_QUEUE_NAME,
    async (job: Job<ProcessSourceParams>) => {
      console.log(`⚙️ BullMQ Processing Job ${job.id} for Source: ${job.data.sourceId}...`);
      await sourceService.processAndIndexSource(job.data);
      console.log(`✅ BullMQ Job ${job.id} completed successfully.`);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`💥 BullMQ Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
