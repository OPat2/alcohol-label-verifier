import { getPool } from '@/db/connection';
import { createLogger } from '@/utils/logger';

const logger = createLogger('db:schema');

export const initializeSchema = async () => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'agent',
        organization_id UUID,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // Labels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        filename VARCHAR(255) NOT NULL,
        image_url VARCHAR(500),
        processing_status VARCHAR(50) DEFAULT 'pending',
        confidence DECIMAL(5,2),
        extracted_data JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label_id UUID REFERENCES labels(id),
        application_data JSONB NOT NULL,
        comparison_results JSONB,
        overall_confidence DECIMAL(5,2),
        status VARCHAR(50) DEFAULT 'pending',
        agent_notes TEXT,
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Batch jobs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        total_items INTEGER,
        processed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'queued',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50),
        resource_id UUID,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indices for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_labels_status ON labels(processing_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_verifications_label_id ON verifications(label_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id ON batch_jobs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize schema', error);
    throw error;
  } finally {
    client.release();
  }
};
