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
