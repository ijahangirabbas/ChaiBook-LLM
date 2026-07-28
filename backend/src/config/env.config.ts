import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().optional().default(''),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENAI_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  OPENAI_BASE_URL: z.string().optional().default(''),
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION_NAME: z.string().default('chaibook_sources'),
  EMBEDDING_MODEL: z.string().default('jina-embeddings-v5-text-small'),
  CHAT_MODEL: z.string().default('gpt-4o'),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  TEST_JWT_SECRET: z.string().optional().default(''),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET_NAME: z.string().default('chaibook-sources'),
  WORKSPACE_DAILY_TOKEN_BUDGET: z.string().default('200000').transform((val) => parseInt(val, 10)),
  WORKSPACE_INGESTION_CONCURRENCY: z.string().default('2').transform((val) => parseInt(val, 10)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PROCESS_ROLE: z.enum(['api', 'worker', 'all']).default('all'),
  METRICS_TOKEN: z.string().optional().default(''),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variable configuration:', parsedEnv.error.format());
  throw new Error('Fatal: Invalid environment configuration');
}

const env = parsedEnv.data;

function buildCorsOrigins(corsOrigins: string, frontendUrl: string): string[] {
  const origins = corsOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const normalizedFrontend = frontendUrl.trim().replace(/\/+$/, '');
  if (normalizedFrontend && !origins.includes(normalizedFrontend)) {
    origins.push(normalizedFrontend);
  }

  return origins;
}

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  openaiApiKey: env.OPENAI_API_KEY || env.GROQ_API_KEY || '',
  groqApiKey: env.GROQ_API_KEY || undefined,
  openaiBaseUrl: env.OPENAI_BASE_URL || (env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined),
  qdrantUrl: env.QDRANT_URL,
  qdrantApiKey: env.QDRANT_API_KEY || undefined,
  qdrantCollectionName: env.QDRANT_COLLECTION_NAME,
  embeddingModel: env.EMBEDDING_MODEL,
  chatModel: env.CHAT_MODEL,
  clerkSecretKey: env.CLERK_SECRET_KEY,
  clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
  testJwtSecret: env.TEST_JWT_SECRET,
  corsOrigins: buildCorsOrigins(env.CORS_ORIGINS, env.FRONTEND_URL),
  awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  awsRegion: env.AWS_REGION,
  awsS3BucketName: env.AWS_S3_BUCKET_NAME,
  workspaceDailyTokenBudget: env.WORKSPACE_DAILY_TOKEN_BUDGET,
  workspaceIngestionConcurrency: env.WORKSPACE_INGESTION_CONCURRENCY,
  logLevel: env.LOG_LEVEL,
  processRole: env.PROCESS_ROLE,
  metricsToken: env.METRICS_TOKEN || undefined,
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

  const servesHttpApi = config.processRole === 'api' || config.processRole === 'all';
  if (servesHttpApi) {
    if (config.corsOrigins.length === 0 || config.corsOrigins.includes('*')) {
      missing.push('CORS_ORIGINS (explicit production domain(s), no wildcard)');
    }
    const onlyLocalhostOrigins = config.corsOrigins.every(
      (origin) =>
        origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
    );
    if (onlyLocalhostOrigins) {
      missing.push(
        'CORS_ORIGINS or FRONTEND_URL (set e.g. CORS_ORIGINS=https://your-frontend.com,http://localhost:5173)'
      );
    }
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
