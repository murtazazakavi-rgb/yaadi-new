'use server';

import { getSession, setSession } from '@/lib/session';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { sendEmail } from '@/lib/mail';
import { revalidatePath } from 'next/cache';

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Access denied: Authentication required.');
  }
  return session;
}

/**
 * Fetches profile and reminder settings for the current workspace owner.
 */
export async function getSettingsData() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    'SELECT email, display_name, email_reminders_enabled, reminder_days_ahead, reminder_types FROM tenants WHERE id = $1',
    [tenantId]
  );

  if (res.rows.length === 0) {
    throw new Error('Workspace not found.');
  }

  const tenant = res.rows[0];
  return {
    email: tenant.email,
    displayName: tenant.display_name,
    emailRemindersEnabled: tenant.email_reminders_enabled,
    reminderDaysAhead: tenant.reminder_days_ahead,
    reminderTypes: tenant.reminder_types ? tenant.reminder_types.split(',') : []
  };
}

/**
 * Updates the display name of the workspace owner.
 */
export async function updateProfile(displayName: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  if (!displayName || !displayName.trim()) {
    throw new Error('Display Name cannot be empty.');
  }

  await query(
    'UPDATE tenants SET display_name = $1 WHERE id = $2',
    [displayName.trim(), tenantId]
  );

  // Update session
  await setSession({
    ...session,
    display_name: displayName.trim()
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Verifies current password and updates to the new password.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  if (!currentPassword || !newPassword) {
    throw new Error('Both current and new passwords are required.');
  }

  const tenantRes = await query('SELECT password_encrypted FROM tenants WHERE id = $1', [tenantId]);
  if (tenantRes.rows.length === 0) {
    throw new Error('Workspace not found.');
  }

  const storedEncrypted = tenantRes.rows[0].password_encrypted;
  const decryptedStored = decrypt(storedEncrypted);

  if (decryptedStored !== currentPassword) {
    throw new Error('Current password is incorrect.');
  }

  const newEncrypted = encrypt(newPassword);
  await query('UPDATE tenants SET password_encrypted = $1 WHERE id = $2', [newEncrypted, tenantId]);

  return { success: true };
}

/**
 * Updates reminder configurations.
 */
export async function updateReminderSettings(payload: {
  emailRemindersEnabled: boolean;
  reminderDaysAhead: number;
  reminderTypes: string[];
}) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { emailRemindersEnabled, reminderDaysAhead, reminderTypes } = payload;

  const reminderTypesStr = reminderTypes.join(',');

  await query(
    `UPDATE tenants 
     SET email_reminders_enabled = $1, reminder_days_ahead = $2, reminder_types = $3 
     WHERE id = $4`,
    [emailRemindersEnabled, reminderDaysAhead, reminderTypesStr, tenantId]
  );

  revalidatePath('/settings');
  return { success: true };
}

/**
 * Sends a test email to the workspace email to check SMTP status.
 */
export async function sendTestEmail() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const tenantRes = await query('SELECT email, display_name FROM tenants WHERE id = $1', [tenantId]);
  if (tenantRes.rows.length === 0) {
    throw new Error('Workspace not found.');
  }

  const { email: tenantEmail, display_name: displayName } = tenantRes.rows[0];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Yaadi SMTP Test Email</title>
      </head>
      <body style="background-color: #F6F5F2; margin: 0; padding: 40px 20px; font-family: sans-serif;">
        <div style="max-width: 500px; background-color: #ffffff; border: 1px solid #EAE8E2; border-radius: 12px; padding: 32px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          <h2 style="font-family: Georgia, serif; color: #3C3935; margin-bottom: 16px;">Yaadi SMTP Setup Verification</h2>
          <p style="font-size: 14px; color: #55514C; line-height: 1.6;">
            Hello <strong>${displayName}</strong>,
          </p>
          <p style="font-size: 14px; color: #55514C; line-height: 1.6;">
            This is a test email triggered from your Yaadi Family Directory settings page. If you are reading this message, your SMTP configuration is <strong>active and working correctly!</strong>
          </p>
          <div style="margin-top: 24px; padding: 12px; background-color: #FDF9F0; border-left: 4px solid #C5A059; border-radius: 4px; font-size: 13px; color: #7A5F29;">
            <strong>Test Timestamp:</strong> ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
    </html>
  `;

  const mailResult = await sendEmail({
    to: tenantEmail,
    subject: 'Yaadi SMTP Health Check: Test Success!',
    html
  });

  if (!mailResult.success) {
    throw new Error(mailResult.error || 'Failed to send SMTP test email.');
  }

  return { success: true };
}
