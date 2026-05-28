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
 * Validates if a tenant exists by ID.
 */
export async function getTenantName(tenantId: string) {
  try {
    const res = await query('SELECT display_name FROM tenants WHERE id = $1', [tenantId]);
    if (res.rows.length === 0) return null;
    return res.rows[0].display_name;
  } catch (err) {
    return null;
  }
}

/**
 * Guest Action: Submits contact details for review.
 */
export async function submitGuestDetails(
  tenantId: string,
  guestData: {
    firstName: string;
    middleName?: string;
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
  const { firstName, middleName, lastName, phoneNumber, email, notes, events } = guestData;

  if (!firstName || !lastName) {
    throw new Error('First name and last name are required.');
  }

  // Validate tenant exists
  const tenantExists = await getTenantName(tenantId);
  if (!tenantExists) {
    throw new Error('Invalid invitation link.');
  }

  const eventData = JSON.stringify({
    email: email || null,
    notes: notes || null,
    events: events || []
  });

  await query(
    `INSERT INTO submissions (tenant_id, first_name, middle_name, last_name, phone_number, event_data, status) 
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [tenantId, firstName.trim(), middleName?.trim() || null, lastName.trim(), phoneNumber?.trim() || null, eventData]
  );

  return { success: true };
}

/**
 * Admin Action: Gets all pending submissions for the tenant.
 */
export async function getPendingSubmissions() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    `SELECT id, first_name, middle_name, last_name, phone_number, event_data, status, created_at 
     FROM submissions 
     WHERE tenant_id = $1 AND status = 'pending' 
     ORDER BY created_at DESC`,
    [tenantId]
  );

  return res.rows;
}

/**
 * Admin Action: Approves a guest submission, creating the contact and events in the main directory.
 */
export async function approveSubmission(
  submissionId: string,
  approvedData: {
    firstName: string;
    middleName?: string;
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

  // Validate submission belongs to tenant
  const subCheck = await query(
    'SELECT id FROM submissions WHERE id = $1 AND tenant_id = $2 AND status = \'pending\'',
    [submissionId, tenantId]
  );
  if (subCheck.rows.length === 0) {
    throw new Error('Submission not found or already processed.');
  }

  const { firstName, middleName, lastName, phoneNumber, email, notes, events } = approvedData;

  // 1. Create Contact
  const contactRes = await query(
    `INSERT INTO contacts (tenant_id, first_name, middle_name, last_name, phone_number, email, notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [tenantId, firstName.trim(), middleName?.trim() || null, lastName.trim(), phoneNumber?.trim() || null, email?.trim() || null, notes || null]
  );
  const contactId = contactRes.rows[0].id;

  // 2. Create Events
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

  // 3. Mark Submission Approved
  await query(
    'UPDATE submissions SET status = \'approved\' WHERE id = $1',
    [submissionId]
  );

  revalidatePath('/approvals');
  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');

  return { success: true };
}

/**
 * Admin Action: Rejects a guest submission.
 */
export async function rejectSubmission(submissionId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Validate submission
  const subCheck = await query(
    'SELECT id FROM submissions WHERE id = $1 AND tenant_id = $2 AND status = \'pending\'',
    [submissionId, tenantId]
  );
  if (subCheck.rows.length === 0) {
    throw new Error('Submission not found or already processed.');
  }

  await query(
    'UPDATE submissions SET status = \'rejected\' WHERE id = $1',
    [submissionId]
  );

  revalidatePath('/approvals');
  return { success: true };
}
