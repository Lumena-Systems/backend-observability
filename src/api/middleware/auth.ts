import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/api';
import { createLogger } from '../../lib/logger';
import metrics from '../../lib/metrics';

const logger = createLogger('auth-middleware');

async function verifyToken(token: string): Promise<{ customerId: string; userId: string; permissions: string[] } | null> {
  if (!token || token === 'invalid') {
    return null;
  }

  await new Promise(resolve => setTimeout(resolve, 5));

  return {
    customerId: `cust_${Math.floor(Math.random() * 100 + 1).toString().padStart(3, '0')}`,
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    permissions: ['read', 'write', 'execute', 'import'],
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      metrics.counter('auth_failed', 1, { reason: 'missing_token' });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          statusCode: 401,
        },
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);

    if (!decoded) {
      metrics.counter('auth_failed', 1, { reason: 'invalid_token' });
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          statusCode: 401,
        },
      });
      return;
    }

    req.customerId = decoded.customerId;
    req.userId = decoded.userId;
    req.permissions = decoded.permissions;

    metrics.counter('auth_success');
    metrics.histogram('auth_duration_ms', Date.now() - startTime);

    next();
  } catch (error: any) {
    metrics.counter('auth_error');
    logger.error('Authentication error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
        statusCode: 500,
      },
    });
  }
}

