import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import { measure } from '../../../lib/metrics';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('workflow-create-route');

// POST /api/workflows - Create a new workflow
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, definition } = req.body;

    if (!name || !definition) {
      throw new AppError('Missing required fields: name, definition', 400, 'VALIDATION_ERROR');
    }

    const workflow = await measure('workflow_create', async () => {
      const created = await db.workflow.create({
        data: {
          customerId: req.customerId!,
          name,
          description,
          definition,
          status: 'draft',
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      return {
        id: created.id,
        customerId: req.customerId!,
        name,
        description,
        definition,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }, { customerId: req.customerId! });

    logger.info('Workflow created', {
      workflowId: workflow.id,
      customerId: req.customerId,
      name,
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to create workflow', { customerId: req.customerId, error: error.message });
    throw new AppError('Failed to create workflow', 500, 'WORKFLOW_CREATE_ERROR');
  }
});

export default router;

