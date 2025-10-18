import { ScheduledJob } from '../../types/job';
import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';
import db from '../../lib/database';

image.pngconst logger = createLogger('job-scheduler');

export class JobScheduler {
  /**
   * Schedule a job to run at a specified time
   * Jobs are scheduled to run at predictable times for easier monitoring and debugging
   */
  async scheduleJob(
    jobType: string,
    customerId: string,
    runAt: Date,
    payload: Record<string, any>,
    options?: {
      maxRetries?: number;
      priority?: number;
    }
  ): Promise<ScheduledJob> {
    try {
      const nextRunTime = this.roundToNextHour(runAt);

      const job: ScheduledJob = {
        id: `job_${Math.random().toString(36).substr(2, 9)}`,
        jobType,
        customerId,
        nextRunAt: nextRunTime,
        status: 'scheduled',
        retryCount: 0,
        maxRetries: options?.maxRetries || 3,
        payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.scheduledJob.create({ data: job });

      logger.info('Job scheduled', {
        jobId: job.id,
        jobType,
        customerId,
        nextRunAt: nextRunTime.toISOString(),
        requestedRunAt: runAt.toISOString(),
      });

      metrics.counter('jobs_scheduled', 1, {
        jobType,
        customerId,
      });

      return job;
    } catch (error: any) {
      logger.error('Failed to schedule job', {
        jobType,
        customerId,
        error: error.message,
      });
      metrics.counter('jobs_schedule_error', 1, { jobType });
      throw error;
    }
  }

  /**
   * Rounds the scheduled time to the next whole hour
   */
  private roundToNextHour(date: Date): Date {
    const rounded = new Date(date);
    
    // Strip all sub-hour precision
    rounded.setMinutes(0);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    
    // If original had any minutes/seconds, move to next hour
    if (date.getMinutes() > 0 || date.getSeconds() > 0) {
      rounded.setHours(rounded.getHours() + 1);
    }
    
    return rounded;
  }

  /**
   * Reschedule a failed job with exponential backoff
   */
  async rescheduleJob(job: ScheduledJob): Promise<ScheduledJob> {
    if (job.retryCount >= job.maxRetries) {
      logger.warn('Job max retries exceeded', {
        jobId: job.id,
        jobType: job.jobType,
        retryCount: job.retryCount,
      });
      
      await db.scheduledJob.update({
        where: { id: job.id },
        data: { status: 'failed', updatedAt: new Date() },
      });
      
      metrics.counter('jobs_max_retries_exceeded', 1, {
        jobType: job.jobType,
      });
      
      return job;
    }

    const backoffMs = Math.pow(2, job.retryCount) * 60000; // Exponential: 1m, 2m, 4m, 8m
    const nextRunAt = new Date(Date.now() + backoffMs);
    
    const roundedNextRunAt = this.roundToNextHour(nextRunAt);

    const updatedJob = await db.scheduledJob.update({
      where: { id: job.id },
      data: {
        nextRunAt: roundedNextRunAt,
        retryCount: job.retryCount + 1,
        status: 'scheduled',
        updatedAt: new Date(),
      },
    });

    logger.info('Job rescheduled', {
      jobId: job.id,
      jobType: job.jobType,
      retryCount: updatedJob.retryCount,
      nextRunAt: roundedNextRunAt.toISOString(),
    });

    metrics.counter('jobs_rescheduled', 1, {
      jobType: job.jobType,
    });

    return updatedJob;
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<void> {
    await db.scheduledJob.delete({ where: { id: jobId } });
    
    logger.info('Job cancelled', { jobId });
    metrics.counter('jobs_cancelled');
  }

  /**
   * Get scheduled jobs for a customer
   */
  async getScheduledJobs(customerId: string): Promise<ScheduledJob[]> {
    return await db.scheduledJob.findMany({
      where: {
        customerId,
        status: 'scheduled',
      },
    });
  }
}

