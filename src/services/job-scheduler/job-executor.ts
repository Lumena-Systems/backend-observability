import { ScheduledJob, JobExecutionContext, JobResult, JobHandler } from '../../types/job';
import { createLogger } from '../../lib/logger';
import { DataSyncJob } from './job-types/data-sync';
import { EmailSenderJob } from './job-types/email-sender';
import { ReportGeneratorJob } from './job-types/report-generator';
import { CleanupJob } from './job-types/cleanup';

const logger = createLogger('job-executor');

export class JobExecutor {
  private handlers: Map<string, JobHandler>;

  constructor() {
    this.handlers = new Map();
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('data-sync', new DataSyncJob());
    this.handlers.set('email-sender', new EmailSenderJob());
    this.handlers.set('report-generator', new ReportGeneratorJob());
    this.handlers.set('cleanup', new CleanupJob());
  }

  async execute(job: ScheduledJob, context: JobExecutionContext): Promise<JobResult> {
    const startTime = Date.now();

    try {
      const handler = this.handlers.get(job.jobType);

      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.jobType}`);
      }

      // Validate job payload
      if (!handler.validate(job.payload)) {
        throw new Error(`Invalid payload for job type: ${job.jobType}`);
      }

      logger.debug('Executing job', {
        jobId: job.id,
        jobType: job.jobType,
        customerId: job.customerId,
      });

      // Execute with timeout
      const result = await Promise.race([
        handler.execute(job, context),
        this.timeout(context.timeout),
      ]);

      const duration = Date.now() - startTime;

      return {
        success: result.success,
        duration,
        error: result.error,
        output: result.output,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Job execution failed', {
        jobId: job.id,
        jobType: job.jobType,
        error: error.message,
        duration,
      });

      return {
        success: false,
        duration,
        error: error.message,
      };
    }
  }

  private async timeout(ms: number): Promise<JobResult> {
    await new Promise(resolve => setTimeout(resolve, ms));
    throw new Error('Job execution timeout');
  }
}

