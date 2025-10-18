import { Workflow, ValidationResult } from '../../types/workflow';
import { createLogger } from '../../lib/logger';
import validationService from '../../lib/external-apis/validation-service';
import metrics from '../../lib/metrics';

const logger = createLogger('workflow-validator');

/**
 * Validate workflow with external validation service
 * 
 * This function calls an external validation service that performs
 * extensive security, compliance, and best practice checks.
 */
export async function validateWithExternalService(workflow: Workflow): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    logger.info('Validating workflow with external service', {
      workflowId: workflow.id,
      customerId: workflow.customerId,
      workflowName: workflow.name,
    });

    // Call external validation service
    const result = await validationService.validateWorkflow(workflow);

    const duration = Date.now() - startTime;

    logger.info('Workflow validation completed', {
      workflowId: workflow.id,
      customerId: workflow.customerId,
      valid: result.valid,
      duration,
      externalServiceDuration: result.validationDuration,
    });

    metrics.counter('workflow_validations', 1, {
      valid: result.valid.toString(),
    });
    metrics.histogram('workflow_validation_total_duration_ms', duration);

    return result;

  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Workflow validation failed', {
      workflowId: workflow.id,
      customerId: workflow.customerId,
      error: error.message,
      duration,
    });

    metrics.counter('workflow_validation_errors');

    // Return validation failure rather than throwing
    // This allows the import process to handle it gracefully
    return {
      valid: false,
      errors: [error.message],
      validatedAt: new Date(),
      validationDuration: duration,
    };
  }
}

/**
 * Validate workflow definition locally
 * This performs basic structural validation without calling external services
 */
export function validateWorkflowDefinitionLocally(workflow: Workflow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation checks
  if (!workflow.name || workflow.name.length < 3) {
    errors.push('Workflow name must be at least 3 characters');
  }

  if (!workflow.definition || !workflow.definition.steps) {
    errors.push('Workflow must have a definition with steps');
  }

  if (workflow.definition?.steps?.length === 0) {
    errors.push('Workflow must have at least one step');
  }

  // Check for duplicate step IDs
  const stepIds = new Set<string>();
  for (const step of workflow.definition?.steps || []) {
    if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);

    if (!step.name) {
      errors.push(`Step ${step.id} is missing a name`);
    }

    if (!step.type) {
      errors.push(`Step ${step.id} is missing a type`);
    }
  }

  // Warnings for best practices
  if (workflow.definition?.steps && workflow.definition.steps.length > 50) {
    warnings.push('Workflow has more than 50 steps, consider breaking it down');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    validatedAt: new Date(),
    validationDuration: 0,
  };
}

