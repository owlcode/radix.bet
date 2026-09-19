/**
 * Transaction building, signing, and submission utilities.
 * Uses TransactionBuilder from @radixdlt/radix-engine-toolkit directly
 * because radix-web3.js has a `this`-binding bug in its sign() flow
 * (forEach(builder.sign) loses context).
 */

import {
  type TransactionManifest,
  TransactionBuilder,
  RadixEngineToolkit,
  generateRandomNonce,
  Convert
} from '@radixdlt/radix-engine-toolkit';
import type { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import { createEd25519KeyPair, deriveAccountAddressFromPublicKey } from 'radix-web3.js';
import { getNetworkConfig } from '@radix-bet/config';
import { getGatewayClient, getNetworkClient } from './gateway.js';

export interface Account {
  privateKeyHex: string;
  publicKeyHex: string;
  address: string;
}

/**
 * Derive an Ed25519 account from a private key hex string.
 */
export async function deriveAccount(privateKeyHex: string): Promise<{
  account: Account;
  privateKey: ReturnType<typeof createEd25519KeyPair>;
}> {
  const config = getNetworkConfig();
  const keyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
  const keyPair = createEd25519KeyPair(keyBytes);
  const address = await deriveAccountAddressFromPublicKey(keyPair.publicKey(), config.networkId);

  return {
    account: {
      privateKeyHex,
      publicKeyHex: keyPair.publicKeyHex(),
      address
    },
    privateKey: keyPair
  };
}

/**
 * Create a new random Ed25519 account.
 */
export async function createRandomAccount(): Promise<{
  account: Account;
  privateKey: ReturnType<typeof createEd25519KeyPair>;
}> {
  const keyPair = createEd25519KeyPair();
  const config = getNetworkConfig();
  const address = await deriveAccountAddressFromPublicKey(keyPair.publicKey(), config.networkId);
  const privateKeyHex = Buffer.from(keyPair.bytes).toString('hex');

  return {
    account: {
      privateKeyHex,
      publicKeyHex: keyPair.publicKeyHex(),
      address
    },
    privateKey: keyPair
  };
}

export interface SubmitTransactionOptions {
  /** Gateway client to use. Defaults to the singleton. */
  gateway?: GatewayApiClient;
}

/**
 * Build a transaction header with current epoch from the gateway.
 */
async function buildTransactionHeader(
  gateway: GatewayApiClient,
  notaryPublicKey: ReturnType<ReturnType<typeof createEd25519KeyPair>['publicKey']>
) {
  const config = getNetworkConfig();
  const status = await gateway.status.getCurrent();
  const currentEpoch = status.ledger_state.epoch;

  return {
    networkId: config.networkId,
    startEpochInclusive: currentEpoch,
    endEpochExclusive: currentEpoch + 2,
    nonce: generateRandomNonce(),
    notaryPublicKey,
    notaryIsSignatory: true,
    tipPercentage: 0
  };
}

/**
 * Build, sign, notarize, submit, and poll a transaction manifest.
 * Uses TransactionBuilder directly to avoid radix-web3.js's this-binding bug.
 * Returns the intent hash (transaction ID).
 */
export async function submitTransaction(
  privateKeyHex: string,
  manifest: TransactionManifest,
  options?: SubmitTransactionOptions
): Promise<string> {
  const gateway = options?.gateway ?? getGatewayClient();
  const config = getNetworkConfig();
  const keyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
  const keyPair = createEd25519KeyPair(keyBytes);

  // Convert string instructions to parsed if needed
  const parsedManifest =
    manifest.instructions.kind === 'String'
      ? {
          instructions: await RadixEngineToolkit.Instructions.convert(
            manifest.instructions,
            config.networkId,
            'Parsed'
          ),
          blobs: manifest.blobs
        }
      : manifest;

  const header = await buildTransactionHeader(gateway, keyPair.publicKey());

  const message = { kind: 'None' as const };
  const intent = { header, manifest: parsedManifest, message };
  const intentHash = await RadixEngineToolkit.Intent.hash(intent);

  const builder = await TransactionBuilder.new();
  const readyBuilder = builder.header(header).message(message).manifest(parsedManifest);

  // Sign with the key (signer = signToSignatureWithPublicKey)
  readyBuilder.sign(keyPair.signToSignatureWithPublicKey(intentHash.hash));

  // Notarize (same key as notary)
  const notarizedTx = await readyBuilder.notarizeAsync(async (hash) =>
    keyPair.signToSignature(hash)
  );
  const compiled = await RadixEngineToolkit.NotarizedTransaction.compile(notarizedTx);
  const compiledHex = Convert.Uint8Array.toHexString(compiled);

  // Submit
  await gateway.transaction.innerClient.transactionSubmit({
    transactionSubmitRequest: { notarized_transaction_hex: compiledHex }
  });

  // Poll for committed status with robust handling of initial "not found" state
  const txId = intentHash.id;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const statusResponse = await gateway.transaction.getStatus(txId);
      const status = statusResponse.intent_status;
      if (status === 'CommittedSuccess') return txId;
      if (status === 'CommittedFailure' || status === 'PermanentlyRejected') {
        throw new Error(`Transaction ${status}: ${txId}`);
      }
      // Pending or Unknown — keep polling
    } catch (err) {
      // Gateway may throw if TX not indexed yet — keep polling
      if (
        err instanceof Error &&
        (err.message.includes('CommittedFailure') || err.message.includes('Rejected'))
      ) {
        throw err;
      }
    }
  }

  throw new Error(`Transaction polling timed out: ${txId}`);
}

