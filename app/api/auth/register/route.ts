import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { setSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await query('SELECT id FROM tenants WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // Encrypt the password using AES-256
    const passwordEncrypted = encrypt(password);

    // Create the tenant user
    const res = await query(
      'INSERT INTO tenants (email, password_encrypted, display_name, is_admin) VALUES ($1, $2, $3, $4) RETURNING *',
      [normalizedEmail, passwordEncrypted, displayName, false]
    );

    const newTenant = res.rows[0];

    // Log the user in
    await setSession({
      userId: newTenant.id,
      email: newTenant.email,
      display_name: newTenant.display_name,
      isAdmin: newTenant.is_admin,
    });

    return NextResponse.json({ success: true, user: { email: newTenant.email, display_name: newTenant.display_name, isAdmin: newTenant.is_admin } }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
