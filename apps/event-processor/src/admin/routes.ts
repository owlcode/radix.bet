import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { prisma, Prisma } from '@radix-bet/database';
import { getAllQueuesStats, retryJob, cleanQueue } from '@radix-bet/queue';
import { logger } from '../utils/logger.js';
import type { QueueName } from '@radix-bet/types';
import { oracleRouter } from './oracle-routes.js';
import { hookahRouter } from './hookah-routes.js';
import { teamImageRouter } from './team-image-routes.js';

const router: RouterType = Router();

// Mount sub-routers
router.use('/oracle', oracleRouter);
router.use('/hookah', hookahRouter);
router.use('/team-images', teamImageRouter);

// GET /api/admin/queues - Get all queue stats
router.get('/queues', async (_req: Request, res: Response) => {
  try {
    const stats = await getAllQueuesStats();
    return res.status(200).json(stats);
  } catch (error) {
    logger.error('Error getting queue stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

// POST /api/admin/queues/:name/retry/:jobId - Retry a failed job
router.post('/queues/:name/retry/:jobId', async (req: Request, res: Response) => {
  const { name, jobId } = req.params;

  try {
    await retryJob(name as QueueName, jobId);
    return res.status(200).json({ success: true, message: `Job ${jobId} queued for retry` });
  } catch (error) {
    logger.error('Error retrying job', {
      queueName: name,
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to retry job' });
  }
});

// POST /api/admin/queues/:name/clean - Clean old jobs
router.post('/queues/:name/clean', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { grace = 86400000, status = 'completed' } = req.body;

  try {
    await cleanQueue(name as QueueName, grace, status);
    return res.status(200).json({ success: true, message: `Queue ${name} cleaned` });
  } catch (error) {
    logger.error('Error cleaning queue', {
      queueName: name,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to clean queue' });
  }
});

// GET /api/admin/events - Get recent event logs
router.get('/events', async (req: Request, res: Response) => {
  const { page = '1', pageSize = '50', status, eventType } = req.query;

  try {
    const where: Prisma.EventLogWhereInput = {};
    if (status && typeof status === 'string') where.status = status as Prisma.EnumEventStatusFilter;
    if (eventType && typeof eventType === 'string') where.eventType = eventType;

    const [events, total] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        orderBy: { processedAt: 'desc' },
        take: parseInt(pageSize as string),
        skip: (parseInt(page as string) - 1) * parseInt(pageSize as string)
      }),
      prisma.eventLog.count({ where })
    ]);

    return res.status(200).json({
      events: events.map((e) => ({
        ...e,
        stateVersion: e.stateVersion ? Number(e.stateVersion) : null
      })),
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });
  } catch (error) {
    logger.error('Error getting event logs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to get event logs' });
  }
});

// GET /api/admin/config - Get configuration
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const configs = await prisma.config.findMany();
    return res.status(200).json({ configs });
  } catch (error) {
    logger.error('Error getting config', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to get config' });
  }
});

// PUT /api/admin/config/:key - Update configuration
router.put('/config/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (typeof value !== 'string') {
    return res.status(400).json({ error: 'Value must be a string' });
  }

  try {
    const config = await prisma.config.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });

    return res.status(200).json({ success: true, config });
  } catch (error) {
    logger.error('Error updating config', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to update config' });
  }
});

// GET /api/admin/bets/:componentAddress - Check if a bet exists
router.get('/bets/:componentAddress', async (req: Request, res: Response) => {
  const { componentAddress } = req.params;

  try {
    const bet = await prisma.bet.findUnique({
      where: { componentAddress },
      include: { options: true }
    });

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    return res.status(200).json({
      componentAddress: bet.componentAddress,
      name: bet.name,
      status: bet.status,
      optionCount: bet.options.length
    });
  } catch (error) {
    logger.error('Error looking up bet', {
      componentAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to look up bet' });
  }
});

// PATCH /api/admin/bets/:componentAddress - Update bet metadata (categoryId, description)
router.patch('/bets/:componentAddress', async (req: Request, res: Response) => {
  const { componentAddress } = req.params;
  const { categoryId, description } = req.body;

  if (!categoryId && !description) {
    return res.status(400).json({ error: 'Provide categoryId or description to update' });
  }

  try {
    const bet = await prisma.bet.findUnique({ where: { componentAddress } });
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    const data: Record<string, string> = {};
    if (categoryId) data.categoryId = categoryId;
    if (description) data.description = description;

    const updated = await prisma.bet.update({
      where: { componentAddress },
      data
    });

    return res.status(200).json({
      success: true,
      componentAddress: updated.componentAddress,
      categoryId: updated.categoryId,
      description: updated.description
    });
  } catch (error) {
    logger.error('Error updating bet', {
      componentAddress,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ error: 'Failed to update bet' });
  }
});

export { router as adminRouter };
