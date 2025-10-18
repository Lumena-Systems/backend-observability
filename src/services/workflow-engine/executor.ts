import { Workflow, WorkflowExecution, StepExecutionResult } from '../../types/workflow';
import { createLogger } from '../../lib/logger';
import { measure } from '../../lib/metrics';
import { StepRunner } from './step-runner';

const logger = createLogger('workflow-executor');

export class WorkflowExecutor {
  private stepRunner: StepRunner;

  constructor() {
    this.stepRunner = new StepRunner();
  }

  async execute(workflow: Workflow, context: Record<string, any>): Promise<WorkflowExecution> {
    const executionId = `exec_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('Starting workflow execution', {
      executionId,
      workflowId: workflow.id,
      customerId: workflow.customerId,
      stepCount: workflow.steps.length,
    });

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      customerId: workflow.customerId,
      status: 'running',
      startedAt: new Date(),
      context,
    };

    try {
      const results: StepExecutionResult[] = [];

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        execution.currentStep = step.stepNumber;

        logger.debug('Executing workflow step', {
          executionId,
          workflowId: workflow.id,
          stepNumber: step.stepNumber,
          stepName: step.name,
        });

        const result = await measure(
          'workflow_step_execute',
          () => this.stepRunner.executeStep(step, context),
          {
            workflowId: workflow.id,
            stepNumber: step.stepNumber.toString(),
          }
        );

        results.push(result);

        if (!result.success) {
          logger.error('Workflow step failed', {
            executionId,
            workflowId: workflow.id,
            stepNumber: step.stepNumber,
            error: result.error,
          });

          execution.status = 'failed';
          execution.error = result.error;
          execution.completedAt = new Date();
          return execution;
        }

        // Update context with step output
        context[`step_${step.stepNumber}_output`] = result.output;
      }

      execution.status = 'completed';
      execution.completedAt = new Date();

      logger.info('Workflow execution completed', {
        executionId,
        workflowId: workflow.id,
        duration: execution.completedAt.getTime() - execution.startedAt.getTime(),
      });

      return execution;
    } catch (error: any) {
      logger.error('Workflow execution error', {
        executionId,
        workflowId: workflow.id,
        error: error.message,
      });

      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      return execution;
    }
  }
}

