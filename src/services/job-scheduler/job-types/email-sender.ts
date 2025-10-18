import { ScheduledJob, JobExecutionContext, JobResult, JobHandler } from '../../../types/job';
import { createLogger } from '../../../lib/logger';

const logger = createLogger('email-sender-job');

export class EmailSenderJob implements JobHandler {
  validate(payload: Record<string, any>): boolean {
    return !!(payload.recipient && payload.subject && payload.body);
  }

  async execute(job: ScheduledJob, context: JobExecutionContext): Promise<JobResult> {
    const startTime = Date.now();

    try {
      const { recipient, subject, body, attachments = [] } = job.payload;

      logger.info('Sending email', {
        jobId: job.id,
        customerId: job.customerId,
        recipient,
        subject,
        attachmentCount: attachments.length,
      });

      // Simulate connecting to SMTP server
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

      const duration = Date.now() - startTime;

      logger.info('Email sent successfully', {
        jobId: job.id,
        customerId: job.customerId,
        recipient,
        duration,
      });

      return {
        success: true,
        duration,
        output: {
          messageId: `msg_${Math.random().toString(36).substr(2, 9)}`,
          recipient,
          sentAt: new Date().toISOString(),
        },
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Email sending failed', {
        jobId: job.id,
        customerId: job.customerId,
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
}

