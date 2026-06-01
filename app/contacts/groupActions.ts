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
 * Fetches all custom groups for the logged-in tenant.
 */
export async function getGroups() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    'SELECT id, name, color, created_at FROM groups WHERE tenant_id = $1 ORDER BY name ASC',
    [tenantId]
  );
  return res.rows;
}

/**
 * Creates a new custom group for the workspace.
 */
export async function createGroup(name: string, color: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error('Group name is required.');
  }

  // Check duplicates
  const dup = await query(
    'SELECT id FROM groups WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)',
    [tenantId, cleanName]
  );
  if (dup.rows.length > 0) {
    throw new Error(`A group named "${cleanName}" already exists.`);
  }

  const res = await query(
    'INSERT INTO groups (tenant_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color',
    [tenantId, cleanName, color || '#C4953A']
  );

  revalidatePath('/contacts');
  return res.rows[0];
}

/**
 * Deletes a custom group (contact mappings and share links cascade automatically).
 */
export async function deleteGroup(groupId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const check = await query(
    'SELECT id FROM groups WHERE id = $1 AND tenant_id = $2',
    [groupId, tenantId]
  );
  if (check.rows.length === 0) {
    throw new Error('Group not found or access denied.');
  }

  await query('DELETE FROM groups WHERE id = $1', [groupId]);

  revalidatePath('/contacts');
  return { success: true };
}

/**
 * Retrieves the share link status and token for a group.
 */
export async function getGroupShareLink(groupId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify group ownership
  const groupCheck = await query(
    'SELECT id FROM groups WHERE id = $1 AND tenant_id = $2',
    [groupId, tenantId]
  );
  if (groupCheck.rows.length === 0) {
    throw new Error('Group not found or access denied.');
  }

  const res = await query(
    'SELECT id, is_active FROM group_share_links WHERE group_id = $1',
    [groupId]
  );

  if (res.rows.length === 0) {
    return null;
  }
  return res.rows[0];
}

/**
 * Toggles a group share link ON/OFF.
 */
export async function toggleGroupShareLink(groupId: string, isActive: boolean) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify group ownership
  const groupCheck = await query(
    'SELECT id FROM groups WHERE id = $1 AND tenant_id = $2',
    [groupId, tenantId]
  );
  if (groupCheck.rows.length === 0) {
    throw new Error('Group not found or access denied.');
  }

  // Check if link exists
  const existing = await query(
    'SELECT id FROM group_share_links WHERE group_id = $1',
    [groupId]
  );

  if (existing.rows.length === 0) {
    // Create new
    const res = await query(
      'INSERT INTO group_share_links (group_id, tenant_id, is_active) VALUES ($1, $2, $3) RETURNING id, is_active',
      [groupId, tenantId, isActive]
    );
    return res.rows[0];
  } else {
    // Update existing
    const res = await query(
      'UPDATE group_share_links SET is_active = $1 WHERE group_id = $2 RETURNING id, is_active',
      [isActive, groupId]
    );
    return res.rows[0];
  }
}
