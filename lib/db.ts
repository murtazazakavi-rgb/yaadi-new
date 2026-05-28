import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gflmuGo1b3nX@ep-small-darkness-ajzzcgba-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

let isInitialized = false;

async function ensureTables() {
  if (isInitialized) return;
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS tenant_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          requester_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          receiver_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(requester_id, receiver_id)
      );
    `);
    await sql.query(`
      CREATE TABLE IF NOT EXISTS shared_contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          connection_id UUID REFERENCES tenant_connections(id) ON DELETE CASCADE,
          contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
          shared_by UUID REFERENCES tenants(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(connection_id, contact_id)
      );
    `);
    isInitialized = true;
  } catch (err) {
    console.error("Auto-migration error:", err);
  }
}

// Helper to query the DB easily via HTTPS (bypasses port 5432 firewall blocks)
export async function query(text: string, params?: any[]) {
  await ensureTables();
  const rows = await sql.query(text, params);
  return { rows };
}
