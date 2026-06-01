'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { sendEmail, generateHtmlDigest } from '@/lib/mail';
import { getNextGregorianEvent, getNextHijriEvent } from '@/lib/hijri';

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
    `SELECT DISTINCT c.id, c.first_name, c.middle_name, c.last_name, c.phone_number, c.email, c.notes, c.tenant_id, c.born_after_maghrib,
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

  // Query pending submissions count
  const pendingSubmissionsRes = await query(
    `SELECT COUNT(*)::integer as count FROM submissions WHERE tenant_id = $1 AND status = 'pending'`,
    [tenantId]
  );
  const pendingApprovalsCount = pendingSubmissionsRes.rows[0]?.count || 0;

  // Query pending received connections count
  const pendingConnectionsRes = await query(
    `SELECT COUNT(*)::integer as count FROM tenant_connections WHERE receiver_id = $1 AND status = 'pending'`,
    [tenantId]
  );
  const pendingConnectionsCount = pendingConnectionsRes.rows[0]?.count || 0;

  return {
    contacts: contactsRes.rows,
    events: eventsRes.rows,
    templates: templatesRes.rows,
    pendingApprovalsCount,
    pendingConnectionsCount,
  };
}

/**
 * Triggers a manual email digest of daily reminders to the currently logged in tenant.
 */
export async function triggerManualEmailDigest() {
  const session = await requireAuth();
  const tenantId = session.userId;

  // 1. Fetch tenant email and display name
  const tenantRes = await query('SELECT email, display_name FROM tenants WHERE id = $1', [tenantId]);
  if (tenantRes.rows.length === 0) {
    throw new Error('Tenant details not found.');
  }
  const tenant = tenantRes.rows[0];

  // 2. Fetch visible contacts
  const contactsRes = await query(
    `SELECT DISTINCT c.id, c.first_name, c.middle_name, c.last_name, c.phone_number, c.email, c.notes, c.tenant_id, c.born_after_maghrib
     FROM contacts c
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

  // 3. Fetch visible events
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

  const contacts = contactsRes.rows;
  const events = eventsRes.rows;

  // 4. Process event countdowns
  const reminders = events.map((event: any) => {
    const contact = contacts.find((c: any) => c.id === event.contact_id);
    if (!contact) return null;

    let calResult;
    if (event.event_type === 'birthday_gregorian' || event.event_type === 'anniversary' || event.event_type === 'death_gregorian') {
      calResult = getNextGregorianEvent(event.g_month, event.g_day, event.g_year);
    } else if (event.event_type === 'birthday_hijri' || event.event_type === 'death_hijri') {
      calResult = getNextHijriEvent(event.h_month, event.h_day, event.h_year);
    } else {
      return null;
    }

    return {
      eventType: event.event_type,
      daysRemaining: calResult.daysRemaining,
      ordinal: calResult.ordinal,
      contact
    };
  })
  .filter(Boolean)
  .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

  const todayEvents = reminders.filter((r: any) => r.daysRemaining === 0);
  const upcomingEvents = reminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);

  // Send the email (always send for manual tests)
  const html = generateHtmlDigest(tenant.display_name, todayEvents, upcomingEvents);
  const subject = todayEvents.length > 0 
    ? `Yaadi Reminders: Family Events Today! (${todayEvents.length})`
    : `Yaadi Reminders: Weekly Digest Preview`;

  const result = await sendEmail({
    to: tenant.email,
    subject,
    html
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to send email.' };
  }

  return { success: true, email: tenant.email };
}
