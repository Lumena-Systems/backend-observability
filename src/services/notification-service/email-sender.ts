import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('email-sender');

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export class EmailSender {
  private readonly defaultFrom: string = 'noreply@example.com';

  async send(options: EmailOptions): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Sending email', {
        to: options.to,
        subject: options.subject,
        from: options.from || this.defaultFrom,
        hasAttachments: !!(options.attachments && options.attachments.length > 0),
      });

      // Simulate SMTP connection and email sending
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

      const duration = Date.now() - startTime;

      logger.info('Email sent successfully', {
        to: options.to,
        duration,
      });

      metrics.counter('emails_sent');
      metrics.histogram('email_send_duration_ms', duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Email sending failed', {
        to: options.to,
        error: error.message,
        duration,
      });

      metrics.counter('emails_failed');
      throw error;
    }
  }

  async sendBulk(emails: EmailOptions[]): Promise<void> {
    logger.info('Sending bulk emails', { count: emails.length });

    await Promise.all(emails.map(email => this.send(email)));

    logger.info('Bulk email sending completed', { count: emails.length });
  }
}

