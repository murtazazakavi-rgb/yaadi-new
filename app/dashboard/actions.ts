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
 * Fetches all contacts and events for the logged-in tenant.
 */
export async function getDashboardData() {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Get contacts
  const contactsRes = await query(
    'SELECT id, first_name, last_name, phone_number, email, notes FROM contacts WHERE tenant_id = $1 ORDER BY first_name ASC',
    [tenantId]
  );

  // Get events
  const eventsRes = await query(
    `SELECT e.id, e.contact_id, e.event_type, e.g_day, e.g_month, e.g_year, e.h_day, e.h_month, e.h_year 
     FROM events e 
     JOIN contacts c ON e.contact_id = c.id 
     WHERE c.tenant_id = $1`,
    [tenantId]
  );

  // Get templates
  const templatesRes = await query(
    'SELECT event_type, message_body FROM templates WHERE tenant_id = $1',
    [tenantId]
  );

  return {
    contacts: contactsRes.rows,
    events: eventsRes.rows,
    templates: templatesRes.rows,
  };
}
