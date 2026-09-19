/**
 * Radix address validation for manifest builders.
 *
 * Valid Radix addresses use Bech32m encoding with specific HRP prefixes.
 * The HRP always ends with `_1` as a separator before the encoded data portion.
 * Example: component_tdx_2_1cpae5ydf6cvw464l9cvhze0h9llllnsvpmaw86ezcqs6s5putfmwzl
 *
 * Auto-generated database-only identifiers like `component_tdx_2_auto_espn_baseball_401833067`
 * are NOT valid on-chain addresses and must be rejected before manifest construction.
 */

const VALID_ADDRESS_PREFIXES = [
  'account_tdx_',
  'component_tdx_',
  'resource_tdx_',
  'package_tdx_',
  'consensusmanager_tdx_',
  'validator_tdx_',
  'accesscontroller_tdx_',
  'pool_tdx_',
  'identity_tdx_',
  'locker_tdx_'
] as const;

/**
 * Bech32m character set (excludes 1, b, i, o to avoid ambiguity).
 * After the `_1` separator, only these characters are valid.
 */
const BECH32M_CHARS = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;

/**
 * Checks if a string is a valid Bech32m-encoded Radix address.
 * This is a structural check — it doesn't verify the address exists on-ledger.
 */
export function isValidRadixAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  // Must start with a known prefix
  const hasValidPrefix = VALID_ADDRESS_PREFIXES.some((p) => address.startsWith(p));
  if (!hasValidPrefix) return false;

  // Find the last `_1` separator — Bech32m convention
  // HRP format: {entity_type}_tdx_{network_id}_1{encoded_data}
  const separatorIndex = address.lastIndexOf('_1');
  if (separatorIndex === -1) return false;

  const encodedData = address.slice(separatorIndex + 2);

  // Encoded portion must be non-empty and use only Bech32m characters
  if (encodedData.length < 6) return false;
  if (!BECH32M_CHARS.test(encodedData)) return false;

  // Reasonable total length (real addresses are ~60-70 chars)
  if (address.length < 30) return false;

  return true;
}

/**
 * Throws if the address is not a valid Radix address.
 * Use in manifest builders to fail fast with a clear error message.
 */
export function assertValidRadixAddress(address: string, label: string): void {
  if (!isValidRadixAddress(address)) {
    throw new Error(
      `Invalid Radix address for ${label}: "${address}". ` +
        `This may be a database-only identifier (e.g., auto-generated sports bet) ` +
        `that does not exist on-chain.`
    );
  }
}
