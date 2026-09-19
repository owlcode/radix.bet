/**
 * SBOR event parser — maps raw Hookah webhook SBOR data to typed RadixBet events.
 * Extracts named fields from the Hookah SBOR fields array format.
 */

import type { RadixBetEvent, BetOptionCreated } from '@radix-bet/types';

/**
 * Extract a named field value from a Hookah SBOR fields array.
 * This is the low-level extractor for the Hookah webhook payload format.
 */
export function getField(
  fields: Array<{ value: unknown; field_name?: string }>,
  name: string
): string {
  const field = fields.find((f) => f.field_name === name);
  return field ? String(field.value ?? '') : '';
}

/**
 * Map a Hookah event (with SBOR fields array) to a typed RadixBetEvent.
 *
 * The Hookah webhook sends events in a specific format where struct fields
 * arrive as an array with `field_name` keys. Array fields (like `options`)
 * have `elements` as a sibling property of `kind`/`field_name`, not nested in `value`.
 */
export function mapHookahEvent(
  eventName: string,
  fields: Array<{ value: unknown; field_name?: string }>,
  transactionId: string
): RadixBetEvent | null {
  switch (eventName) {
    case 'BetCreatedEvent': {
      const optionsField = fields.find((f) => f.field_name === 'options');
      // SBOR arrays have `elements` as a sibling of `kind`/`field_name`, not nested in `value`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optionElements = (optionsField as any)?.elements ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: BetOptionCreated[] = optionElements.map((el: any) => ({
        name: getField(el.fields ?? [], 'name'),
        address: getField(el.fields ?? [], 'address'),
        iconUrl: getField(el.fields ?? [], 'icon_url')
      }));
      const deadlineRaw = getField(fields, 'deadline');
      const deadline = deadlineRaw ? parseInt(deadlineRaw, 10) : 0;
      const currency = getField(fields, 'currency');
      const address = getField(fields, 'address');
      if (!currency) {
        console.error(
          `[SBOR] BetCreatedEvent missing currency field for component ${address} (tx: ${transactionId}). ` +
            `Voting will fail until currency is backfilled.`
        );
      }
      return {
        type: 'BetCreatedEvent',
        name: getField(fields, 'name'),
        address,
        options,
        deadline,
        currency,
        transactionId,
        stateVersion: 0
      };
    }
    case 'BetVoteEvent':
      return {
        type: 'BetVoteEvent',
        address: getField(fields, 'address'),
        option: getField(fields, 'option'),
        amount: getField(fields, 'amount') || '0',
        transactionId,
        stateVersion: 0
      };
    case 'BetMarkWinnerEvent':
      return {
        type: 'BetMarkWinnerEvent',
        address: getField(fields, 'address'),
        option: getField(fields, 'option'),
        transactionId,
        stateVersion: 0
      };
    case 'BetPrizeClaimedEvent':
      return {
        type: 'BetPrizeClaimedEvent',
        address: getField(fields, 'address'),
        amount: getField(fields, 'amount') || '0',
        transactionId,
        stateVersion: 0
      };
    case 'BetAllPrizesClaimedEvent':
      return {
        type: 'BetAllPrizesClaimedEvent',
        address: getField(fields, 'address'),
        transactionId,
        stateVersion: 0
      };
    case 'BetWinnerVoteEvent':
      return {
        type: 'BetWinnerVoteEvent',
        address: getField(fields, 'address'),
        option: getField(fields, 'option'),
        voter: getField(fields, 'voter'),
        transactionId,
        stateVersion: 0
      };
    default:
      return null;
  }
}
