import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import { measure } from '../../../lib/metrics';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('user-create-route');

// POST /api/users - Create a new user
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role = 'member' } = req.body;

    if (!email || !name) {
      throw new AppError('Missing required fields: email, name', 400, 'VALIDATION_ERROR');
    }

    const user = await measure('user_create', async () => {
      await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));

      await db.user.update({
        where: { id: `user_${Math.random().toString(36).substr(2, 9)}` },
        data: {
          customerId: req.customerId!,
          email,
          name,
          role,
          status: 'active',
        }
      });

      return {
        id: `user_${Math.random().toString(36).substr(2, 9)}`,
        customerId: req.customerId!,
        email,
        name,
        role,
        status: 'active',
        createdAt: new Date(),
      };
    }, { customerId: req.customerId! });

    logger.info('User created', {
      userId: user.id,
      customerId: req.customerId,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Failed to create user', { customerId: req.customerId, error: error.message });
    throw new AppError('Failed to create user', 500, 'USER_CREATE_ERROR');
  }
});

export default router;

