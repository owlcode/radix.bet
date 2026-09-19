import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { validateWebhookSignature } from './validator.js';
import { routeEvent } from '../events/router.js';
import { logger } from '../utils/logger.js';
import { mapHookahEvent } from '@radix-bet/radix';
import type { RadixBetEvent, WebhookPayload } from '@radix-bet/types';

const router: RouterType = Router();

// Hookah webhook payload schema (actual format from Hookah service)
const hookahPayloadSchema = z.object({
  triggerId: z.string(),
  transactionId: z.string(),
  events: z.array(
    z.object({
      eventName: z.string(),
      emitter: z.record(z.unknown()).optional(),
      data: z.object({
        fields: z.array(
          z.object({
            value: z.unknown().optional(),
            kind: z.string(),
            field_name: z.string().optional(),
            type_name: z.string().optional(),
            elements: z.array(z.unknown()).optional(),
            element_kind: z.string().optional()
          })
        ),
        kind: z.string().optional(),
        type_name: z.string().optional()
      })
    })
  ),
  userId: z.string().optional()
});

// Legacy batch webhook payload schema
const webhookPayloadSchema = z.object({
  events: z.array(
    z.object({
      type: z.enum([
        'BetCreatedEvent',
        'BetVoteEvent',
        'BetMarkWinnerEvent',
        'BetPrizeClaimedEvent',
        'BetWinnerVoteEvent'
      ]),
      name: z.string().optional(),
      address: z.string(),
      option: z.string().optional(),
      amount: z.string().optional(),
      voter: z.string().optional(),
      claimer: z.string().optional(),
      transactionId: z.string(),
      stateVersion: z.number()
    })
  ),
  timestamp: z.string(),
  signature: z.string().optional()
});

const validateSignature = (req: Request, rawBody: string) => {
  const signature = req.headers['x-webhook-signature'] as string | undefined;

  if (!validateWebhookSignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature', { ip: req.ip });
    throw new Error('401 Invalid Signature');
  }
};

// POST /api/webhook/events - Receive events from external sources
router.post('/events', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const rawBody = JSON.stringify(req.body);
    validateSignature(req, rawBody);

    let events: RadixBetEvent[] = [];

    // Try Hookah format first (triggerId + events with SBOR fields)
    const hookahResult = hookahPayloadSchema.safeParse(req.body);
    if (hookahResult.success) {
      const { transactionId, events: hookahEvents } = hookahResult.data;

      for (const he of hookahEvents) {
        const mapped = mapHookahEvent(
          he.eventName,
          he.data.fields as Array<{ value: unknown; field_name?: string }>,
          transactionId
        );
        if (mapped) {
          events.push(mapped);
          logger.info('Received Hookah event', he);
        } else {
          logger.warn('Unknown Hookah event type', { eventName: he.eventName });
        }
      }
    } else {
      // Fall back to legacy batch format
      const batchResult = webhookPayloadSchema.safeParse(req.body);

      if (!batchResult.success) {
        logger.warn('Invalid webhook payload', {
          errors: batchResult.error.format(),
          body: JSON.stringify(req.body).slice(0, 500)
        });
        return res.status(400).json({
          error: 'Invalid payload',
          details: batchResult.error.format()
        });
      }

      const payload = batchResult.data as WebhookPayload;
      events = payload.events as RadixBetEvent[];

      logger.info('Received batch webhook', {
        eventCount: payload.events.length,
        timestamp: payload.timestamp
      });
    }

    // Route each event to appropriate queue
    const results = await Promise.allSettled(events.map((event) => routeEvent(event)));

    const processed = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    const duration = Date.now() - startTime;

    logger.info('Webhook processed', {
      processed,
      failed,
      duration: `${duration}ms`
    });

    return res.status(200).json({
      success: true,
      processed,
      failed,
      duration
    });
  } catch (error) {
    logger.error('Webhook processing error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /api/webhook/health - Health check for webhook endpoint
router.get('/health', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export { router as webhookRouter };
