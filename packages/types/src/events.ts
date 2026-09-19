// Radix network event types matching Scrypto events

export interface BetOptionCreated {
  name: string;
  address: string; // ResourceAddress
  iconUrl: string;
}

export interface BetCreatedEvent {
  type: 'BetCreatedEvent';
  name: string;
  address: string; // ComponentAddress
  options: BetOptionCreated[];
  deadline: number; // Unix timestamp in seconds (from on-chain Instant)
  currency: string; // ResourceAddress
  transactionId: string;
  stateVersion: number;
}

export interface BetVoteEvent {
  type: 'BetVoteEvent';
  address: string; // ComponentAddress
  option: string; // ResourceAddress
  amount: string; // Decimal as string
  transactionId: string;
  stateVersion: number;
}

export interface BetMarkWinnerEvent {
  type: 'BetMarkWinnerEvent';
  address: string; // ComponentAddress
  option: string; // ResourceAddress (winning option)
  transactionId: string;
  stateVersion: number;
}

export interface BetPrizeClaimedEvent {
  type: 'BetPrizeClaimedEvent';
  address: string; // ComponentAddress
  amount: string; // Decimal as string
  transactionId: string;
  stateVersion: number;
}

export interface BetAllPrizesClaimedEvent {
  type: 'BetAllPrizesClaimedEvent';
  address: string; // ComponentAddress
  transactionId: string;
  stateVersion: number;
}

export interface BetWinnerVoteEvent {
  type: 'BetWinnerVoteEvent';
  address: string; // ComponentAddress
  option: string; // ResourceAddress
  voter: string; // Verifier NFT local ID
  transactionId: string;
  stateVersion: number;
}

export type RadixBetEvent =
  | BetCreatedEvent
  | BetVoteEvent
  | BetMarkWinnerEvent
  | BetPrizeClaimedEvent
  | BetAllPrizesClaimedEvent
  | BetWinnerVoteEvent;

export type EventType = RadixBetEvent['type'];

// Webhook payload wrapper
export interface WebhookPayload {
  events: RadixBetEvent[];
  timestamp: string;
  signature?: string;
}
