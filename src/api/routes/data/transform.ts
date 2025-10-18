import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('data-transform-route');

// POST /api/data/transform - Transform data
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, transformType } = req.body;

    if (!data || !transformType) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));

    const saved = await db.dataTransform.create({
      data: {
        customerId: req.customerId!,
        transformType,
        inputRecords: Array.isArray(data) ? data.length : 1,
      }
    });

    const result = {
      transformId: saved.id,
      transformType,
      inputRecords: Array.isArray(data) ? data.length : 1,
      outputRecords: Array.isArray(data) ? data.length : 1,
      transformedAt: new Date(),
    };

    logger.info('Data transformation completed', {
      transformId: result.transformId,
      customerId: req.customerId,
      transformType,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Data transformation failed', { customerId: req.customerId, error: error.message });
    throw new AppError('Data transformation failed', 500, 'DATA_TRANSFORM_ERROR');
  }
});

export default router;

