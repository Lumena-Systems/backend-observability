import { createLogger } from '../logger';
import config from '../config';
import metrics from '../metrics';

const logger = createLogger('database');

interface DatabaseConnection {
  id: string;
  state: 'active' | 'idle' | 'idle_in_transaction';
  acquiredAt: Date;
  queryCount: number;
  transactionId?: string;
}

class DatabaseClient {
  private poolSize: number;
  private connections: DatabaseConnection[] = [];
  private availableConnections: number;
  private waitQueue: Array<(conn: DatabaseConnection) => void> = [];

  constructor() {
    this.poolSize = config.database.poolSize;
    this.availableConnections = this.poolSize;
    
    logger.info('Database client initialized', {
      poolSize: this.poolSize,
      url: config.database.url.replace(/\/\/.*@/, '//***@'),
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    const startTime = Date.now();
    
    if (this.availableConnections > 0) {
      this.availableConnections--;
      const conn: DatabaseConnection = {
        id: `conn_${Math.random().toString(36).substr(2, 9)}`,
        state: 'active',
        acquiredAt: new Date(),
        queryCount: 0,
      };
      this.connections.push(conn);
      
      metrics.gauge('database_connections_active', this.poolSize - this.availableConnections);
      metrics.histogram('database_connection_wait_ms', Date.now() - startTime);
      
      return conn;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        metrics.counter('database_connection_timeout');
        const waitTime = Date.now() - startTime;
        logger.error('Connection pool timeout', {
          poolSize: this.poolSize,
          available: this.availableConnections,
          waitQueueDepth: this.waitQueue.length,
          waitTimeMs: waitTime,
        });
        reject(new Error('Connection pool timeout'));
      }, config.database.connectionTimeout);

      this.waitQueue.push((conn) => {
        clearTimeout(timeout);
        metrics.histogram('database_connection_wait_ms', Date.now() - startTime);
        metrics.counter('database_connection_acquired_after_wait');
        resolve(conn);
      });

      metrics.gauge('database_connection_pool_queue_depth', this.waitQueue.length);
    });
  }

  releaseConnection(conn: DatabaseConnection) {
    const index = this.connections.findIndex(c => c.id === conn.id);
    if (index !== -1) {
      this.connections.splice(index, 1);
    }

    if (conn.state === 'idle_in_transaction') {
      logger.debug('Connection state transition', {
        connectionId: conn.id,
        transactionId: conn.transactionId,
      });
    }

    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      const newConn: DatabaseConnection = {
        id: `conn_${Math.random().toString(36).substr(2, 9)}`,
        state: 'active',
        acquiredAt: new Date(),
        queryCount: 0,
      };
      this.connections.push(newConn);
      waiter(newConn);
      metrics.gauge('database_connection_pool_queue_depth', this.waitQueue.length);
    } else {
      this.availableConnections++;
      metrics.gauge('database_connections_active', this.poolSize - this.availableConnections);
    }
  }

  // Simulated Prisma-style query methods
  workflow = {
    create: async (data: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('INSERT INTO workflows ...', conn);
        return { id: `wf_${Date.now()}`, ...data.data };
      } finally {
        this.releaseConnection(conn);
      }
    },

    findMany: async (query: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('SELECT * FROM workflows ...', conn);
        return [];
      } finally {
        this.releaseConnection(conn);
      }
    },

    update: async (query: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('UPDATE workflows ...', conn);
        return { id: query.where.id, ...query.data };
      } finally {
        this.releaseConnection(conn);
      }
    },
  };

  workflowStep = {
    createMany: async (data: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('INSERT INTO workflow_steps ...', conn);
        return { count: data.data.length };
      } finally {
        this.releaseConnection(conn);
      }
    },
  };

  report = {
    create: async (data: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('INSERT INTO reports ...', conn);
        return { id: `report_${Date.now()}`, ...data.data };
      } finally {
        this.releaseConnection(conn);
      }
    },

    findMany: async (query: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('SELECT * FROM reports ...', conn);
        return [];
      } finally {
        this.releaseConnection(conn);
      }
    },
  };

  user = {
    findUnique: async (query: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('SELECT * FROM users WHERE id = ...', conn);
        return { id: query.where.id };
      } finally {
        this.releaseConnection(conn);
      }
    },

    update: async (query: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('UPDATE users ...', conn);
        return { id: query.where.id, ...query.data };
      } finally {
        this.releaseConnection(conn);
      }
    },
  };

  dataTransform = {
    create: async (data: any) => {
      const conn = await this.getConnection();
      try {
        await this.executeQuery('INSERT INTO data_transforms ...', conn);
        return { id: `tf_${Date.now()}`, ...data.data };
      } finally {
        this.releaseConnection(conn);
      }
    },
  };

  private async executeQuery(query: string, conn: DatabaseConnection): Promise<void> {
    const startTime = Date.now();
    conn.queryCount++;
    
    // Simulate query execution time
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 40));
    
    const duration = Date.now() - startTime;
    metrics.histogram('database_query_duration_ms', duration);
    metrics.counter('database_queries_total');
    
    logger.debug('Query executed', {
      connectionId: conn.id,
      duration,
      query: query.substring(0, 50) + '...',
      state: conn.state,
      transactionId: conn.transactionId,
    });
  }

  async $transaction<T>(
    fn: (tx: any) => Promise<T>,
    options?: {
      timeout?: number;
      isolationLevel?: string;
    }
  ): Promise<T> {
    const conn = await this.getConnection();
    const transactionId = `tx_${Math.random().toString(36).substr(2, 9)}`;
    conn.state = 'idle_in_transaction';
    conn.transactionId = transactionId;
    
    const txStartTime = Date.now();
    logger.debug('Transaction started', {
      connectionId: conn.id,
      transactionId,
    });
    
    try {
      await this.executeQuery('BEGIN', conn);
      
      // Pass self as transaction proxy
      const result = await fn(this);
      
      await this.executeQuery('COMMIT', conn);
      
      const duration = Date.now() - txStartTime;
      metrics.histogram('database_transaction_duration_ms', duration);
      
      logger.debug('Transaction committed', {
        connectionId: conn.id,
        transactionId,
        duration,
      });
      
      return result;
    } catch (error) {
      await this.executeQuery('ROLLBACK', conn);
      const duration = Date.now() - txStartTime;
      
      logger.error('Transaction rolled back', {
        connectionId: conn.id,
        transactionId,
        duration,
        error,
      });
      
      throw error;
    } finally {
      this.releaseConnection(conn);
    }
  }

  getPoolStats() {
    const idleInTransaction = this.connections.filter(c => c.state === 'idle_in_transaction').length;
    
    return {
      total: this.poolSize,
      active: this.poolSize - this.availableConnections,
      available: this.availableConnections,
      waiting: this.waitQueue.length,
      idleInTransaction,
    };
  }
}

const db = new DatabaseClient();

export default db;

