import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import db from '../../../lib/database';
import cache from '../../../lib/cache';

const router = Router();
const logger = createLogger('health-route');

const startTime = Date.now();

// GET /health - Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    cache: false,
    externalServices: true, // Assume healthy for now
  };

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    // Check database
    const dbStats = db.getPoolStats();
    checks.database = dbStats.active < dbStats.total;
    
    if (!checks.database) {
      logger.warn('Database health check failed', dbStats);
      overallStatus = 'degraded';
    }
  } catch (error: any) {
    logger.error('Database health check error', { error: error.message });
    checks.database = false;
    overallStatus = 'unhealthy';
  }

  try {
    // Check cache
    const cacheStats = cache.getStats();
    checks.cache = cacheStats.connected;
    
    if (!checks.cache) {
      logger.warn('Cache health check failed', cacheStats);
      overallStatus = 'degraded';
    }
  } catch (error: any) {
    logger.error('Cache health check error', { error: error.message });
    checks.cache = false;
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: '1.0.0',
    uptime: Date.now() - startTime,
    checks,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  res.status(statusCode).json(response);
});

export default router;

