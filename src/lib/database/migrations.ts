import { createLogger } from '../logger';

const logger = createLogger('migrations');

/**
 * Database migration utilities
 * In production, this would use a migration tool like Prisma Migrate or Flyway
 */

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export class MigrationRunner {
  private migrations: Migration[] = [];

  register(migration: Migration) {
    this.migrations.push(migration);
  }

  async runPending(): Promise<void> {
    logger.info('Running pending migrations', {
      count: this.migrations.length,
    });

    for (const migration of this.migrations) {
      try {
        logger.info('Running migration', {
          id: migration.id,
          name: migration.name,
        });

        await migration.up();

        logger.info('Migration completed', {
          id: migration.id,
          name: migration.name,
        });
      } catch (error: any) {
        logger.error('Migration failed', {
          id: migration.id,
          name: migration.name,
          error: error.message,
        });
        throw error;
      }
    }

    logger.info('All migrations completed');
  }

  async rollback(steps: number = 1): Promise<void> {
    const migrationsToRollback = this.migrations.slice(-steps).reverse();

    logger.info('Rolling back migrations', {
      steps,
      count: migrationsToRollback.length,
    });

    for (const migration of migrationsToRollback) {
      try {
        logger.info('Rolling back migration', {
          id: migration.id,
          name: migration.name,
        });

        await migration.down();

        logger.info('Migration rolled back', {
          id: migration.id,
          name: migration.name,
        });
      } catch (error: any) {
        logger.error('Migration rollback failed', {
          id: migration.id,
          name: migration.name,
          error: error.message,
        });
        throw error;
      }
    }

    logger.info('Rollback completed');
  }
}

export const migrationRunner = new MigrationRunner();

