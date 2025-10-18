import { createLogger } from '../../lib/logger';
import emailProvider from '../../lib/external-apis/email-provider';

const logger = createLogger('email-service');

export class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    logger.info('Sending email', { to, subject });

    await emailProvider.send({
      to,
      from: 'noreply@example.com',
      subject,
      body,
    });

    logger.info('Email sent', { to });
  }
}

