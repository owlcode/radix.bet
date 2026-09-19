// Top tokens from CaviarNine - these are the most liquid tokens on Radix
// https://www.caviarnine.com/tokens

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  iconUrl: string;
  decimals: number;
}

// Stokenet addresses
export const STOKENET_TOKENS: Record<string, TokenInfo> = {
  XRD: {
    address: 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc',
    symbol: 'XRD',
    name: 'Radix',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-xrd-32x32.png',
    decimals: 18
  }
  // Add more stokenet test tokens as needed
};

// Mainnet addresses - Top 10 from CaviarNine
export const MAINNET_TOKENS: Record<string, TokenInfo> = {
  XRD: {
    address: 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd',
    symbol: 'XRD',
    name: 'Radix',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-xrd-32x32.png',
    decimals: 18
  },
  USDC: {
    address: 'resource_rdx1t4dy69k6s0gv040xa64cyadyefwtett62ng6xfdnljyydnml7t6g3j',
    symbol: 'USDC',
    name: 'USD Coin',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-usdc.png',
    decimals: 6
  },
  USDT: {
    address: 'resource_rdx1thrvr3xfs2tarm2dl9emvs26vjqxu6mqvfgvqjne940jv0lnrrg7rw',
    symbol: 'USDT',
    name: 'Tether USD',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-usdt.png',
    decimals: 6
  },
  ETH: {
    address: 'resource_rdx1th88qcj5syl9ghka2g9l7tw497vy5x6zaatyvgfkwcfe8n9jt2npww',
    symbol: 'xETH',
    name: 'Wrapped Ether',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-eth.png',
    decimals: 18
  },
  BTC: {
    address: 'resource_rdx1t580qxc7upat7lww4l2c4jckacafjeudxj5wpjrrct0p3e82sq4y75',
    symbol: 'xBTC',
    name: 'Wrapped Bitcoin',
    iconUrl: 'https://assets.radixdlt.com/icons/icon-btc.png',
    decimals: 8
  },
  HUG: {
    address: 'resource_rdx1t5kmyj54jt85malva7fxdrnpvgfgs623yt7x6z25m9q3jlmsqymg5h',
    symbol: 'HUG',
    name: 'HUG Token',
    iconUrl: 'https://assets.caviarnine.com/tokens/hug.png',
    decimals: 18
  },
  EARLY: {
    address: 'resource_rdx1tkafx76w6wfd8smhgldzc7hxq30v27s9nfcjxqkltf46v34xd5xzzl',
    symbol: 'EARLY',
    name: 'Early Token',
    iconUrl: 'https://assets.caviarnine.com/tokens/early.png',
    decimals: 18
  },
  CAVIAR: {
    address: 'resource_rdx1t4dekrf58h3mm7fgxqdd98nwtaag2vj06hqlpd6w9j3jazx4v7smf0',
    symbol: 'CAVIAR',
    name: 'Caviar',
    iconUrl: 'https://assets.caviarnine.com/tokens/caviar.png',
    decimals: 18
  },
  OCI: {
    address: 'resource_rdx1t5lsktkz2s8c9m9s9h8lpqtpnmkm7l3p5t5k6w69k9jlkj9xq75d4f',
    symbol: 'OCI',
    name: 'Ociswap',
    iconUrl: 'https://assets.caviarnine.com/tokens/oci.png',
    decimals: 18
  },
  ASTRL: {
    address: 'resource_rdx1thksg0t0e3cwd8hklvlmc50vx8wfn5y62kp6qz7d4z8c3hv4n5xy7p',
    symbol: 'ASTRL',
    name: 'Astrolescent',
    iconUrl: 'https://assets.caviarnine.com/tokens/astrl.png',
    decimals: 18
  }
};

export function getTokens(network: 'stokenet' | 'mainnet'): Record<string, TokenInfo> {
  return network === 'mainnet' ? MAINNET_TOKENS : STOKENET_TOKENS;
}

export function getTokenList(network: 'stokenet' | 'mainnet'): TokenInfo[] {
  return Object.values(getTokens(network));
}

export function getToken(symbol: string, network: 'stokenet' | 'mainnet'): TokenInfo | undefined {
  return getTokens(network)[symbol];
}

export function getXrdAddress(network: 'stokenet' | 'mainnet'): string {
  return getTokens(network).XRD.address;
}

export function isKnownToken(address: string, network: 'stokenet' | 'mainnet'): boolean {
  const tokens = getTokens(network);
  return Object.values(tokens).some((t) => t.address === address);
}

export function getTokenByAddress(address: string, network: 'stokenet' | 'mainnet'): TokenInfo | undefined {
  const tokens = getTokens(network);
  return Object.values(tokens).find((t) => t.address === address);
}
