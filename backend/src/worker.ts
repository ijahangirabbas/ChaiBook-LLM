import { config } from './config/env.config';
import { initializeQdrantCollection } from './config/qdrant.config';
import { startIngestionWorker } from './queue/ingestion.queue';
import { logger } from './lib/logger';
import { register } from './lib/metrics';

// Expose worker process metrics on a lightweight HTTP server
const metricsPort = config.port + 1;

async function bootstrap() {
  if (config.processRole === 'api') {
    logger.fatal('PROCESS_ROLE=api cannot start worker entry point');
    process.exit(1);
  }

  await initializeQdrantCollection();

  const worker = startIngestionWorker();
  if (!worker) {
    logger.fatal('Failed to start BullMQ ingestion worker — is Redis available?');
    process.exit(1);
  }

  const server = await import('http').then(({ createServer }) =>
    createServer(async (req, res) => {
      if (req.url === '/live') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ alive: true, role: 'worker', uptimeSeconds: Math.floor(process.uptime()) }));
        return;
      }
      if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': register.contentType });
        res.end(await register.metrics());
        return;
      }
      res.writeHead(404);
      res.end();
    })
  );

  server.listen(metricsPort, () => {
    logger.info(
      { metricsPort, queue: 'chaibook-source-ingestion' },
      'ChaiBook LLM ingestion worker started'
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Worker shutting down');
    await worker.close();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start ingestion worker');
  process.exit(1);
});
