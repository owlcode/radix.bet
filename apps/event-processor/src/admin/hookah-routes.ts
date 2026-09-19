import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '@radix-bet/database';
import { isHookahConfigured } from '../hookah/client.js';
import { getHookahClient, getFreshHookahClient } from '../hookah/triggers.js';
import { logger } from '../utils/logger.js';

const router: RouterType = Router();

// GET /api/admin/hookah/triggers — list all triggers from Hookah API
router.get('/triggers', async (_req, res) => {
  try {
    if (!isHookahConfigured()) {
      return res.status(503).json({ error: 'Hookah not configured' });
    }

    const client = await getHookahClient();
    const triggers = await client.trigger.getByUserId.query();
    res.json(triggers);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DELETE /api/admin/hookah/triggers — delete all triggers
router.delete('/triggers', async (_req, res) => {
  try {
    if (!isHookahConfigured()) {
      return res.status(503).json({ error: 'Hookah not configured' });
    }

    const client = await getHookahClient();
    const triggers = await client.trigger.getByUserId.query();

    let deleted = 0;
    const errors: Array<{ id: string; error: string }> = [];
    for (const trigger of triggers) {
      try {
        // Re-auth before each mutation — Hookah server invalidates sessions
        const freshClient = await getFreshHookahClient();
        await freshClient.trigger.remove.mutate({ id: trigger.id });
        await prisma.hookahTrigger.deleteMany({ where: { id: trigger.id } }).catch(() => {});
        deleted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error(`Failed to delete trigger ${trigger.id}: ${msg}`);
        errors.push({ id: trigger.id, error: msg });
      }
    }

    res.json({ deleted, total: triggers.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// DELETE /api/admin/hookah/triggers/:id — delete single trigger
router.delete('/triggers/:id', async (req, res) => {
  try {
    if (!isHookahConfigured()) {
      return res.status(503).json({ error: 'Hookah not configured' });
    }

    // Fresh auth for mutation — Hookah server requires it
    const client = await getFreshHookahClient();
    await client.trigger.remove.mutate({ id: req.params.id });
    await prisma.hookahTrigger.deleteMany({ where: { id: req.params.id } }).catch(() => {});

    res.json({ deleted: true });
  } catch (error) {
    logger.error(`Failed to delete trigger ${req.params.id}: ${String(error)}`);
    res.status(500).json({ error: String(error) });
  }
});

export { router as hookahRouter };
