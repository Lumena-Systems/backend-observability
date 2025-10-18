import { createLogger } from '../logger';
import metrics from '../metrics';

const logger = createLogger('email-provider');

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
}

export class EmailProviderClient {
  async send(message: EmailMessage): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Sending email via provider', {
        to: message.to,
        subject: message.subject,
      });

      // Simulate SMTP/API call to email provider
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

      const duration = Date.now() - startTime;

      logger.info('Email sent', {
        to: message.to,
        duration,
      });

      metrics.counter('emails_sent_via_provider');
      metrics.histogram('email_provider_duration_ms', duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Failed to send email', {
        to: message.to,
        error: error.message,
        duration,
      });

      metrics.counter('emails_provider_error');
      throw error;
    }
  }
}

const emailProvider = new EmailProviderClient();

export default emailProvider;

