import { createLogger } from '../logger';
import config from '../config';
import metrics from '../metrics';
import { Workflow, ValidationResult } from '../../types/workflow';

const logger = createLogger('validation-service');

/**
 * External Validation Service Client
 * 
 * This service validates workflow definitions for security, compliance, and best practices.
 */

export class ValidationServiceClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.externalServices.validationService.url;
    this.timeout = config.externalServices.validationService.timeout;
    this.apiKey = config.externalServices.validationService.apiKey;
  }

  /**
   * Validate a workflow definition
   * 
   * The external service performs extensive validation including:
   * - Security scanning
   * - Compliance checks
   * - Performance analysis
   * - Best practice recommendations
   */
  async validateWorkflow(workflow: Workflow): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      logger.info('Calling external validation service', {
        workflowId: workflow.id,
        customerId: workflow.customerId,
        serviceUrl: this.baseUrl,
      });

      // Simulate HTTP request to external service
      // In production, this would be: await fetch(...)
      const requestDuration = 20000 + Math.random() * 5000;
      await new Promise(resolve => setTimeout(resolve, requestDuration));

      // Simulate validation response
      const result: ValidationResult = {
        valid: Math.random() > 0.1, // 90% valid
        errors: Math.random() > 0.9 ? ['Invalid step configuration'] : undefined,
        warnings: Math.random() > 0.7 ? ['Consider adding error handling'] : undefined,
        validatedAt: new Date(),
        validationDuration: requestDuration,
      };

      const duration = Date.now() - startTime;

      logger.info('Validation service call completed', {
        workflowId: workflow.id,
        customerId: workflow.customerId,
        duration,
        valid: result.valid,
      });

      metrics.counter('validation_service_calls');
      metrics.histogram('validation_service_duration_ms', duration);
      metrics.counter(result.valid ? 'validation_service_valid' : 'validation_service_invalid');

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Validation service call failed', {
        workflowId: workflow.id,
        customerId: workflow.customerId,
        duration,
        error: error.message,
      });

      metrics.counter('validation_service_errors');
      metrics.histogram('validation_service_duration_ms', duration);

      throw new Error(`Validation service error: ${error.message}`);
    }
  }

  /**
   * Check validation service health
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Checking validation service health');
      
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      logger.debug('Validation service is healthy');
      return true;
    } catch (error: any) {
      logger.error('Validation service health check failed', {
        error: error.message,
      });
      return false;
    }
  }
}

// Singleton instance
const validationService = new ValidationServiceClient();

export default validationService;

