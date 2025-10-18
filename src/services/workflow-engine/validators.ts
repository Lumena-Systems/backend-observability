import { Workflow, WorkflowStep } from '../../types/workflow';
import { createLogger } from '../../lib/logger';

const logger = createLogger('workflow-validator');

export class WorkflowValidator {
  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate basic fields
    if (!workflow.id) errors.push('Workflow ID is required');
    if (!workflow.name) errors.push('Workflow name is required');
    if (!workflow.customerId) errors.push('Customer ID is required');
    if (!Array.isArray(workflow.steps)) errors.push('Workflow steps must be an array');

    // Validate steps
    if (workflow.steps.length === 0) {
      errors.push('Workflow must have at least one step');
    } else {
      workflow.steps.forEach((step, index) => {
        const stepErrors = this.validateStep(step);
        stepErrors.forEach(err => errors.push(`Step ${index + 1}: ${err}`));
      });
    }

    // Check for duplicate step numbers
    const stepNumbers = workflow.steps.map(s => s.stepNumber);
    const duplicates = stepNumbers.filter((num, index) => stepNumbers.indexOf(num) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate step numbers found: ${duplicates.join(', ')}`);
    }

    const valid = errors.length === 0;

    if (!valid) {
      logger.warn('Workflow validation failed', {
        workflowId: workflow.id,
        errors,
      });
    }

    return { valid, errors };
  }

  private validateStep(step: WorkflowStep): string[] {
    const errors: string[] = [];

    if (!step.id) errors.push('Step ID is required');
    if (!step.name) errors.push('Step name is required');
    if (!step.type) errors.push('Step type is required');
    if (step.stepNumber < 1) errors.push('Step number must be positive');
    if (step.timeout && step.timeout < 0) errors.push('Timeout must be non-negative');

    const validTypes = ['api-call', 'transformation', 'condition', 'notification'];
    if (!validTypes.includes(step.type)) {
      errors.push(`Invalid step type: ${step.type}`);
    }

    return errors;
  }

  validateStepConfig(step: WorkflowStep): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!step.config || typeof step.config !== 'object') {
      errors.push('Step config is required and must be an object');
      return { valid: false, errors };
    }

    // Type-specific validation
    switch (step.type) {
      case 'api-call':
        if (!step.config.url) errors.push('API call requires url in config');
        if (!step.config.method) errors.push('API call requires method in config');
        break;
      case 'transformation':
        if (!step.config.operation) errors.push('Transformation requires operation in config');
        break;
      case 'condition':
        if (!step.config.expression) errors.push('Condition requires expression in config');
        break;
      case 'notification':
        if (!step.config.recipient) errors.push('Notification requires recipient in config');
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}

