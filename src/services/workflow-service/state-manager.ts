import { createLogger } from '../../lib/logger';
import cache from '../../lib/cache';

const logger = createLogger('workflow-state-manager');

export class WorkflowStateManager {
  async saveState(executionId: string, state: Record<string, any>): Promise<void> {
    const key = `workflow:state:${executionId}`;
    await cache.set(key, state, 3600);
    logger.debug('Workflow state saved', { executionId });
  }

  async getState(executionId: string): Promise<Record<string, any> | null> {
    const key = `workflow:state:${executionId}`;
    return await cache.get(key);
  }

  async deleteState(executionId: string): Promise<void> {
    const key = `workflow:state:${executionId}`;
    await cache.del(key);
    logger.debug('Workflow state deleted', { executionId });
  }
}

