import { addJob } from '@radix-bet/queue';
import { prisma, Prisma } from '@radix-bet/database';
import { logger } from '../utils/logger.js';
import type {
  RadixBetEvent,
  BetCreatedJobData,
  BetVoteJobData,
  BetWinnerJobData,
  BetClaimJobData,
  BetAllClaimedJobData,
  BetWinnerVoteJobData
} from '@radix-bet/types';
import { getXrdAddress, getNetwork } from '@radix-bet/config';
import { randomUUID } from 'crypto';

export async function routeEvent(event: RadixBetEvent): Promise<void> {
  const eventId = randomUUID();
  const timestamp = new Date().toISOString();

  logger.debug('Routing event', { type: event.type, eventId });

  // Log event to database (skip componentAddress FK for BetCreatedEvent since
  // the Bet record doesn't exist yet — it gets created by the job handler,
  // which then links this EventLog to the Bet)
  await prisma.eventLog.create({
    data: {
      id: eventId,
      eventType: event.type,
      transactionId: event.transactionId,
      stateVersion: BigInt(event.stateVersion),
      componentAddress: event.type === 'BetCreatedEvent' ? null : event.address,
      payload: event as unknown as Prisma.InputJsonValue,
      status: 'PENDING'
    }
  });

  try {
    switch (event.type) {
      case 'BetCreatedEvent': {
        const currency = event.currency || getXrdAddress(getNetwork());
        if (!event.currency) {
          logger.warn('BetCreatedEvent has no currency — defaulting to XRD', {
            eventId,
            componentAddress: event.address,
            transactionId: event.transactionId,
            defaultCurrency: currency
          });
        }
        const jobData: BetCreatedJobData = {
          type: 'bet-created',
          eventId,
          timestamp,
          event: {
            name: event.name,
            componentAddress: event.address,
            options: (event.options || []).map((o) => ({
              name: o.name,
              resourceAddress: o.address,
              iconUrl: o.iconUrl
            })),
            deadline: event.deadline ?? 0,
            currency,
            transactionId: event.transactionId,
            stateVersion: event.stateVersion
          }
        };
        await addJob('bet-created', jobData);
        break;
      }

      case 'BetVoteEvent': {
        const jobData: BetVoteJobData = {
          type: 'bet-vote',
          eventId,
          timestamp,
          event: {
            componentAddress: event.address,
            optionResourceAddress: event.option,
            amount: event.amount,
            transactionId: event.transactionId,
            stateVersion: event.stateVersion
          }
        };
        await addJob('bet-vote', jobData);
        break;
      }

      case 'BetMarkWinnerEvent': {
        const jobData: BetWinnerJobData = {
          type: 'bet-winner',
          eventId,
          timestamp,
          event: {
            componentAddress: event.address,
            winningOptionResourceAddress: event.option,
            transactionId: event.transactionId,
            stateVersion: event.stateVersion
          }
        };
        await addJob('bet-winner', jobData);
        break;
      }

      case 'BetPrizeClaimedEvent': {
        const jobData: BetClaimJobData = {
          type: 'bet-claim',
          eventId,
          timestamp,
          event: {
            componentAddress: event.address,
            amount: event.amount || '0',
            transactionId: event.transactionId,
            stateVersion: event.stateVersion
          }
        };
        await addJob('bet-claim', jobData);
        break;
      }

      case 'BetAllPrizesClaimedEvent': {
        const jobData: BetAllClaimedJobData = {
          type: 'bet-all-claimed',
          eventId,
          timestamp,
          event: {
            componentAddress: event.address,
            transactionId: event.transactionId,
            stateVersion: event.stateVersion
          }
        };
        await addJob('bet-all-claimed', jobData);
        break;
      }

      case 'BetWinnerVoteEvent': {
        const jobData: BetWinnerVoteJobData = {
          type: 'bet-winner-vote',
          eventId,
          timestamp,
          event: {
            componentAddress: event.address,
            optionResourceAddress: event.option,
            voter: event.voter || '',
            transactionId: event.transactionId
          }
        };
        await addJob('bet-winner-vote', jobData);
        break;
      }

      default:
        logger.warn('Unknown event type', { event });
    }

    logger.info('Event routed to queue', { type: event.type, eventId });
  } catch (error) {
    // Update event log with error
    await prisma.eventLog.update({
      where: { id: eventId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}
