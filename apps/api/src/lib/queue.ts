import { Queue, QueueEvents } from 'bullmq';
import { getRedisConnection } from './redis';
import { logger } from '../utils/logger';

// Queue names
export const PLATFORM_SYNC_QUEUE = 'platform-sync';

// Queue instances (lazy initialized)
let platformSyncQueue: Queue | null = null;
let platformSyncQueueEvents: QueueEvents | null = null;

export interface PlatformSyncJobData {
  platformAccountId: string;
  userId: string;
  isInitialSync: boolean;
}

export function getPlatformSyncQueue(): Queue<PlatformSyncJobData> {
  if (!platformSyncQueue) {
    platformSyncQueue = new Queue<PlatformSyncJobData>(PLATFORM_SYNC_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute initial delay
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs
        },
      },
    });

    logger.info('Platform sync queue initialized');
  }

  return platformSyncQueue;
}

export function getPlatformSyncQueueEvents(): QueueEvents {
  if (!platformSyncQueueEvents) {
    platformSyncQueueEvents = new QueueEvents(PLATFORM_SYNC_QUEUE, {
      connection: getRedisConnection(),
    });
  }

  return platformSyncQueueEvents;
}

/**
 * Add a platform sync job to the queue
 */
export async function enqueuePlatformSync(
  data: PlatformSyncJobData,
  options?: { delay?: number; priority?: number }
): Promise<string> {
  const queue = getPlatformSyncQueue();

  // Use platformAccountId as job ID to prevent duplicate jobs
  const jobId = `sync-${data.platformAccountId}`;

  const job = await queue.add('sync', data, {
    jobId,
    delay: options?.delay,
    priority: options?.priority,
  });

  logger.info('Platform sync job enqueued', {
    jobId: job.id,
    platformAccountId: data.platformAccountId,
    isInitialSync: data.isInitialSync,
  });

  return job.id!;
}

/**
 * Get queue health status
 */
export async function getQueueHealth(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const queue = getPlatformSyncQueue();

  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

/**
 * Close all queue connections
 */
export async function closeQueues(): Promise<void> {
  if (platformSyncQueueEvents) {
    await platformSyncQueueEvents.close();
    platformSyncQueueEvents = null;
  }

  if (platformSyncQueue) {
    await platformSyncQueue.close();
    platformSyncQueue = null;
  }

  logger.info('Queues closed');
}