export type TransactionStatus = 'CommittedSuccess' | 'CommittedFailure' | 'Rejected' | 'Pending';

export interface WaitForTransactionOptions {
  /** Gateway client to use. Defaults to the singleton. */
  gateway?: GatewayApiClient;
  /** Max number of polling attempts. Defaults to 60. */
  maxAttempts?: number;
  /** Interval between polls in ms. Defaults to 2000. */
  intervalMs?: number;
}

export interface TransactionResult {
  status: TransactionStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newEntities: Array<Record<string, any>>;
  errorMessage?: string;
}

/**
 * Poll the gateway until a transaction is committed or fails.
 * Uses radix-web3.js's networkClient.pollTransactionStatus() for polling,
 * then fetches committed details for new entity extraction.
 *
 * Note: submitTransaction already polls internally,
 * so this function is primarily for cases where you only have the txHash
 * (e.g., faucet transactions).
 */
export async function waitForTransaction(
  txHash: string,
  options?: WaitForTransactionOptions
): Promise<TransactionResult> {
  const gateway = options?.gateway ?? getGatewayClient();
  const maxRetries = options?.maxAttempts ?? 60;
  const baseDelay = options?.intervalMs ?? 2000;

  try {
    const networkClient = getNetworkClient();
    const result = await networkClient.pollTransactionStatus(txHash, {
      maxRetries,
      baseDelay,
      maxDelay: baseDelay,
      delayFn: () => baseDelay
    });

    if (result.status === 'CommittedSuccess') {
      const details = await gateway.transaction.getCommittedDetails(txHash);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receipt = details.transaction.receipt as Record<string, any>;
      return {
        status: 'CommittedSuccess',
        newEntities: receipt?.state_updates?.new_global_entities || []
      };
    }

    if (result.status === 'CommittedFailure') {
      return {
        status: 'CommittedFailure',
        newEntities: [],
        errorMessage: 'Transaction committed but failed'
      };
    }

    if (result.status === 'Rejected') {
      return {
        status: 'Rejected',
        newEntities: [],
        errorMessage: 'Transaction was rejected'
      };
    }

    return {
      status: 'Pending',
      newEntities: [],
      errorMessage: `Transaction ${txHash} did not confirm in time`
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Transaction failed')) {
      throw err;
    }
    return {
      status: 'Pending',
      newEntities: [],
      errorMessage: `Transaction ${txHash} did not confirm in time`
    };
  }
}

/**
 * Fund an account from the Stokenet faucet.
 * Uses TransactionBuilder directly with the well-known faucet component address.
 */
export async function fundFromFaucet(address: string, gateway?: GatewayApiClient): Promise<string> {
  const gw = gateway ?? getGatewayClient();
  const config = getNetworkConfig();
  const keyPair = createEd25519KeyPair(); // ephemeral key for faucet tx
  const privateKeyHex = Buffer.from(keyPair.bytes).toString('hex');

  const faucetManifest: TransactionManifest = {
    instructions: {
      kind: 'String',
      value: `
        CALL_METHOD
          Address("component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxyulkzl")
          "lock_fee"
          Decimal("10")
        ;
        CALL_METHOD
          Address("component_tdx_2_1cptxxxxxxxxxfaucetxxxxxxxxx000527798379xxxxxxxxxyulkzl")
          "free"
        ;
        CALL_METHOD
          Address("${address}")
          "try_deposit_batch_or_refund"
          Expression("ENTIRE_WORKTOP")
          None
        ;
      `
    },
    blobs: []
  };

  return submitTransaction(privateKeyHex, faucetManifest, { gateway: gw });
}
