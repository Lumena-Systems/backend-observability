import { ScheduledJob, JobExecutionContext, JobResult } from '../../types/job';
import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';
import db from '../../lib/database';
import config from '../../lib/config';
import { JobExecutor } from './job-executor';

const logger = createLogger('job-queue');

export class JobQueue {
  private executor: JobExecutor;
  private isProcessing: boolean = false;
  private pollIntervalId?: NodeJS.Timeout;

  constructor() {
    this.executor = new JobExecutor();
  }

  /**
   * Start polling for ready jobs
   */
  start(): void {
    if (this.isProcessing) {
      logger.warn('Job queue already running');
      return;
    }

    logger.info('Starting job queue processor', {
      pollInterval: config.jobs.pollInterval,
      concurrency: config.jobs.concurrency,
    });

    this.isProcessing = true;
    this.pollIntervalId = setInterval(
      () => this.processReadyJobs(),
      config.jobs.pollInterval
    );

    // Process immediately on start
    this.processReadyJobs();
  }

  /**
   * Stop polling for jobs
   */
  stop(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = undefined;
    }
    this.isProcessing = false;
    logger.info('Job queue processor stopped');
  }

  /**
   * Process ready jobs from the queue
   */
  private async processReadyJobs(): Promise<void> {
    try {
      const now = new Date();

      const readyJobs = await db.scheduledJob.findMany({
        where: {
          nextRunAt: { lte: now },
          status: 'scheduled',
        },
      });

      if (readyJobs.length === 0) {
        return; // No jobs ready
      }

      logger.info('Processing ready jobs', {
        count: readyJobs.length,
        timestamp: now.toISOString(),
      });

      metrics.gauge('job_queue_depth', readyJobs.length);
      metrics.counter('jobs_dequeued', readyJobs.length);

      await Promise.all(
        readyJobs.map(job => this.executeJob(job))
      );

      logger.info('Batch processing completed', {
        count: readyJobs.length,
      });

    } catch (error: any) {
      logger.error('Error processing ready jobs', {
        error: error.message,
        stack: error.stack,
      });
      metrics.counter('job_queue_processing_error');
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status to running
      await db.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: 'running',
          lastRunAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info('Starting job execution', {
        jobId: job.id,
        jobType: job.jobType,
        customerId: job.customerId,
        attempt: job.retryCount + 1,
      });

      metrics.counter('jobs_started', 1, {
        jobType: job.jobType,
      });

      const context: JobExecutionContext = {
        jobId: job.id,
        customerId: job.customerId,
        startTime: new Date(),
        timeout: 30000,
        metadata: {},
      };

      const result: JobResult = await this.executor.execute(job, context);

      const duration = Date.now() - startTime;

      if (result.success) {
        // Mark job as completed
        await db.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            updatedAt: new Date(),
          },
        });

        logger.info('Job completed successfully', {
          jobId: job.id,
          jobType: job.jobType,
          duration,
        });

        metrics.counter('jobs_completed', 1, {
          jobType: job.jobType,
        });
        metrics.histogram('job_duration_ms', duration, {
          jobType: job.jobType,
        });

      } else {
        // Job failed, will be rescheduled by scheduler
        await db.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            lastError: result.error,
            updatedAt: new Date(),
          },
        });

        logger.error('Job failed', {
          jobId: job.id,
          jobType: job.jobType,
          error: result.error,
          duration,
        });

        metrics.counter('jobs_failed', 1, {
          jobType: job.jobType,
        });
      }

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Job execution error', {
        jobId: job.id,
        jobType: job.jobType,
        error: error.message,
        duration,
      });

      // Update job status
      await db.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          lastError: error.message,
          updatedAt: new Date(),
        },
      });

      metrics.counter('jobs_error', 1, {
        jobType: job.jobType,
      });
    }
  }

  /**
   * Get current queue statistics
   */
  async getStats(): Promise<{
    scheduled: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    const [scheduled, running, completed, failed] = await Promise.all([
      db.scheduledJob.findMany({ where: { status: 'scheduled' } }),
      db.scheduledJob.findMany({ where: { status: 'running' } }),
      db.scheduledJob.findMany({ where: { status: 'completed' } }),
      db.scheduledJob.findMany({ where: { status: 'failed' } }),
    ]);

    return {
      scheduled: scheduled.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}

