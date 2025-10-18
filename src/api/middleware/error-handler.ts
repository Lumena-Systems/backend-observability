import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('error-handler');

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = (err as AppError).statusCode || 500;
  const code = (err as AppError).code || 'INTERNAL_ERROR';
  const details = (err as AppError).details;

  logger.error('Request error', {
    method: req.method,
    url: req.url,
    statusCode,
    code,
    message: err.message,
    stack: err.stack,
    details,
  });

  metrics.counter('http_errors', 1, {
    statusCode: statusCode.toString(),
    code,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message,
      statusCode,
      details,
    },
  });
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      statusCode: 404,
    },
  });
}

