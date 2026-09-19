import type { RadixBetEvent } from './events';

// Job types for BullMQ queues

export interface BaseJobData {
  eventId: string;
  timestamp: string;
  retryCount?: number;
}

export interface BetCreatedJobData extends BaseJobData {
  type: 'bet-created';
  event: {
    name: string;
    componentAddress: string;
    options: Array<{ name: string; resourceAddress: string; iconUrl: string }>;
    deadline: number; // Unix seconds from on-chain Instant; 0 = unknown
    currency: string; // ResourceAddress
    transactionId: string;
    stateVersion: number;
  };
}

export interface BetVoteJobData extends BaseJobData {
  type: 'bet-vote';
  event: {
    componentAddress: string;
    optionResourceAddress: string;
    amount: string;
    transactionId: string;
    stateVersion: number;
  };
}

export interface BetWinnerJobData extends BaseJobData {
  type: 'bet-winner';
  event: {
    componentAddress: string;
    winningOptionResourceAddress: string;
    transactionId: string;
    stateVersion: number;
  };
}

export interface BetClaimJobData extends BaseJobData {
  type: 'bet-claim';
  event: {
    componentAddress: string;
    amount: string;
    transactionId: string;
    stateVersion: number;
  };
}

export interface BetAllClaimedJobData extends BaseJobData {
  type: 'bet-all-claimed';
  event: {
    componentAddress: string;
    transactionId: string;
    stateVersion: number;
  };
}

export interface BetWinnerVoteJobData extends BaseJobData {
  type: 'bet-winner-vote';
  event: {
    componentAddress: string;
    optionResourceAddress: string;
    voter: string;
    transactionId: string;
  };
}

export type JobData =
  | BetCreatedJobData
  | BetVoteJobData
  | BetWinnerJobData
  | BetClaimJobData
  | BetAllClaimedJobData
  | BetWinnerVoteJobData;

export type JobType = JobData['type'];

// Queue names
export const QUEUE_NAMES = {
  BET_CREATED: 'bet-created',
  BET_VOTE: 'bet-vote',
  BET_WINNER: 'bet-winner',
  BET_CLAIM: 'bet-claim',
  BET_ALL_CLAIMED: 'bet-all-claimed',
  BET_WINNER_VOTE: 'bet-winner-vote',
  ORACLE_FETCH: 'oracle-fetch',
  ORACLE_CREATE_BET: 'oracle-create-bet',
  ORACLE_RESOLVE_BET: 'oracle-resolve-bet',
  FAUCET_CLAIM: 'faucet-claim',
  RANDOM_BET: 'random-bet',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface OracleFetchJobData {
  oracleId: string;
}

export interface OracleCreateBetJobData {
  oracleId: string;
  oracleGameId: string;
}

export interface OracleResolveBetJobData {
  oracleId: string;
  oracleGameId: string;
  espnEventId: string;
}

export interface FaucetClaimJobData {
  type: 'faucet-claim';
}

export interface RandomBetJobData {
  type: 'random-bet';
}
