import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import { measure } from '../../../lib/metrics';
import db from '../../../lib/database/client';

const router = Router();
const logger = createLogger('report-generate-route');

// POST /api/reports/generate - Generate report
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportType, startDate, endDate, format = 'pdf' } = req.body;

    if (!reportType || !startDate || !endDate) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    const report = await measure('report_generate', async () => {
      await db.report.findMany({
        where: { customerId: req.customerId, reportType }
      });

      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      await db.report.create({
        data: {
          customerId: req.customerId!,
          reportType,
          startDate,
          endDate,
          format,
          status: 'completed',
        }
      });

      return {
        id: `report_${Math.random().toString(36).substr(2, 9)}`,
        customerId: req.customerId!,
        reportType,
        startDate,
        endDate,
        format,
        status: 'completed',
        generatedAt: new Date(),
        downloadUrl: `/api/reports/download/${reportType}`,
      };
    }, { customerId: req.customerId!, reportType });

    logger.info('Report generated', {
      reportId: report.id,
      customerId: req.customerId,
      reportType,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error('Report generation failed', { customerId: req.customerId, error: error.message });
    throw new AppError('Report generation failed', 500, 'REPORT_GENERATION_ERROR');
  }
});

export default router;

