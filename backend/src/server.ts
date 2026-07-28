import app from './app';
import { config } from './config/env.config';
import { initializeQdrantCollection } from './config/qdrant.config';
import { startIngestionWorker } from './queue/ingestion.queue';
import { logger } from './lib/logger';

async function bootstrap() {
  const role = config.processRole;

  if (role === 'worker') {
    logger.fatal('Use worker.ts entry point for worker-only mode');
    process.exit(1);
  }

  await initializeQdrantCollection();

  if (role === 'all') {
    startIngestionWorker();
    logger.info('Ingestion worker started in-process (set PROCESS_ROLE=api for API-only mode)');
  }

  app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        role,
        health: `http://localhost:${config.port}/health`,
        ready: `http://localhost:${config.port}/ready`,
        metrics: `http://localhost:${config.port}/metrics`,
      },
      'ChaiBook LLM API server started'
    );
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start API server');
  process.exit(1);
});
