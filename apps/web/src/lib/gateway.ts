import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk';
import type { BetDefinition } from './model/bet';
import { networkId } from './config';
import type { TransactionReceipt } from '@radixdlt/babylon-core-api-sdk';
import { RadixEntityFactory } from './model/radix';

export type Gateway = ReturnType<typeof Gateway>;
export const Gateway = ({ gatewaySdk }: { gatewaySdk: GatewayApiClient }) => {
  const preview = (manifest: string) => {
    return gatewaySdk.status.getCurrent().then((status) => {
      const currentEpoch = status.ledger_state.epoch;
      return gatewaySdk.transaction.innerClient.transactionPreview({
        transactionPreviewRequest: {
          manifest,
          start_epoch_inclusive: currentEpoch,
          end_epoch_exclusive: currentEpoch + 1,
          tip_percentage: 0,
          nonce: Math.round(Math.random() * 10e8),
          signer_public_keys: [],
          flags: {
            use_free_credit: true,
            assume_all_signature_proofs: true,
            skip_epoch_check: true
          }
        }
      });
    });
  };
  return {
    ...gatewaySdk,
    preview,
    previewOutput: <T>(manifest: string) =>
      preview(manifest)
        .then((response) => response.receipt as TransactionReceipt)
        .then((receipt) => (receipt.output ? receipt.output[0].programmatic_json : null) as T),
    getResourceHolders: (resourceAddress: string): Promise<string[]> =>
      gatewaySdk.extensions.resourceHoldersPage({
        resourceHoldersRequest: { resource_address: resourceAddress }
      }).then((r) => r.items.map((item) => item.holder_address)),
    getBetStats: (bet: BetDefinition) => {
      const options = Object.keys(bet.options).filter((option) => option.startsWith('resource_'));

      if (options.length === 0) {
        return Promise.resolve({
          totalVotes: 0,
          options: []
        });
      }
      return gatewaySdk.state.getEntityDetailsVaultAggregated(options).then((response) => {
        let totalVotes = 0;
        const options = [];
        for (const token of response) {
          const details = token.details;
          if (details && details.type === 'FungibleResource') {
            totalVotes += Number(details.total_supply || 0);
            options.push({
              address: token.address,
              votes: Number(details.total_supply || 0)
            });
          }
        }

        return {
          totalVotes,
          options
        };
      });
    }
  };
};

export const gatewayFn = ({ fetchFn }: { fetchFn: typeof fetch }) =>
  Gateway({
    gatewaySdk: GatewayApiClient.initialize({
      applicationName: 'radix.bet',
      applicationVersion: '1.0.0',
      fetchApi: fetchFn,
      networkId: networkId
    })
  });

export const gateway = gatewayFn({ fetchFn: fetch });

export const EntityFactory = RadixEntityFactory({ gateway });
