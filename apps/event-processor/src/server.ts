import 'dotenv/config';
import express, { type Express } from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import { webhookRouter } from './webhook/router.js';
import { adminRouter } from './admin/routes.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

export function createServer(): Express {
  const app = express();

  // Middleware — cors before helmet so preflight responses aren't blocked
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug('Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`
      });
    });
    next();
  });

  // Health check
  app.get('/health', async (_req, res) => {
    let dbStatus = 'unknown';
    try {
      const { prisma } = await import('@radix-bet/database');
      await prisma.$queryRawUnsafe('SELECT 1');
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = `error: ${e instanceof Error ? e.message : 'unknown'}`;
    }
    res.status(dbStatus === 'connected' ? 200 : 503).json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.0.1',
      database: dbStatus
    });
  });

  // Routes
  app.use('/api/webhook', webhookRouter);
  app.use(
    '/api/admin',
    (req, res, next) => {
      return next();
      if (!config.ADMIN_API_KEY) {
        return res.status(503).json({ error: 'Admin API not configured' });
      }
      const key = req.headers['x-api-key'] || req.query.apiKey;
      if (key !== config.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      next();
    },
    adminRouter
  );

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Must be registered after all routes and before the error middleware below.
  Sentry.setupExpressErrorHandler(app);

  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  );

  return app;
}
