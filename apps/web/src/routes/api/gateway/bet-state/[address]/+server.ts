import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { gatewayFn } from '$lib/gateway';
import { isValidRadixAddress } from '$lib/manifests/validation';

export type BetState = {
  winningOption: string;
  winnerRatio: string;
  isVotingEnabled: boolean;
  deadline: string;
  currency: string;
  ownerBadge: string;
  currentPrize: number;
  requiredVerifications: number;
  verifierBadge: string;
  optionsState: {
    name: string;
    totalSupply: string;
    resourceAddress: string;
    iconUrl: string;
  }[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SborField = { kind: string; value?: any; field_name?: string; elements?: any[] };

/**
 * Look up an SBOR field by name (if available) with positional fallback.
 *
 * The preview v1 API returns positional fields WITHOUT field_name attributes.
 * We try name-based lookup first (works with v2 / future APIs), then fall back
 * to the known struct position from scrypto/src/lib.rs.
 */
function field(fields: SborField[], name: string, index: number): SborField {
  return fields.find((f) => f.field_name === name) ?? fields[index];
}

/**
 * BetState struct layout (scrypto/src/lib.rs):
 *   0: winner        String
 *   1: winner_ratio   Decimal
 *   2: is_active      Bool
 *   3: currency       ResourceAddress
 *   4: owner_badge    ResourceAddress
 *   5: options        Array<BetOptionState>
 *   6: deadline       Instant (I64)
 *   7: required_verifications  U8
 *   8: verifier_badge ResourceAddress
 *
 * BetOptionState:
 *   0: name           String
 *   1: total_supply   Decimal
 *   2: icon_url       String (UncheckedUrl)
 *   3: address        ResourceAddress
 */

export const GET = async ({ params, fetch }: RequestEvent) => {
  const betComponentAddress = params.address;

  if (!isValidRadixAddress(betComponentAddress)) {
    throw error(
      400,
      `Invalid component address: "${betComponentAddress}". Cannot query on-chain state for non-on-chain bets.`
    );
  }

  const gateway = gatewayFn({ fetchFn: fetch });

  let status: BetState;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await gateway.previewOutput<any>(
      `
			CALL_METHOD
				Address("${betComponentAddress}")
				"get_state";`
    );

    const fields: SborField[] = data?.fields;
    if (!fields || !Array.isArray(fields) || fields.length < 9) {
      throw new Error(`Unexpected state structure: ${JSON.stringify(data).substring(0, 200)}`);
    }

    // Parse options array
    const optionElements = field(fields, 'options', 5)?.elements ?? [];
    let currentPrize = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionsState = optionElements.map((element: any) => {
      const f: SborField[] = element.fields;
      const name = String(field(f, 'name', 0)?.value ?? '');
      const totalSupply = String(field(f, 'total_supply', 1)?.value ?? '0');
      const iconUrl = String(field(f, 'icon_url', 2)?.value ?? '');
      const resourceAddress = String(field(f, 'address', 3)?.value ?? '');
      currentPrize += Number(totalSupply);
      return { name, totalSupply, resourceAddress, iconUrl };
    });

    status = {
      winningOption: String(field(fields, 'winner', 0)?.value ?? ''),
      winnerRatio: String(field(fields, 'winner_ratio', 1)?.value ?? ''),
      isVotingEnabled: field(fields, 'is_active', 2)?.value === true,
      currency: String(field(fields, 'currency', 3)?.value ?? ''),
      ownerBadge: String(field(fields, 'owner_badge', 4)?.value ?? ''),
      deadline: String(field(fields, 'deadline', 6)?.value ?? ''),
      currentPrize,
      requiredVerifications: Number(field(fields, 'required_verifications', 7)?.value ?? 1),
      verifierBadge: String(field(fields, 'verifier_badge', 8)?.value ?? ''),
      optionsState
    };
  } catch (e) {
    throw error(
      502,
      `Failed to fetch on-chain state: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return json(status);
};
