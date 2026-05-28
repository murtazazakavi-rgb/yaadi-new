'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/mail';

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

  // Validate tenant exists and get email/display_name
  const tenantRes = await query('SELECT email, display_name FROM tenants WHERE id = $1', [tenantId]);
  if (tenantRes.rows.length === 0) {
    throw new Error('Invalid invitation link.');
  }
  const { email: tenantEmail, display_name: tenantName } = tenantRes.rows[0];

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

  // Send email alert to the directory owner
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yaadi-five.vercel.app/';
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Approval Request</title>
        </head>
        <body style="background-color: #F6F5F2; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <div style="max-width: 500px; background-color: #ffffff; border: 1px solid #EAE8E2; border-radius: 12px; padding: 32px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            
            <!-- Header -->
            <div style="text-align: center; border-bottom: 1px solid #ECEBE6; padding-bottom: 20px; margin-bottom: 24px;">
              <div style="font-size: 26px; font-weight: 700; color: #3C3935; font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.5px;">
                Yaadi
              </div>
              <div style="font-size: 12px; color: #8C8984; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600;">
                New Entry Submitted
              </div>
            </div>

            <!-- Body -->
            <p style="font-size: 14px; color: #55514C; line-height: 1.6; margin-bottom: 24px;">
              Hello <strong>${tenantName}</strong>,
            </p>
            <p style="font-size: 14px; color: #55514C; line-height: 1.6; margin-bottom: 24px;">
              A new contact entry has been submitted for your directory: <strong>${firstName} ${lastName}</strong>.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}approvals" style="display: inline-block; background-color: #3C3935; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 6px; font-family: sans-serif;">
                Review and Approve Entry
              </a>
            </div>

            <!-- Footer -->
            <div style="margin-top: 32px; border-top: 1px solid #ECEBE6; padding-top: 16px; text-align: center; font-size: 11px; color: #8C8984;">
              This is an automated notification email from your Yaadi Family Directory.
              <br />
              <a href="${appUrl}" style="color: #8C8984; text-decoration: underline; margin-top: 6px; display: inline-block;">
                Manage your directory
              </a>
            </div>

          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: tenantEmail,
      subject: `New Approval Request: ${firstName} ${lastName}`,
      html: emailBody
    });
  } catch (emailErr) {
    console.error('Failed to send approval email notification:', emailErr);
  }

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
