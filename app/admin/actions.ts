'use server';

import { getSession } from '@/lib/session';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

/**
 * Ensures the caller is authenticated as an admin.
 */
async function requireAdmin() {
  const session = await getSession();
  if (!session || !session.isAdmin) {
    throw new Error('Access denied: Admin privileges required.');
  }
  return session;
}

/**
 * Fetches all tenant users from the database.
 */
export async function getTenants() {
  await requireAdmin();
  const res = await query('SELECT id, email, password_encrypted, display_name, is_admin, created_at FROM tenants ORDER BY created_at DESC');
  return res.rows;
}

/**
 * Creates a new tenant user account.
 */
export async function createTenant(formData: { email: string; displayName: string; password: string }) {
  await requireAdmin();
  const { email, displayName, password } = formData;

  if (!email || !displayName || !password) {
    throw new Error('All fields are required.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate
  const check = await query('SELECT id FROM tenants WHERE email = $1', [normalizedEmail]);
  if (check.rows.length > 0) {
    throw new Error('Email is already registered.');
  }

  const passwordEncrypted = encrypt(password);

  await query(
    'INSERT INTO tenants (email, password_encrypted, display_name, is_admin) VALUES ($1, $2, $3, $4)',
    [normalizedEmail, passwordEncrypted, displayName, false]
  );

  revalidatePath('/admin');
}

/**
 * Decrypts an encrypted password string.
 */
export async function decryptPassword(encryptedText: string) {
  await requireAdmin();
  return decrypt(encryptedText);
}

/**
 * Fetches all contacts from all tenants, including events and tenant names.
 */
export async function getAllSystemContacts() {
  await requireAdmin();
  
  const res = await query(`
    SELECT 
      c.id, 
      c.first_name, 
      c.middle_name, 
      c.last_name, 
      c.phone_number, 
      c.email, 
      c.notes,
      c.tenant_id,
      c.born_after_maghrib,
      t.display_name as added_by,
      e.id as event_id,
      e.event_type,
      e.g_day, e.g_month, e.g_year,
      e.h_day, e.h_month, e.h_year
    FROM contacts c
    LEFT JOIN tenants t ON c.tenant_id = t.id
    LEFT JOIN events e ON c.id = e.contact_id
    ORDER BY t.display_name, c.last_name, c.first_name
  `);

  // Group events by contact id
  const contactsMap: { [key: string]: any } = {};
  
  for (const row of res.rows) {
    if (!contactsMap[row.id]) {
      contactsMap[row.id] = {
        id: row.id,
        first_name: row.first_name,
        middle_name: row.middle_name,
        last_name: row.last_name,
        phone_number: row.phone_number,
        email: row.email,
        notes: row.notes,
        tenant_id: row.tenant_id,
        born_after_maghrib: row.born_after_maghrib,
        added_by: row.added_by || 'Unknown Workspace',
        events: []
      };
    }
    if (row.event_id) {
      contactsMap[row.id].events.push({
        id: row.event_id,
        event_type: row.event_type,
        g_day: row.g_day,
        g_month: row.g_month,
        g_year: row.g_year,
        h_day: row.h_day,
        h_month: row.h_month,
        h_year: row.h_year
      });
    }
  }

  return Object.values(contactsMap);
}
