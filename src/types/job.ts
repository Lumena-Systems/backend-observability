export interface ScheduledJob {
  id: string;
  jobType: string;
  customerId: string;
  nextRunAt: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  payload: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  lastError?: string;
}

export interface JobExecutionContext {
  jobId: string;
  customerId: string;
  startTime: Date;
  timeout: number;
  metadata: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  duration: number;
  error?: string;
  output?: any;
}

export type JobType = 'data-sync' | 'email-sender' | 'report-generator' | 'cleanup';

export interface JobHandler {
  execute(job: ScheduledJob, context: JobExecutionContext): Promise<JobResult>;
  validate(payload: Record<string, any>): boolean;
}

