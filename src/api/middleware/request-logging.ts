import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('http');

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.socket.remoteAddress,
  });

  const originalSend = res.send;
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      duration,
    });

    metrics.histogram('http_request_duration_ms', duration, {
      method: req.method,
      route: req.route?.path || req.url,
      statusCode: statusCode.toString(),
    });

    metrics.counter('http_requests_total', 1, {
      method: req.method,
      statusCode: statusCode.toString(),
    });

    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('X-Request-ID', requestId);

    return originalSend.call(this, data);
  };

  next();
}

