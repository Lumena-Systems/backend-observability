import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import cache from '../../../lib/cache';

const router = Router();
const logger = createLogger('workflow-status-route');

// GET /api/workflows/:id/status - Get workflow status
router.get('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const cacheKey = `workflow:status:${id}`;
    let status = await cache.get(cacheKey);

    if (!status) {
      // Simulate fetching from database
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

      status = {
        workflowId: id,
        status: 'active',
        lastExecuted: new Date(),
        executionCount: Math.floor(Math.random() * 100),
      };

      await cache.set(cacheKey, status, 300);
    }

    logger.debug('Workflow status retrieved', {
      workflowId: id,
      customerId: req.customerId,
    });

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow status', { workflowId: id, error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'Failed to retrieve workflow status',
        statusCode: 500,
      },
    });
  }
});

export default router;

