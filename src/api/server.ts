import express, { Express } from 'express';
import { createLogger } from '../lib/logger';
import config from '../lib/config';
import { authenticate } from './middleware/auth';
import { requestLogger } from './middleware/request-logging';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Import route handlers
import workflowImportRouter from './routes/workflows/import';
import workflowCreateRouter from './routes/workflows/create';
import workflowExecuteRouter from './routes/workflows/execute';
import workflowStatusRouter from './routes/workflows/status';
import workflowExportRouter from './routes/workflows/export';
import userCreateRouter from './routes/users/create';
import userUpdateRouter from './routes/users/update';
import userDeleteRouter from './routes/users/delete';
import dataSyncRouter from './routes/data/sync';
import dataTransformRouter from './routes/data/transform';
import reportGenerateRouter from './routes/reports/generate';
import reportScheduleRouter from './routes/reports/schedule';

const logger = createLogger('api-server');

export function createServer(): Express {
  const app = express();

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global middleware
  app.use(requestLogger);

  // Health check (no auth required)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Protected routes (auth required)
  app.use('/api/workflows/import', authenticate, workflowImportRouter);
  app.use('/api/workflows', authenticate, workflowCreateRouter);
  app.use('/api/workflows', authenticate, workflowExecuteRouter);
  app.use('/api/workflows', authenticate, workflowStatusRouter);
  app.use('/api/workflows', authenticate, workflowExportRouter);
  app.use('/api/users', authenticate, userCreateRouter);
  app.use('/api/users', authenticate, userUpdateRouter);
  app.use('/api/users', authenticate, userDeleteRouter);
  app.use('/api/data/sync', authenticate, dataSyncRouter);
  app.use('/api/data/transform', authenticate, dataTransformRouter);
  app.use('/api/reports/generate', authenticate, reportGenerateRouter);
  app.use('/api/reports/schedule', authenticate, reportScheduleRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer(): void {
  const app = createServer();
  
  app.listen(config.port, () => {
    logger.info('API server started', {
      port: config.port,
      env: config.env,
    });
  });
}

if (require.main === module) {
  startServer();
}

