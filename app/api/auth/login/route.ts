import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { setSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query tenant
    const res = await query('SELECT * FROM tenants WHERE email = $1', [normalizedEmail]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const tenant = res.rows[0];

    // Decrypt and compare password
    const decryptedPassword = decrypt(tenant.password_encrypted);
    if (decryptedPassword !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Set secure session cookie
    await setSession({
      userId: tenant.id,
      email: tenant.email,
      display_name: tenant.display_name,
      isAdmin: tenant.is_admin,
    });

    return NextResponse.json({ success: true, user: { email: tenant.email, display_name: tenant.display_name, isAdmin: tenant.is_admin } });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
