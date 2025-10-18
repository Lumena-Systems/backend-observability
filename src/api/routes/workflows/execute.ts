import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import { measure } from '../../../lib/metrics';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('workflow-execute-route');

// POST /api/workflows/:id/execute - Execute a workflow
router.post('/:id/execute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { context } = req.body;

    logger.info('Executing workflow', {
      workflowId: id,
      customerId: req.customerId,
    });

    const execution = await measure('workflow_execute', async () => {
      await db.workflow.findMany({
        where: { id, customerId: req.customerId }
      });

      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));

      await db.workflow.update({
        where: { id },
        data: { status: 'running' }
      });

      return {
        id: `exec_${Math.random().toString(36).substr(2, 9)}`,
        workflowId: id,
        customerId: req.customerId!,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        context,
      };
    }, { workflowId: id });

    logger.info('Workflow execution completed', {
      executionId: execution.id,
      workflowId: id,
      customerId: req.customerId,
    });

    res.json({
      success: true,
      data: execution,
    });
  } catch (error: any) {
    logger.error('Workflow execution failed', { workflowId: req.params.id, error: error.message });
    throw new AppError('Failed to execute workflow', 500, 'WORKFLOW_EXECUTION_ERROR');
  }
});

export default router;

