import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiV1Routes from './routes/v1';
import { errorHandler } from './middlewares/error.middleware';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { requestLoggingMiddleware } from './middlewares/request-logging.middleware';
import { metricsMiddleware } from './middlewares/metrics.middleware';
import { getReadinessReport, getLivenessReport } from './services/health.service';
import { getMetricsText } from './lib/metrics';
import { config } from './config/env.config';
import { logger } from './lib/logger';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(requestContextMiddleware);
app.use(metricsMiddleware);
app.use(requestLoggingMiddleware);

// Dynamic CORS Policy — explicit allowlist only (no wildcard domain suffixes in production)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isExplicitlyAllowed = config.corsOrigins.includes(origin);
      const isLocalDev =
        config.nodeEnv !== 'production' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));

      if (isExplicitlyAllowed || isLocalDev) {
        return callback(null, true);
      }

      logger.warn({ origin, allowedOrigins: config.corsOrigins }, 'CORS request blocked');
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-request-id', 'Idempotency-Key'],
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Root Welcome Route
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '🚀 ChaiBook LLM RAG Backend API is running!',
    endpoints: {
      health: '/health',
      v1: '/api/v1',
    },
  });
});

// Liveness — process is running (no dependency checks)
app.get('/live', async (_req, res) => {
  const report = await getLivenessReport();
  res.status(200).json({
    status: 'OK',
    service: 'ChaiBook LLM Backend',
    ...report,
  });
});

// Readiness — all critical dependencies must be healthy
app.get('/ready', async (req, res) => {
  const report = await getReadinessReport();
  res.status(report.ready ? 200 : 503).json({
    status: report.ready ? 'OK' : 'DEGRADED',
    service: 'ChaiBook LLM Backend',
    requestId: req.requestId,
    ...report,
  });
});

// Legacy health endpoint — alias to readiness for backward compatibility
app.get('/health', async (req, res) => {
  const report = await getReadinessReport();
  res.status(report.ready ? 200 : 503).json({
    status: report.ready ? 'OK' : 'DEGRADED',
    service: 'ChaiBook LLM Backend',
    requestId: req.requestId,
    checks: report.checks.reduce<Record<string, { ok: boolean; status: string }>>((acc, check) => {
      acc[check.name] = { ok: check.ok, status: check.status };
      return acc;
    }, {}),
  });
});

// Prometheus metrics (optional bearer token in production)
app.get('/metrics', async (req, res) => {
  if (config.metricsToken) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${config.metricsToken}`) {
      res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Invalid metrics token' });
      return;
    }
  }

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(await getMetricsText());
});

// API Routes
app.use('/api/v1', apiV1Routes);

// Global Error Handler
app.use(errorHandler);

export default app;
