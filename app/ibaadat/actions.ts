'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

/**
 * Fetches all tracked ibaadat records for the current tenant in the given date range.
 * Dates are returned as 'YYYY-MM-DD' strings.
 */
export async function getIbaadatRecords(startDateStr: string, endDateStr: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  try {
    const res = await query(
      `SELECT date::text, logs 
       FROM ibaadat_tracker 
       WHERE tenant_id = $1 AND date >= $2 AND date <= $3`,
      [tenantId, startDateStr, endDateStr]
    );
    return { success: true, records: res.rows };
  } catch (error: any) {
    console.error('Failed to get ibaadat records:', error);
    return { success: false, error: error.message || 'Failed to fetch records.' };
  }
}

/**
 * Upserts a single ibaadat habit status.
 * If status is null, deletes the key from the logs object to reset/unmark it.
 */
export async function updateIbaadatRecord(dateStr: string, key: string, status: string | null) {
  const session = await requireAuth();
  const tenantId = session.userId;

  try {
    if (status === null) {
      // Delete the key from JSONB logs
      const res = await query(
        `INSERT INTO ibaadat_tracker (tenant_id, date, logs)
         VALUES ($1, $2, '{}'::jsonb)
         ON CONFLICT (tenant_id, date) DO UPDATE
         SET 
           logs = ibaadat_tracker.logs - $3::text,
           updated_at = CURRENT_TIMESTAMP
         RETURNING date::text, logs`,
        [tenantId, dateStr, key]
      );
      return { success: true, record: res.rows[0] };
    } else {
      // Upsert/merge the key-value in JSONB logs
      const res = await query(
        `INSERT INTO ibaadat_tracker (tenant_id, date, logs)
         VALUES ($1, $2, jsonb_build_object($3::text, $4::text))
         ON CONFLICT (tenant_id, date) DO UPDATE
         SET 
           logs = ibaadat_tracker.logs || EXCLUDED.logs,
           updated_at = CURRENT_TIMESTAMP
         RETURNING date::text, logs`,
        [tenantId, dateStr, key, status]
      );
      return { success: true, record: res.rows[0] };
    }
  } catch (error: any) {
    console.error('Failed to update ibaadat record:', error);
    return { success: false, error: error.message || 'Failed to update record.' };
  }
}
