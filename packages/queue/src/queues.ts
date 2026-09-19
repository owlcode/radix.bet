import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { getRedisConnection } from './client';
import { QUEUE_NAMES, type JobData, type QueueName } from '@radix-bet/types';

interface QueueLogger {
  info: (msg: string, meta?: object) => void;
  error: (msg: string, meta?: object) => void;
}

const connection = getRedisConnection();

// Queue instances
const queues: Map<QueueName, Queue> = new Map();

// Derive from the single source of truth in @radix-bet/types
const ALL_QUEUE_NAMES: QueueName[] = Object.values(QUEUE_NAMES);

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

// Create all queues
export function initializeQueues(): void {
  ALL_QUEUE_NAMES.forEach((name) => getQueue(name));
}

// Add job to queue
export async function addJob<T extends object>(
  queueName: QueueName,
  data: T,
  options?: {
    delay?: number;
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
  }
): Promise<Job<T>> {
  const queue = getQueue(queueName);
  const jobName = (data as any).type ?? queueName;
  const job = await queue.add(jobName, data, {
    delay: options?.delay,
    attempts: options?.attempts ?? 3,
    backoff: options?.backoff ?? { type: 'exponential', delay: 1000 },
    removeOnComplete: {
      age: 24 * 3600, // 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7 days
    }
  });
  return job as Job<T>;
}

// Create worker for a queue
export function createWorker<T extends object>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<void>,
  options?: {
    concurrency?: number;
    logger?: QueueLogger;
  }
): Worker<T> {
  const log: QueueLogger = options?.logger || { info: console.log, error: console.error };

  const worker = new Worker<T>(
    queueName,
    async (job) => {
      log.info(`Processing job ${job.id} of type ${job.name}`);
      try {
        await processor(job);
        log.info(`Job ${job.id} completed successfully`);
      } catch (error) {
        log.error(`Job ${job.id} failed:`, {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: options?.concurrency ?? 5
    }
  );

  worker.on('failed', (job, err) => {
    log.error(`Job ${job?.id} failed with error:`, { error: err.message });
  });

  worker.on('completed', (job) => {
    log.info(`Job ${job.id} completed`);
  });

  return worker;
}

// Get queue statistics
export async function getQueueStats(queueName: QueueName): Promise<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount()
  ]);

  return { name: queueName, waiting, active, completed, failed, delayed };
}

// Get all queues stats
export async function getAllQueuesStats(): Promise<{
  queues: Array<{
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>;
  timestamp: string;
}> {
  const stats = await Promise.all(ALL_QUEUE_NAMES.map(getQueueStats));
  return {
    queues: stats,
    timestamp: new Date().toISOString()
  };
}

// Retry failed job
export async function retryJob(queueName: QueueName, jobId: string): Promise<void> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.retry();
  } else {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }
}

// Clean old jobs
export async function cleanQueue(
  queueName: QueueName,
  grace: number = 24 * 3600 * 1000, // 24 hours
  status: 'completed' | 'failed' = 'completed'
): Promise<void> {
  const queue = getQueue(queueName);
  await queue.clean(grace, 1000, status);
}

// Close all queues
export async function closeAllQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();
}
