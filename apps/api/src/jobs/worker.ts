import { Worker, Job, ConnectionOptions } from 'bullmq';
import { getRedisConnection } from '../lib/redis';
import { PLATFORM_SYNC_QUEUE, PlatformSyncJobData } from '../lib/queue';
import { processPlatformSync } from './platform-sync.job';
import { logger } from '../utils/logger';

let platformSyncWorker: Worker | null = null;

/**
 * Start the platform sync worker
 */
export function startWorker(): void {
  if (platformSyncWorker) {
    logger.warn('Worker already running');
    return;
  }

  platformSyncWorker = new Worker<PlatformSyncJobData>(
    PLATFORM_SYNC_QUEUE,
    async (job: Job<PlatformSyncJobData>) => {
      logger.info('Processing platform sync job', {
        jobId: job.id,
        platformAccountId: job.data.platformAccountId,
        attempt: job.attemptsMade + 1,
      });

      try {
        await processPlatformSync(job.data);

        logger.info('Platform sync job completed', {
          jobId: job.id,
          platformAccountId: job.data.platformAccountId,
        });
      } catch (error) {
        logger.error('Platform sync job failed', {
          jobId: job.id,
          platformAccountId: job.data.platformAccountId,
          error: error instanceof Error ? error.message : String(error),
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
        });

        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: getRedisConnection() as unknown as ConnectionOptions,
      concurrency: 2, // Process 2 jobs at a time
      limiter: {
        max: 10, // Max 10 jobs per minute
        duration: 60000,
      },
    }
  );

  platformSyncWorker.on('completed', (job) => {
    logger.debug('Job completed', { jobId: job.id });
  });

  platformSyncWorker.on('failed', (job, error) => {
    logger.error('Job failed permanently', {
      jobId: job?.id,
      error: error.message,
    });
  });

  platformSyncWorker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  logger.info('Platform sync worker started');
}

/**
 * Stop the worker gracefully
 */
export async function stopWorker(): Promise<void> {
  if (platformSyncWorker) {
    await platformSyncWorker.close();
    platformSyncWorker = null;
    logger.info('Platform sync worker stopped');
  }
}

/**
 * Check if worker is running
 */
export function isWorkerRunning(): boolean {
  return platformSyncWorker !== null && !platformSyncWorker.closing;
}
