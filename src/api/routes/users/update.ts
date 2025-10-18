import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import cache from '../../../lib/cache';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('user-update-route');

// PUT /api/users/:id - Update user
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;

    await db.user.findUnique({
      where: { id }
    });

    await new Promise(resolve => setTimeout(resolve, 60 + Math.random() * 100));

    await db.user.update({
      where: { id },
      data: { name, role, status }
    });

    const user = {
      id,
      customerId: req.customerId!,
      name,
      role,
      status,
      updatedAt: new Date(),
    };

    // Invalidate cache
    await cache.del(`user:${id}`);

    logger.info('User updated', {
      userId: id,
      customerId: req.customerId,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    logger.error('Failed to update user', { userId: req.params.id, error: error.message });
    throw new AppError('Failed to update user', 500, 'USER_UPDATE_ERROR');
  }
});

export default router;

