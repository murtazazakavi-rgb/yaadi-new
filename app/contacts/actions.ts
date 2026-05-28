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
  lastName: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
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

  const { firstName, lastName, phoneNumber, email, notes, events } = formData;

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required.');
  }

  // Insert contact
  const contactRes = await query(
    `INSERT INTO contacts (tenant_id, first_name, last_name, phone_number, email, notes) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [tenantId, firstName.trim(), lastName.trim(), phoneNumber?.trim() || null, email?.trim() || null, notes || null]
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
    lastName: string;
    phoneNumber?: string;
    email?: string;
    notes?: string;
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

  const { firstName, lastName, phoneNumber, email, notes, events } = formData;

  // Verify ownership
  const check = await query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [contactId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Contact not found or access denied.');
  }

  // Update contact details
  await query(
    `UPDATE contacts 
     SET first_name = $1, last_name = $2, phone_number = $3, email = $4, notes = $5 
     WHERE id = $6`,
    [firstName.trim(), lastName.trim(), phoneNumber?.trim() || null, email?.trim() || null, notes || null, contactId]
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
    `SELECT r.id, r.contact_a_id, r.contact_b_id, r.relation_type,
            c1.first_name as a_first, c1.last_name as a_last,
            c2.first_name as b_first, c2.last_name as b_last
     FROM relationships r
     JOIN contacts c1 ON r.contact_a_id = c1.id
     JOIN contacts c2 ON r.contact_b_id = c2.id
     WHERE r.tenant_id = $1`,
    [tenantId]
  );

  return res.rows;
}
