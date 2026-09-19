// API request/response types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Config API
export interface ConfigEntry {
  key: string;
  value: string;
  updatedAt: string;
}

export interface ConfigUpdateRequest {
  key: string;
  value: string;
}

// Queue stats API
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface AllQueuesStats {
  queues: QueueStats[];
  timestamp: string;
}

// Job retry API
export interface JobRetryRequest {
  queueName: string;
  jobId: string;
}

// Event log API
export interface EventLogEntry {
  id: string;
  eventType: string;
  transactionId: string | null;
  stateVersion: number | null;
  componentAddress: string | null;
  payload: unknown;
  processedAt: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  errorMessage: string | null;
}

export interface EventLogListResponse {
  events: EventLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
