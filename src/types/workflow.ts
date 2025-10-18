export interface Workflow {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  status: 'draft' | 'importing' | 'active' | 'paused' | 'archived';
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinition {
  version: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
  variables?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'http' | 'transform' | 'conditional' | 'loop' | 'parallel';
  config: Record<string, any>;
  nextStep?: string | string[];
  errorHandler?: string;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'event';
  config: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  customerId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  context: Record<string, any>;
}

export interface WorkflowImportRequest {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  validateBeforeImport?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  validatedAt: Date;
  validationDuration: number;
}

