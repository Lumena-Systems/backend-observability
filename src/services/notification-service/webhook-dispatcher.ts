import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('webhook-dispatcher');

export interface WebhookPayload {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  body: Record<string, any>;
  timeout?: number;
}

export class WebhookDispatcher {
  private readonly defaultTimeout: number = 10000;

  async dispatch(payload: WebhookPayload): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Dispatching webhook', {
        url: payload.url,
        method: payload.method,
      });

      // Simulate HTTP request
      await new Promise(resolve => 
        setTimeout(resolve, 100 + Math.random() * 300)
      );

      const duration = Date.now() - startTime;

      logger.info('Webhook dispatched successfully', {
        url: payload.url,
        duration,
      });

      metrics.counter('webhooks_dispatched');
      metrics.histogram('webhook_dispatch_duration_ms', duration);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Webhook dispatch failed', {
        url: payload.url,
        error: error.message,
        duration,
      });

      metrics.counter('webhooks_failed');
      throw error;
    }
  }
}

