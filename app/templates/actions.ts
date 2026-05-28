'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

/**
 * Saves templates for the logged-in tenant (replaces existing templates).
 */
export async function saveTemplates(templates: Array<{ eventType: string; messageBody: string }>) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Clear existing
  await query('DELETE FROM templates WHERE tenant_id = $1', [tenantId]);

  // Insert updated
  for (const t of templates) {
    if (t.messageBody.trim()) {
      await query(
        'INSERT INTO templates (tenant_id, event_type, message_body) VALUES ($1, $2, $3)',
        [tenantId, t.eventType, t.messageBody.trim()]
      );
    }
  }

  revalidatePath('/templates');
  revalidatePath('/dashboard');
  return { success: true };
}
