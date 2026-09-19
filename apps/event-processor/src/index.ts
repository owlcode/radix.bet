// Sentry must be initialised before any instrumented module is imported.
import './instrument.js';
import 'dotenv/config';
import { config } from './config/index.js';
import { createServer } from './server.js';
import { startJobProcessors, stopJobProcessors } from './jobs/processor.js';
import { startOracleEngine, stopOracleEngine } from './oracle/engine.js';
import { closeRedisConnection } from '@radix-bet/queue';
import { logger } from './utils/logger.js';
import { setupHookahWebhook } from './hookah/setup.js';

async function main() {
  logger.info('Starting event processor...', {
    environment: config.NODE_ENV,
    network: config.RADIX_NETWORK
  });

  startJobProcessors();

  try {
    await setupHookahWebhook();
  } catch (err) {
    logger.error('Hookah setup failed (non-fatal):', {
      error: err instanceof Error ? err.message : String(err)
    });
  }

  // Start oracle engine AFTER Hookah is ready
  await startOracleEngine();

  // Create and start HTTP server
  const app = createServer();
  const port = parseInt(config.PORT);

  const server = app.listen(port, () => {
    logger.info(`Event processor listening on port ${port}`);
    logger.info('Webhook API available at /api/webhook/events');
    logger.info('Admin API available at /api/admin/*');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      await stopOracleEngine();
      await stopJobProcessors();
      await closeRedisConnection();

      logger.info('Event processor shut down complete');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start event processor', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});
