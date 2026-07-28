import client from 'prom-client';
import { config } from '../config/env.config';

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: 'chaibook_',
});

export const httpRequestDuration = new client.Histogram({
  name: 'chaibook_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: 'chaibook_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

export const ingestionJobsTotal = new client.Counter({
  name: 'chaibook_ingestion_jobs_total',
  help: 'Ingestion jobs processed by outcome',
  labelNames: ['status'] as const,
  registers: [register],
});

export const ingestionQueueDepth = new client.Gauge({
  name: 'chaibook_ingestion_queue_depth',
  help: 'Number of jobs waiting in the ingestion queue',
  registers: [register],
});

export const llmTokensTotal = new client.Counter({
  name: 'chaibook_llm_tokens_total',
  help: 'Total LLM tokens consumed',
  labelNames: ['type'] as const,
  registers: [register],
});

export const embeddingDuration = new client.Histogram({
  name: 'chaibook_embedding_duration_seconds',
  help: 'Embedding batch duration in seconds',
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export function normalizeRoute(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:id')
    .split('?')[0];
}

export async function getMetricsText(): Promise<string> {
  if (config.processRole === 'worker') {
    return register.metrics();
  }
  return register.metrics();
}
