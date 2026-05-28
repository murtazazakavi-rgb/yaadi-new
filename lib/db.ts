import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gflmuGo1b3nX@ep-small-darkness-ajzzcgba-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = neon(connectionString);

// Helper to query the DB easily via HTTPS (bypasses port 5432 firewall blocks)
export async function query(text: string, params?: any[]) {
  const rows = await sql.query(text, params);
  return { rows };
}
