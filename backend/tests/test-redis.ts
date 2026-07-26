import dotenv from 'dotenv';
import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';

dotenv.config();

export async function testRedis(): Promise<boolean> {
  console.log('\n========================================');
  console.log('⚡ 5. Testing Redis & BullMQ Task Queue...');
  console.log('========================================');

  const rawRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const isUpstash = rawRedisUrl.includes('upstash.io');
  const redisUrl = isUpstash && rawRedisUrl.startsWith('redis://')
    ? rawRedisUrl.replace('redis://', 'rediss://')
    : rawRedisUrl;

  console.log(`🔹 Connecting to Redis at: ${redisUrl}...`);

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 8000,
    lazyConnect: true,
    tls: isUpstash || redisUrl.startsWith('rediss://') ? {} : undefined,
  });

  try {
    // 1. Test Key-Value Operations
    await redis.connect();
    const pingRes = await redis.ping();
    console.log(`✅ Redis Connection Established! PING Response: "${pingRes}"`);

    const testKey = `chaibook:test:${Date.now()}`;
    await redis.set(testKey, 'BullMQ Redis Test Value', 'EX', 60);
    const value = await redis.get(testKey);
    console.log(`✅ Redis Read/Write Verified! Key value: "${value}"`);
    await redis.del(testKey);

    // 2. Test BullMQ Queue & Worker Processing
    console.log('🔹 Testing BullMQ background job queue...');
    const queueName = `test-queue-${Date.now()}`;

    const connectionOpts = {
      host: redis.options.host,
      port: redis.options.port,
      password: redis.options.password,
      username: redis.options.username,
      tls: isUpstash || redisUrl.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: null,
    };

    const testQueue = new Queue(queueName, { connection: connectionOpts });

    let jobProcessed = false;
    const testWorker = new Worker(
      queueName,
      async (job) => {
        console.log(`✅ BullMQ Worker picked up Job ID: ${job.id} with payload: "${job.data.task}"`);
        jobProcessed = true;
      },
      { connection: connectionOpts }
    );

    const job = await testQueue.add('test-job', { task: 'Ingest PDF document chunk' });
    console.log(`✅ BullMQ Job added with ID: ${job.id}`);

    // Wait up to 3 seconds for worker to process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    await testWorker.close();
    await testQueue.close();
    await redis.quit();

    if (jobProcessed) {
      console.log('🎉 Redis & BullMQ Test Passed Successfully!\n');
      return true;
    } else {
      console.warn('⚠️ BullMQ job was added but worker did not process within timeout.\n');
      return false;
    }
  } catch (error) {
    console.error(`❌ Redis / BullMQ Test Failed: ${(error as Error).message}\n`);
    try {
      await redis.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

if (require.main === module) {
  testRedis();
}
