import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../../types/api';
import { WorkflowImportRequest } from '../../../types/workflow';
import { createLogger } from '../../../lib/logger';
import { AppError } from '../../middleware/error-handler';
import db from '../../../lib/database/client';
import { validateWithExternalService } from '../../../services/workflow-service/validator';
import { measure } from '../../../lib/metrics';

const router = Router();
const logger = createLogger('workflow-import-route');

/**
 * POST /api/workflows/import - Import and validate workflow
 * 
 * This endpoint imports workflow definitions and validates them
 * using an external validation service.
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const importRequest: WorkflowImportRequest = req.body;

    if (!importRequest.name || !importRequest.definition) {
      throw new AppError(
        'Missing required fields: name, definition',
        400,
        'VALIDATION_ERROR'
      );
    }

    logger.info('Starting workflow import', {
      customerId: req.customerId,
      workflowName: importRequest.name,
      validateBeforeImport: importRequest.validateBeforeImport !== false,
    });

    const workflow = await measure('workflow_import', async () => {
      return await db.$transaction(async (tx) => {
        
        // Step 1: Insert workflow into database
        const workflow = await tx.workflow.create({
          data: {
            id: `wf_${Math.random().toString(36).substr(2, 9)}`,
            customerId: req.customerId!,
            name: importRequest.name,
            description: importRequest.description,
            definition: importRequest.definition,
            status: 'importing', // Will be updated to 'active' after validation
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.debug('Workflow created in database', {
          workflowId: workflow.id,
          customerId: req.customerId,
        });

        // Step 2: Insert workflow steps
        if (importRequest.definition.steps && importRequest.definition.steps.length > 0) {
          await tx.workflowStep.createMany({
            data: importRequest.definition.steps.map(step => ({
              workflowId: workflow.id,
              ...step,
            })),
          });

          logger.debug('Workflow steps created', {
            workflowId: workflow.id,
            stepCount: importRequest.definition.steps.length,
          });
        }

        if (importRequest.validateBeforeImport !== false) {
          logger.info('Calling external validation service', {
            workflowId: workflow.id,
            customerId: req.customerId,
          });

          const validationResult = await validateWithExternalService(workflow);

          if (!validationResult.valid) {
            logger.error('Workflow validation failed', {
              workflowId: workflow.id,
              errors: validationResult.errors,
            });
            throw new AppError(
              `Workflow validation failed: ${validationResult.errors?.join(', ')}`,
              400,
              'VALIDATION_FAILED',
              { errors: validationResult.errors }
            );
          }

          logger.info('Workflow validation passed', {
            workflowId: workflow.id,
            validationDuration: validationResult.validationDuration,
          });
        }

        // Step 3: Update workflow status after validation
        const updatedWorkflow = await tx.workflow.update({
          where: { id: workflow.id },
          data: {
            status: 'active',
            validatedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.info('Workflow import completed', {
          workflowId: workflow.id,
          customerId: req.customerId,
        });

        return updatedWorkflow;
      }, {
        timeout: 60000,
        isolationLevel: 'ReadCommitted',
      });

    }, { customerId: req.customerId! });

    res.status(201).json({
      success: true,
      data: workflow,
    });

  } catch (error: any) {
    if (error instanceof AppError) throw error;
    
    logger.error('Workflow import failed', {
      customerId: req.customerId,
      error: error.message,
    });
    
    throw new AppError(
      'Failed to import workflow',
      500,
      'WORKFLOW_IMPORT_ERROR',
      { error: error.message }
    );
  }
});

export default router;

