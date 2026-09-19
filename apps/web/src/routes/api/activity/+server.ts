import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const componentAddress = url.searchParams.get('bet') || undefined;

  const where: Record<string, unknown> = {
    status: 'PROCESSED'
  };

  if (componentAddress) {
    where.componentAddress = componentAddress;
  }

  const events = await prisma.eventLog.findMany({
    where,
    include: {
      bet: {
        select: {
          name: true,
          componentAddress: true,
          options: {
            select: {
              name: true,
              resourceAddress: true
            }
          }
        }
      }
    },
    orderBy: { processedAt: 'desc' },
    take: limit
  });

  const activity = events.map((event) => {
    const payload = event.payload as Record<string, unknown>;
    const optionsByResource = new Map(
      (event.bet?.options || []).map((o) => [o.resourceAddress, o.name])
    );
    return {
      id: event.id,
      type: event.eventType,
      betName: event.bet?.name || 'Unknown Market',
      componentAddress: event.componentAddress,
      transactionId: event.transactionId,
      timestamp: event.processedAt,
      details: formatEventDetails(event.eventType, payload, optionsByResource)
    };
  });

  return json({ activity });
};

function formatEventDetails(
  eventType: string,
  payload: Record<string, unknown>,
  optionsByResource: Map<string, string>
): string {
  switch (eventType) {
    case 'BetCreatedEvent':
      return 'New market created';
    case 'BetVoteEvent': {
      const optionName = resolveOptionName(payload, optionsByResource);
      const amount = extractAmount(payload);
      return `Voted ${amount} XRD on "${optionName}"`;
    }
    case 'BetMarkWinnerEvent': {
      const winnerName = resolveOptionName(payload, optionsByResource);
      return `Winner declared: "${winnerName}"`;
    }
    case 'BetPrizeClaimedEvent': {
      const amount = extractAmount(payload);
      return amount ? `Claimed ${amount} XRD prize` : 'Claimed prize';
    }
    case 'BetWinnerVoteEvent': {
      const optionName = resolveOptionName(payload, optionsByResource);
      return `Verifier voted for "${optionName}"`;
    }
    default:
      return eventType
        .replace(/Event$/, '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
  }
}

/** Resolve option resource address from payload to human-readable name */
function resolveOptionName(
  payload: Record<string, unknown>,
  optionsByResource: Map<string, string>
): string {
  const event = (payload as Record<string, unknown>).event as Record<string, unknown> | undefined;
  const optionResource = (event?.optionResourceAddress ||
    event?.option ||
    payload.option ||
    '') as string;
  return (
    optionsByResource.get(optionResource) || optionResource.slice(0, 12) + '...' || 'an option'
  );
}

/** Extract amount from nested payload */
function extractAmount(payload: Record<string, unknown>): string {
  const event = (payload as Record<string, unknown>).event as Record<string, unknown> | undefined;
  const raw = (event?.amount || payload.amount || '') as string;
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
