import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import cache from '../../../lib/cache';

const router = Router();
const logger = createLogger('user-delete-route');

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Simulate deletion
    await new Promise(resolve => setTimeout(resolve, 70 + Math.random() * 130));

    // Invalidate cache
    await cache.del(`user:${id}`);

    logger.info('User deleted', {
      userId: id,
      customerId: req.customerId,
    });

    res.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error: any) {
    logger.error('Failed to delete user', { userId: req.params.id, error: error.message });
    throw new AppError('Failed to delete user', 500, 'USER_DELETE_ERROR');
  }
});

export default router;

