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

export async function getConnections() {
  const session = await requireAuth();
  const userId = session.userId;

  // Outgoing pending requests
  const outgoingRes = await query(
    `SELECT tc.id, tc.status, tc.created_at, t.email, t.display_name
     FROM tenant_connections tc
     JOIN tenants t ON tc.receiver_id = t.id
     WHERE tc.requester_id = $1 AND tc.status = 'pending'
     ORDER BY tc.created_at DESC`,
    [userId]
  );

  // Incoming pending requests
  const incomingRes = await query(
    `SELECT tc.id, tc.status, tc.created_at, t.email, t.display_name
     FROM tenant_connections tc
     JOIN tenants t ON tc.requester_id = t.id
     WHERE tc.receiver_id = $1 AND tc.status = 'pending'
     ORDER BY tc.created_at DESC`,
    [userId]
  );

  // Active connections
  const activeRes = await query(
    `SELECT tc.id, tc.status, tc.created_at,
            CASE 
              WHEN tc.requester_id = $1 THEN t_rec.email 
              ELSE t_req.email 
            END as email,
            CASE 
              WHEN tc.requester_id = $1 THEN t_rec.display_name 
              ELSE t_req.display_name 
            END as display_name,
            CASE 
              WHEN tc.requester_id = $1 THEN t_rec.id 
              ELSE t_req.id 
            END as target_user_id
     FROM tenant_connections tc
     LEFT JOIN tenants t_req ON tc.requester_id = t_req.id
     LEFT JOIN tenants t_rec ON tc.receiver_id = t_rec.id
     WHERE (tc.requester_id = $1 OR tc.receiver_id = $1) AND tc.status = 'accepted'
     ORDER BY tc.created_at DESC`,
    [userId]
  );

  return {
    outgoing: outgoingRes.rows,
    incoming: incomingRes.rows,
    active: activeRes.rows,
  };
}

export async function sendConnectionRequest(email: string) {
  const session = await requireAuth();
  const userId = session.userId;

  const targetEmail = email.toLowerCase().trim();

  if (targetEmail === session.email.toLowerCase().trim()) {
    throw new Error('You cannot connect with yourself.');
  }

  // Find target tenant
  const targetRes = await query('SELECT id FROM tenants WHERE LOWER(email) = $1', [targetEmail]);
  if (targetRes.rows.length === 0) {
    throw new Error('User not found with this email.');
  }

  const targetId = targetRes.rows[0].id;

  // Check if connection already exists
  const existRes = await query(
    `SELECT id, requester_id, status FROM tenant_connections 
     WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
    [userId, targetId]
  );

  if (existRes.rows.length > 0) {
    const conn = existRes.rows[0];
    if (conn.status === 'accepted') {
      throw new Error('You are already connected with this user.');
    } else if (conn.requester_id === userId) {
      throw new Error('You have already sent a pending request to this user.');
    } else {
      throw new Error('This user has already sent you a request. Please accept it instead.');
    }
  }

  // Create connection
  await query(
    'INSERT INTO tenant_connections (requester_id, receiver_id, status) VALUES ($1, $2, \'pending\')',
    [userId, targetId]
  );

  revalidatePath('/connections');
  return { success: true };
}

export async function respondToConnectionRequest(requestId: string, accept: boolean) {
  const session = await requireAuth();
  const userId = session.userId;

  // Verify the request is meant for the logged-in user
  const checkRes = await query(
    'SELECT id, requester_id FROM tenant_connections WHERE id = $1 AND receiver_id = $2',
    [requestId, userId]
  );

  if (checkRes.rows.length === 0) {
    throw new Error('Request not found or access denied.');
  }

  if (accept) {
    await query('UPDATE tenant_connections SET status = \'accepted\' WHERE id = $1', [requestId]);
  } else {
    await query('DELETE FROM tenant_connections WHERE id = $1', [requestId]);
  }

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/contacts');
  revalidatePath('/tree');
  return { success: true };
}

export async function removeConnection(connectionId: string) {
  const session = await requireAuth();
  const userId = session.userId;

  // Verify the connection belongs to the user
  const checkRes = await query(
    'SELECT id FROM tenant_connections WHERE id = $1 AND (requester_id = $2 OR receiver_id = $3)',
    [connectionId, userId, userId]
  );

  if (checkRes.rows.length === 0) {
    throw new Error('Connection not found or access denied.');
  }

  // Delete connection (shared_contacts will be deleted via ON DELETE CASCADE)
  await query('DELETE FROM tenant_connections WHERE id = $1', [connectionId]);

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/contacts');
  revalidatePath('/tree');
  return { success: true };
}

export async function getSharingStatus(connectionId: string) {
  const session = await requireAuth();
  const userId = session.userId;

  // Fetch current user's contacts
  const contactsRes = await query(
    'SELECT id, first_name, last_name FROM contacts WHERE tenant_id = $1 ORDER BY first_name ASC',
    [userId]
  );

  // Fetch currently shared contacts for this connection
  const sharedRes = await query(
    'SELECT contact_id FROM shared_contacts WHERE connection_id = $1 AND shared_by = $2',
    [connectionId, userId]
  );

  const sharedIds = new Set(sharedRes.rows.map(row => row.contact_id));

  const contactsList = contactsRes.rows.map(c => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    isShared: sharedIds.has(c.id)
  }));

  return contactsList;
}

export async function updateSharedContacts(connectionId: string, contactIds: string[]) {
  const session = await requireAuth();
  const userId = session.userId;

  // Verify connection belongs to the user
  const checkRes = await query(
    'SELECT id FROM tenant_connections WHERE id = $1 AND (requester_id = $2 OR receiver_id = $3) AND status = \'accepted\'',
    [connectionId, userId, userId]
  );

  if (checkRes.rows.length === 0) {
    throw new Error('Connection not found or access denied.');
  }

  // Clear existing shared contacts by this user for this connection
  await query('DELETE FROM shared_contacts WHERE connection_id = $1 AND shared_by = $2', [connectionId, userId]);

  // Insert newly selected shared contacts
  for (const contactId of contactIds) {
    // Verify contact belongs to the user
    const contactCheck = await query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [contactId, userId]);
    if (contactCheck.rows.length > 0) {
      await query(
        'INSERT INTO shared_contacts (connection_id, contact_id, shared_by) VALUES ($1, $2, $3)',
        [connectionId, contactId, userId]
      );
    }
  }

  revalidatePath('/connections');
  revalidatePath('/dashboard');
  revalidatePath('/contacts');
  revalidatePath('/tree');
  return { success: true };
}
