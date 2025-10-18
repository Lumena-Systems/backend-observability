import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('push-notifications');

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export class PushNotificationService {
  async send(notification: PushNotification): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Sending push notification', {
        userId: notification.userId,
        title: notification.title,
        priority: notification.priority || 'normal',
      });

      // Simulate sending to push notification service (FCM, APNS, etc.)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      const duration = Date.now() - startTime;

      logger.info('Push notification sent', {
        userId: notification.userId,
        duration,
      });

      metrics.counter('push_notifications_sent');
      metrics.histogram('push_notification_duration_ms', duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Push notification failed', {
        userId: notification.userId,
        error: error.message,
        duration,
      });

      metrics.counter('push_notifications_failed');
      throw error;
    }
  }

  async sendBatch(notifications: PushNotification[]): Promise<void> {
    logger.info('Sending push notification batch', {
      count: notifications.length,
    });

    await Promise.all(notifications.map(notif => this.send(notif)));

    logger.info('Push notification batch completed', {
      count: notifications.length,
    });
  }
}

