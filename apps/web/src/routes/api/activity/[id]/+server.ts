import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { resolveCurrencyInfo } from '$lib/model/bet';
import { config } from '$lib/config';

export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  const event = await prisma.eventLog.findUnique({
    where: { id },
    include: {
      bet: {
        select: {
          name: true,
          componentAddress: true,
          description: true,
          currency: true,
          options: {
            select: {
              name: true,
              resourceAddress: true
            }
          }
        }
      }
    }
  });

  if (!event) {
    throw error(404, 'Activity not found');
  }

  const payload = event.payload as Record<string, unknown>;
  const optionsByResource = new Map(
    (event.bet?.options || []).map((o) => [o.resourceAddress, o.name])
  );

  const currencyInfo = resolveCurrencyInfo(event.bet?.currency, config.resources.xrd);
  const currencySymbol = currencyInfo?.symbol ?? 'XRD';

  return json({
    id: event.id,
    type: event.eventType,
    betName: event.bet?.name || 'Unknown Market',
    betDescription: event.bet?.description || null,
    componentAddress: event.componentAddress,
    transactionId: event.transactionId,
    stateVersion: event.stateVersion ? Number(event.stateVersion) : null,
    timestamp: event.processedAt,
    status: event.status,
    payload,
    currencySymbol,
    details: formatEventDetails(event.eventType, payload, optionsByResource, currencySymbol),
    parsedDetails: parseEventDetails(event.eventType, payload, optionsByResource)
  });
};

function formatEventDetails(
  eventType: string,
  payload: Record<string, unknown>,
  optionsByResource: Map<string, string>,
  currencySymbol: string
): string {
  switch (eventType) {
    case 'BetCreatedEvent':
      return 'New market created';
    case 'BetVoteEvent': {
      const optionName = resolveOptionName(payload, optionsByResource);
      const amount = extractAmount(payload);
      return `Voted ${amount} ${currencySymbol} on "${optionName}"`;
    }
    case 'BetMarkWinnerEvent': {
      const winnerName = resolveOptionName(payload, optionsByResource);
      return `Winner declared: "${winnerName}"`;
    }
    case 'BetPrizeClaimedEvent': {
      const amount = extractAmount(payload);
      return amount ? `Claimed ${amount} ${currencySymbol} prize` : 'Claimed prize';
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

interface ParsedEventDetails {
  optionName?: string;
  amount?: string;
  voter?: string;
}

function parseEventDetails(
  eventType: string,
  payload: Record<string, unknown>,
  optionsByResource: Map<string, string>
): ParsedEventDetails {
  const result: ParsedEventDetails = {};
  const event = (payload.event as Record<string, unknown> | undefined) ?? payload;

  switch (eventType) {
    case 'BetVoteEvent': {
      result.optionName = resolveOptionName(payload, optionsByResource);
      result.amount = extractAmount(payload);
      const voter = (event.voter || payload.voter || '') as string;
      if (voter) result.voter = voter;
      break;
    }
    case 'BetMarkWinnerEvent':
      result.optionName = resolveOptionName(payload, optionsByResource);
      break;
    case 'BetPrizeClaimedEvent':
      result.amount = extractAmount(payload);
      break;
    case 'BetWinnerVoteEvent': {
      result.optionName = resolveOptionName(payload, optionsByResource);
      const voter = (event.voter || payload.voter || '') as string;
      if (voter) result.voter = voter;
      break;
    }
  }

  return result;
}

function resolveOptionName(
  payload: Record<string, unknown>,
  optionsByResource: Map<string, string>
): string {
  const event = payload.event as Record<string, unknown> | undefined;
  const optionResource = (
    event?.optionResourceAddress ||
    event?.option ||
    payload.option ||
    ''
  ) as string;
  return optionsByResource.get(optionResource) || optionResource.slice(0, 12) + '...' || 'an option';
}

function extractAmount(payload: Record<string, unknown>): string {
  const event = payload.event as Record<string, unknown> | undefined;
  const raw = (
    event?.amount ||
    payload.amount ||
    ''
  ) as string;
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
