import { createLogger } from '@/utils/logger';

const logger = createLogger('db:connection');

let pool: any;

export const initializeDatabase = async () => {
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '10'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });

    const client = await pool.connect();
    logger.info('Database connected successfully');
    client.release();

    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
};

export const getPool = () => pool;

export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};
