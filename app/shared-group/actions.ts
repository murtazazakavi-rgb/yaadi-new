'use server';

import { query } from '@/lib/db';

/**
 * Fetches the group details, contacts, and events for a public shared group.
 * Only returns details if the share link exists and is active.
 */
export async function getPublicSharedGroup(shareLinkId: string) {
  if (!shareLinkId) return null;

  // 1. Verify link status
  const linkRes = await query(
    `SELECT gsl.group_id, gsl.is_active, g.name as group_name
     FROM group_share_links gsl
     JOIN groups g ON gsl.group_id = g.id
     WHERE gsl.id = $1`,
    [shareLinkId]
  );

  if (linkRes.rows.length === 0) {
    return null;
  }

  const { group_id: groupId, is_active: isActive, group_name: groupName } = linkRes.rows[0];

  if (!isActive) {
    return { isActive: false, groupName };
  }

  // 2. Fetch contacts mapped to this group
  const contactsRes = await query(
    `SELECT c.id, c.first_name, c.middle_name, c.last_name, c.phone_number
     FROM contacts c
     JOIN contact_group_mappings cgm ON c.id = cgm.contact_id
     WHERE cgm.group_id = $1
     ORDER BY c.first_name ASC`,
    [groupId]
  );

  // 3. Fetch events for these contacts
  const contacts = contactsRes.rows;
  if (contacts.length === 0) {
    return { isActive: true, groupName, contacts: [], events: [] };
  }

  const contactIds = contacts.map(c => c.id);
  const eventsRes = await query(
    `SELECT e.id, e.contact_id, e.event_type, e.g_day, e.g_month, e.g_year, e.h_day, e.h_month, e.h_year 
     FROM events e 
     WHERE e.contact_id = ANY($1)`,
    [contactIds]
  );

  return {
    isActive: true,
    groupName,
    contacts,
    events: eventsRes.rows
  };
}
