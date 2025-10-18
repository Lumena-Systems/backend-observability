import { createLogger } from '../logger';
import db from './client';

const logger = createLogger('transactions');

/**
 * Transaction helper utilities
 * These provide common patterns for managing transactions
 */

export interface TransactionOptions {
  timeout?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  maxRetries?: number;
}

/**
 * Execute code within a transaction with automatic retry on conflicts
 */
export async function withTransaction<T>(
  fn: (tx: any) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await db.$transaction(fn, {
        timeout: options?.timeout || 60000,
        isolationLevel: options?.isolationLevel || 'ReadCommitted',
      });
    } catch (error: any) {
      lastError = error;
      
      // Only retry on serialization failures or deadlocks
      if (error.message.includes('serialization') || error.message.includes('deadlock')) {
        logger.warn('Transaction conflict, retrying', {
          attempt,
          maxRetries,
          error: error.message,
        });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        continue;
      }
      
      // Don't retry other errors
      throw error;
    }
  }

  throw lastError || new Error('Transaction failed after max retries');
}

/**
 * Execute multiple operations in a transaction
 * Returns results of all operations
 */
export async function batchInTransaction<T extends any[]>(
  operations: Array<(tx: any) => Promise<any>>
): Promise<T> {
  return await db.$transaction(async (tx) => {
    const results: any[] = [];
    
    for (const operation of operations) {
      const result = await operation(tx);
      results.push(result);
    }
    
    return results as T;
  });
}

/**
 * Check if code is currently running within a transaction
 * (This is a simplified version - in production, use async context)
 */
export function isInTransaction(): boolean {
  // In production, this would check async local storage or similar
  return false;
}

