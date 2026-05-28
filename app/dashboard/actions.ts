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

  // Get contacts (owned + selectively shared)
  const contactsRes = await query(
    `SELECT DISTINCT c.id, c.first_name, c.middle_name, c.last_name, c.phone_number, c.email, c.notes, c.tenant_id,
           t.display_name as owner_name,
           (c.tenant_id = $1) as is_owner
     FROM contacts c
     LEFT JOIN tenants t ON c.tenant_id = t.id
     WHERE c.tenant_id = $1
        OR c.id IN (
          SELECT sc.contact_id 
          FROM shared_contacts sc
          JOIN tenant_connections tc ON sc.connection_id = tc.id
          WHERE tc.status = 'accepted'
            AND (
              (tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR
              (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id)
            )
        )
     ORDER BY c.first_name ASC`,
    [tenantId]
  );

  // Get events for visible contacts
  const eventsRes = await query(
    `SELECT e.id, e.contact_id, e.event_type, e.g_day, e.g_month, e.g_year, e.h_day, e.h_month, e.h_year 
     FROM events e 
     JOIN contacts c ON e.contact_id = c.id 
     WHERE c.tenant_id = $1
        OR c.id IN (
          SELECT sc.contact_id 
          FROM shared_contacts sc
          JOIN tenant_connections tc ON sc.connection_id = tc.id
          WHERE tc.status = 'accepted'
            AND (
              (tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR
              (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id)
            )
        )`,
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
