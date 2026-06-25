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
 * Creates a new contact along with their events and optional relationship links.
 */
export async function createContact(formData: {
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  bornAfterMaghrib?: boolean;
  groupIds?: string[];
  gender?: string;
  events: Array<{
    eventType: string;
    gDay?: number;
    gMonth?: number;
    gYear?: number;
    hDay?: number;
    hMonth?: number;
    hYear?: number;
  }>;
}) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { firstName, middleName, lastName, phoneNumber, email, notes, bornAfterMaghrib, groupIds, gender, events } = formData;

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required.');
  }

  // Insert contact
  const contactRes = await query(
    `INSERT INTO contacts (tenant_id, first_name, middle_name, last_name, phone_number, email, notes, born_after_maghrib, gender) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [tenantId, firstName.trim(), middleName?.trim() || null, lastName.trim(), phoneNumber?.trim() || null, email?.trim() || null, notes || null, bornAfterMaghrib || false, gender || null]
  );

  const contactId = contactRes.rows[0].id;

  // Insert events
  for (const ev of events) {
    await query(
      `INSERT INTO events (contact_id, event_type, g_day, g_month, g_year, h_day, h_month, h_year) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        contactId,
        ev.eventType,
        ev.gDay || null,
        ev.gMonth || null,
        ev.gYear || null,
        ev.hDay !== undefined ? ev.hDay : null,
        ev.hMonth !== undefined ? ev.hMonth : null,
        ev.hYear !== undefined ? ev.hYear : null,
      ]
    );
  }

  // Insert group mappings
  if (groupIds && groupIds.length > 0) {
    for (const gId of groupIds) {
      await query(
        `INSERT INTO contact_group_mappings (contact_id, group_id) VALUES ($1, $2)`,
        [contactId, gId]
      );
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');
  return { success: true, contactId };
}

/**
 * Updates an existing contact and replaces their events.
 */
export async function updateContact(
  contactId: string,
  formData: {
    firstName: string;
    middleName?: string;
    lastName: string;
    phoneNumber?: string;
    email?: string;
    notes?: string;
    bornAfterMaghrib?: boolean;
    groupIds?: string[];
    gender?: string;
    events: Array<{
      eventType: string;
      gDay?: number;
      gMonth?: number;
      gYear?: number;
      hDay?: number;
      hMonth?: number;
      hYear?: number;
    }>;
  }
) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { firstName, middleName, lastName, phoneNumber, email, notes, bornAfterMaghrib, groupIds, gender, events } = formData;

  // Verify ownership
  const check = await query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [contactId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  // Update contact details
  await query(
    `UPDATE contacts 
     SET first_name = $1, middle_name = $2, last_name = $3, phone_number = $4, email = $5, notes = $6, born_after_maghrib = $7, gender = $8 
     WHERE id = $9`,
    [firstName.trim(), middleName?.trim() || null, lastName.trim(), phoneNumber?.trim() || null, email?.trim() || null, notes || null, bornAfterMaghrib || false, gender || null, contactId]
  );

  // Clear existing events
  await query('DELETE FROM events WHERE contact_id = $1', [contactId]);

  // Re-insert events
  for (const ev of events) {
    await query(
      `INSERT INTO events (contact_id, event_type, g_day, g_month, g_year, h_day, h_month, h_year) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        contactId,
        ev.eventType,
        ev.gDay || null,
        ev.gMonth || null,
        ev.gYear || null,
        ev.hDay !== undefined ? ev.hDay : null,
        ev.hMonth !== undefined ? ev.hMonth : null,
        ev.hYear !== undefined ? ev.hYear : null,
      ]
    );
  }

  // Synchronize group mappings
  await query('DELETE FROM contact_group_mappings WHERE contact_id = $1', [contactId]);
  if (groupIds && groupIds.length > 0) {
    for (const gId of groupIds) {
      await query(
        `INSERT INTO contact_group_mappings (contact_id, group_id) VALUES ($1, $2)`,
        [contactId, gId]
      );
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');
  return { success: true };
}

/**
 * Deletes a contact (cascades automatically deletes associated events and relationships).
 */
export async function deleteContact(contactId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const check = await query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [contactId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  await query('DELETE FROM contacts WHERE id = $1', [contactId]);

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');
  return { success: true };
}

/**
 * Creates a relationship link (A is Spoused to/Parent of B).
 */
export async function addRelationship(contactAId: string, contactBId: string, type: 'spouse' | 'parent') {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify both contacts belong to tenant
  const check = await query(
    'SELECT id FROM contacts WHERE id IN ($1, $2) AND tenant_id = $3',
    [contactAId, contactBId, tenantId]
  );

  if (check.rows.length !== 2 && contactAId !== contactBId) {
    throw new Error('Invalid contacts selected.');
  }

  // Check duplicate
  const dup = await query(
    `SELECT id FROM relationships 
     WHERE tenant_id = $1 AND contact_a_id = $2 AND contact_b_id = $3 AND relation_type = $4`,
    [tenantId, contactAId, contactBId, type]
  );

  if (dup.rows.length > 0) {
    return { success: true };
  }

  await query(
    `INSERT INTO relationships (tenant_id, contact_a_id, contact_b_id, relation_type) 
     VALUES ($1, $2, $3, $4)`,
    [tenantId, contactAId, contactBId, type]
  );

  revalidatePath('/contacts');
  revalidatePath('/tree');
  return { success: true };
}

/**
 * Deletes a relationship link.
 */
export async function removeRelationship(relId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  await query('DELETE FROM relationships WHERE id = $1 AND tenant_id = $2', [relId, tenantId]);

  revalidatePath('/contacts');
  revalidatePath('/tree');
  return { success: true };
}

/**
 * Fetches all relationships for the tenant.
 */
export async function getRelationships() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    `SELECT DISTINCT r.id, r.contact_a_id, r.contact_b_id, r.relation_type,
            c1.first_name as a_first, c1.middle_name as a_middle, c1.last_name as a_last,
            c2.first_name as b_first, c2.middle_name as b_middle, c2.last_name as b_last
     FROM relationships r
     JOIN contacts c1 ON r.contact_a_id = c1.id
     JOIN contacts c2 ON r.contact_b_id = c2.id
     WHERE r.tenant_id = $1
        OR (
          r.tenant_id IN (
            SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END
            FROM tenant_connections
            WHERE (requester_id = $1 OR receiver_id = $1) AND status = 'accepted'
          )
          AND (c1.tenant_id = $1 OR c1.id IN (
            SELECT sc.contact_id FROM shared_contacts sc 
            JOIN tenant_connections tc ON sc.connection_id = tc.id
            WHERE tc.status = 'accepted' AND ((tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id))
          ))
          AND (c2.tenant_id = $1 OR c2.id IN (
            SELECT sc.contact_id FROM shared_contacts sc 
            JOIN tenant_connections tc ON sc.connection_id = tc.id
            WHERE tc.status = 'accepted' AND ((tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id))
          ))
        )`,
    [tenantId]
  );

  return res.rows;
}

/**
 * Bulk updates group tags for multiple contacts.
 */
export async function bulkCategorizeContacts(
  contactIds: string[],
  groupIds: string[],
  operation: 'add' | 'remove'
) {
  const session = await requireAuth();
  const tenantId = session.userId;

  if (!contactIds || contactIds.length === 0 || !groupIds || groupIds.length === 0) {
    return { success: true };
  }

  // 1. Verify contacts belong to the tenant
  const contactCheck = await query(
    'SELECT id FROM contacts WHERE id = ANY($1) AND tenant_id = $2',
    [contactIds, tenantId]
  );
  const verifiedContactIds = contactCheck.rows.map(r => r.id);

  if (verifiedContactIds.length === 0) {
    return { success: true };
  }

  // 2. Verify groups belong to the tenant
  const groupCheck = await query(
    'SELECT id FROM groups WHERE id = ANY($1) AND tenant_id = $2',
    [groupIds, tenantId]
  );
  const verifiedGroupIds = groupCheck.rows.map(r => r.id);

  if (verifiedGroupIds.length === 0) {
    throw new Error('Access denied: Invalid group selection.');
  }

  // 3. Perform the bulk operation
  if (operation === 'add') {
    for (const cId of verifiedContactIds) {
      for (const gId of verifiedGroupIds) {
        await query(
          `INSERT INTO contact_group_mappings (contact_id, group_id) 
           VALUES ($1, $2) 
           ON CONFLICT (contact_id, group_id) DO NOTHING`,
          [cId, gId]
        );
      }
    }
  } else if (operation === 'remove') {
    await query(
      `DELETE FROM contact_group_mappings 
       WHERE contact_id = ANY($1) AND group_id = ANY($2)`,
      [verifiedContactIds, verifiedGroupIds]
    );
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');

  return { success: true };
}

