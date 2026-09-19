import {
  GatewayApiClient,
  type FungibleResourcesCollectionItemVaultAggregated,
  type StateEntityDetailsVaultResponseItem
} from '@radixdlt/babylon-gateway-api-sdk';
import { keyBy } from 'lodash-es';

export type ResourceAddress = string;

export type AccountAddress = string;

export type ComponentAddress = string;

export const RadixEntityFactory = ({
  gateway
}: {
  gateway: Pick<GatewayApiClient, 'state' | 'stream'>;
}) => {
  const accountFrom = async (
    addressOrEntityDetails: AccountAddress | StateEntityDetailsVaultResponseItem
  ): Promise<RadixAccount> => {
    const acc = RadixAccount();
    if (typeof addressOrEntityDetails === 'string') {
      const response = await gateway.state
        .getEntityDetailsVaultAggregated([addressOrEntityDetails])
        .then(([account]) => account);
      acc.setEntityDetails(response);
      return acc;
    }

    acc.setEntityDetails(addressOrEntityDetails);

    return acc;
  };

  return {
    accountFrom
  };
};

export const RadixAccount = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let details: StateEntityDetailsVaultResponseItem | null = null;
  let fungibleResources: Record<string, FungibleResourcesCollectionItemVaultAggregated> | null =
    null;

  const setEntityDetails = (_: StateEntityDetailsVaultResponseItem) => {
    details = _;
    fungibleResources = keyBy(_.fungible_resources.items, 'resource_address');
  };

  const hasFungible = (resourceAddress: ResourceAddress) => {
    return hasFungibleAmount(resourceAddress, 0);
  };

  const hasFungibleAmount = (resourceAddress: ResourceAddress, amount: string | number) => {
    return fungibleResources?.[resourceAddress]?.vaults.items.some(
      (vault) => Number(vault.amount) > Number(amount)
    );
  };

  const getFungibleAmount = (resourceAddress: ResourceAddress) => {
    return fungibleResources?.[resourceAddress]?.vaults.items.reduce(
      (acc, vault) => acc + Number(vault.amount),
      0
    );
  };

  return {
    hasFungible,
    getFungibleAmount,
    hasFungibleAmount,
    setEntityDetails
  };
};

export type RadixAccount = ReturnType<typeof RadixAccount>;

export const FungibleResource = () => {};

export const NonFungibleResource = () => {};
