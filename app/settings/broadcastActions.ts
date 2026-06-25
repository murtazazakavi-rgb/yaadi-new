'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { sendEmail } from '@/lib/mail';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

function generateRandomToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Gets the list of contacts who have valid email addresses.
 */
export async function getContactsWithEmailsCount() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    `SELECT COUNT(*)::integer as count 
     FROM contacts 
     WHERE tenant_id = $1 AND email IS NOT NULL AND email != ''`,
    [tenantId]
  );
  return res.rows[0]?.count || 0;
}

/**
 * Broadcasts feature announcement emails to all contacts or sends a sample test email to the owner.
 */
export async function sendBroadcastEmail({
  subject,
  bodyTemplate,
  origin,
  isTest = false
}: {
  subject: string;
  bodyTemplate: string;
  origin: string;
  isTest?: boolean;
}) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // 1. Fetch Owner's Tenant info
  const tenantRes = await query('SELECT email, display_name FROM tenants WHERE id = $1', [tenantId]);
  if (tenantRes.rows.length === 0) {
    throw new Error('Workspace not found.');
  }
  const { email: ownerEmail, display_name: ownerName } = tenantRes.rows[0];

  // 2. Handle Test Email
  if (isTest) {
    // Generate dummy details for a test email
    const dummyFirstName = 'TestRecipient';
    const dummyLastName = 'User';
    const dummyToken = 'sample-token-12345';
    const careCardLink = `${origin}/profile/${dummyToken}`;

    const interpolatedSubject = subject
      .replace(/{first_name}/g, dummyFirstName)
      .replace(/{last_name}/g, dummyLastName)
      .replace(/{workspace_name}/g, ownerName);

    const interpolatedBody = bodyTemplate
      .replace(/{first_name}/g, dummyFirstName)
      .replace(/{last_name}/g, dummyLastName)
      .replace(/{care_card_link}/g, careCardLink)
      .replace(/{workspace_name}/g, ownerName);

    const mailResult = await sendEmail({
      to: ownerEmail,
      subject: `[TEST] ${interpolatedSubject}`,
      html: `
        <div style="background-color: #f7f7f7; padding: 15px; border-bottom: 2px solid #ccc; font-family: sans-serif; font-size: 13px; color: #555;">
          <strong>This is a preview/test email sent to you before broadcasting to your contacts.</strong>
        </div>
        <div style="padding: 20px; font-family: sans-serif; line-height: 1.5;">
          ${interpolatedBody.replace(/\n/g, '<br/>')}
        </div>
      `
    });

    if (!mailResult.success) {
      throw new Error(mailResult.error || 'Failed to send test email.');
    }
    return { success: true, message: 'Test email successfully sent to your inbox!' };
  }

  // 3. Handle Actual Broadcast
  // Query all contacts with their emails and care card tokens
  const contactsRes = await query(
    `SELECT c.id, c.first_name, c.last_name, c.email, cc.token 
     FROM contacts c 
     LEFT JOIN care_cards cc ON c.id = cc.contact_id 
     WHERE c.tenant_id = $1 AND c.email IS NOT NULL AND c.email != ''`,
    [tenantId]
  );
  
  const contacts = contactsRes.rows;
  if (contacts.length === 0) {
    throw new Error('No contacts found with registered email addresses.');
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    let token = contact.token;
    
    // If contact does not have a care card token, generate one
    if (!token) {
      token = generateRandomToken();
      try {
        await query(
          `INSERT INTO care_cards (contact_id, token, status) 
           VALUES ($1, $2, 'not_started')
           ON CONFLICT (contact_id) DO UPDATE SET token = EXCLUDED.token`,
          [contact.id, token]
        );
      } catch (dbErr) {
        console.error('Failed to create care card token for contact:', contact.id, dbErr);
        failedCount++;
        continue;
      }
    }

    const careCardLink = `${origin}/profile/${token}`;

    const interpolatedSubject = subject
      .replace(/{first_name}/g, contact.first_name)
      .replace(/{last_name}/g, contact.last_name)
      .replace(/{workspace_name}/g, ownerName);

    const interpolatedBody = bodyTemplate
      .replace(/{first_name}/g, contact.first_name)
      .replace(/{last_name}/g, contact.last_name)
      .replace(/{care_card_link}/g, careCardLink)
      .replace(/{workspace_name}/g, ownerName);

    try {
      const mailResult = await sendEmail({
        to: contact.email,
        subject: interpolatedSubject,
        html: `
          <div style="padding: 20px; font-family: sans-serif; line-height: 1.5; color: #333;">
            ${interpolatedBody.replace(/\n/g, '<br/>')}
          </div>
        `
      });
      if (mailResult.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    } catch (mailErr) {
      console.error('Failed to send broadcast email to:', contact.email, mailErr);
      failedCount++;
    }
  }

  return { 
    success: true, 
    message: `Broadcast complete! Sent: ${sentCount}, Failed: ${failedCount}.` 
  };
}
