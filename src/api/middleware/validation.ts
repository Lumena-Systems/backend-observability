import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../lib/logger';

const logger = createLogger('validation-middleware');

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && value === undefined) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      if (value !== undefined) {
        if (rule.type && typeof value !== rule.type) {
          errors.push(`${rule.field} must be of type ${rule.type}`);
        }

        if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }

        if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
          errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
        }

        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push(`${rule.field} format is invalid`);
        }

        if (rule.custom && !rule.custom(value)) {
          errors.push(`${rule.field} validation failed`);
        }
      }
    }

    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        errors,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: { errors },
        },
      });
      return;
    }

    next();
  };
}

