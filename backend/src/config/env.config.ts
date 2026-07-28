import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional().default(''),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENAI_API_KEY: z.string().optional().default(''),
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION_NAME: z.string().default('chaibook_sources'),
  EMBEDDING_MODEL: z.string().default('jina-embeddings-v5-text-small'),
  CHAT_MODEL: z.string().default('gpt-4o'),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  TEST_JWT_SECRET: z.string().optional().default(''),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET_NAME: z.string().default('chaibook-sources'),
  WORKSPACE_DAILY_TOKEN_BUDGET: z.string().default('200000').transform((val) => parseInt(val, 10)),
  WORKSPACE_INGESTION_CONCURRENCY: z.string().default('2').transform((val) => parseInt(val, 10)),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variable configuration:', parsedEnv.error.format());
  throw new Error('Fatal: Invalid environment configuration');
}

const env = parsedEnv.data;

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  openaiApiKey: env.OPENAI_API_KEY,
  qdrantUrl: env.QDRANT_URL,
  qdrantApiKey: env.QDRANT_API_KEY || undefined,
  qdrantCollectionName: env.QDRANT_COLLECTION_NAME,
  embeddingModel: env.EMBEDDING_MODEL,
  chatModel: env.CHAT_MODEL,
  clerkSecretKey: env.CLERK_SECRET_KEY,
  clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
  testJwtSecret: env.TEST_JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  awsRegion: env.AWS_REGION,
  awsS3BucketName: env.AWS_S3_BUCKET_NAME,
  workspaceDailyTokenBudget: env.WORKSPACE_DAILY_TOKEN_BUDGET,
  workspaceIngestionConcurrency: env.WORKSPACE_INGESTION_CONCURRENCY,
};

function assertProductionConfig(): void {
  if (config.nodeEnv !== 'production') return;

  const missing: string[] = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.openaiApiKey) missing.push('OPENAI_API_KEY');
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  if (!config.openaiApiKey && !jinaKey) {
    missing.push('OPENAI_API_KEY or JINA_API_KEY (for embeddings)');
  }
  if (!config.redisUrl) missing.push('REDIS_URL');
  if (!config.clerkSecretKey) missing.push('CLERK_SECRET_KEY');
  if (config.corsOrigins.length === 0 || config.corsOrigins.includes('*')) {
    missing.push('CORS_ORIGINS (explicit production domain(s), no wildcard)');
  }
  if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
    missing.push('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Fatal: Missing or invalid production environment variables: ${missing.join(', ')}`
    );
  }
}

assertProductionConfig();

function assertEmbeddingConfig(): void {
  const jinaKey = process.env.JINA_API_KEY || process.env.JENA_API_KEY;
  const hasEmbeddingKey =
    Boolean(jinaKey) || Boolean(config.openaiApiKey && !config.openaiApiKey.startsWith('mock-'));

  if (config.nodeEnv === 'production' && !hasEmbeddingKey) {
    throw new Error('Fatal: Production requires JINA_API_KEY or OPENAI_API_KEY for embeddings.');
  }
}

assertEmbeddingConfig();

if (!config.openaiApiKey && config.nodeEnv !== 'production') {
  console.warn('⚠️ WARNING: OPENAI_API_KEY environment variable is not set!');
}
