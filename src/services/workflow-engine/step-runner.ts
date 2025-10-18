import { WorkflowStep, StepExecutionResult } from '../../types/workflow';
import { createLogger } from '../../lib/logger';

const logger = createLogger('step-runner');

export class StepRunner {
  async executeStep(step: WorkflowStep, context: Record<string, any>): Promise<StepExecutionResult> {
    const startTime = Date.now();

    try {
      logger.debug('Step execution started', {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
      });

      let output: any;

      switch (step.type) {
        case 'api-call':
          output = await this.executeApiCall(step, context);
          break;
        case 'transformation':
          output = await this.executeTransformation(step, context);
          break;
        case 'condition':
          output = await this.evaluateCondition(step, context);
          break;
        case 'notification':
          output = await this.sendNotification(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const duration = Date.now() - startTime;

      logger.debug('Step execution completed', {
        stepId: step.id,
        stepName: step.name,
        duration,
      });

      return {
        stepId: step.id,
        success: true,
        output,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Step execution failed', {
        stepId: step.id,
        stepName: step.name,
        error: error.message,
        duration,
      });

      return {
        stepId: step.id,
        success: false,
        output: null,
        duration,
        error: error.message,
      };
    }
  }

  private async executeApiCall(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return {
      statusCode: 200,
      data: { result: 'success', requestedAt: new Date().toISOString() },
    };
  }

  private async executeTransformation(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    // Simulate data transformation
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    return {
      transformed: true,
      inputKeys: Object.keys(context),
    };
  }

  private async evaluateCondition(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    // Simulate condition evaluation
    await new Promise(resolve => setTimeout(resolve, 20 + Math.random() * 50));
    return {
      conditionMet: true,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private async sendNotification(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    // Simulate notification sending
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 150));
    return {
      sent: true,
      notificationId: `notif_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

