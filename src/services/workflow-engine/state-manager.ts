import { createLogger } from '../../lib/logger';
import cache from '../../lib/cache';

const logger = createLogger('state-manager');

export class WorkflowStateManager {
  private readonly STATE_TTL = 3600; // 1 hour

  async saveState(executionId: string, state: Record<string, any>): Promise<void> {
    const key = `workflow:state:${executionId}`;
    
    try {
      await cache.set(key, state, this.STATE_TTL);
      
      logger.debug('Workflow state saved', {
        executionId,
        stateSize: JSON.stringify(state).length,
      });
    } catch (error: any) {
      logger.error('Failed to save workflow state', {
        executionId,
        error: error.message,
      });
      throw error;
    }
  }

  async getState(executionId: string): Promise<Record<string, any> | null> {
    const key = `workflow:state:${executionId}`;
    
    try {
      const state = await cache.get(key);
      
      if (!state) {
        logger.debug('Workflow state not found', { executionId });
        return null;
      }
      
      logger.debug('Workflow state retrieved', {
        executionId,
        stateSize: JSON.stringify(state).length,
      });
      
      return state;
    } catch (error: any) {
      logger.error('Failed to retrieve workflow state', {
        executionId,
        error: error.message,
      });
      throw error;
    }
  }

  async deleteState(executionId: string): Promise<void> {
    const key = `workflow:state:${executionId}`;
    
    try {
      await cache.del(key);
      logger.debug('Workflow state deleted', { executionId });
    } catch (error: any) {
      logger.error('Failed to delete workflow state', {
        executionId,
        error: error.message,
      });
      throw error;
    }
  }
}

