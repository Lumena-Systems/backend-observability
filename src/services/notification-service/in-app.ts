import { createLogger } from '../../lib/logger';

const logger = createLogger('in-app-notifications');

export class InAppNotificationService {
  async sendNotification(userId: string, title: string, message: string): Promise<void> {
    logger.info('Sending in-app notification', { userId, title });

    // Simulate notification delivery
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    logger.info('In-app notification sent', { userId });
  }
}

