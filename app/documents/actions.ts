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
 * Fetches all family documents for the logged-in tenant, joining linked contact name fields.
 */
export async function getDocuments() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    `SELECT d.*, c.first_name, c.middle_name, c.last_name
     FROM family_documents d
     LEFT JOIN contacts c ON d.contact_id = c.id
     WHERE d.tenant_id = $1
     ORDER BY d.expiry_date ASC NULLS LAST, d.created_at DESC`,
    [tenantId]
  );
  return res.rows;
}

/**
 * Creates a new family document reminder.
 */
export async function createDocument(formData: {
  contactId?: string | null;
  documentType: string;
  documentNumber?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  reviewDate?: string | null;
  notes?: string;
}) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { contactId, documentType, documentNumber, issueDate, expiryDate, reviewDate, notes } = formData;

  if (!documentType) {
    throw new Error('Document type is required.');
  }

  const res = await query(
    `INSERT INTO family_documents (
      tenant_id, contact_id, document_type, document_number, 
      issue_date, expiry_date, review_date, notes, is_archived
     ) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) RETURNING id`,
    [
      tenantId,
      contactId || null,
      documentType.trim(),
      documentNumber?.trim() || null,
      issueDate || null,
      expiryDate || null,
      reviewDate || null,
      notes?.trim() || null
    ]
  );

  revalidatePath('/documents');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  return { success: true, documentId: res.rows[0].id };
}

/**
 * Updates an existing family document reminder.
 */
export async function updateDocument(
  docId: string,
  formData: {
    contactId?: string | null;
    documentType: string;
    documentNumber?: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    reviewDate?: string | null;
    notes?: string;
  }
) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { contactId, documentType, documentNumber, issueDate, expiryDate, reviewDate, notes } = formData;

  if (!documentType) {
    throw new Error('Document type is required.');
  }

  // Verify ownership
  const check = await query('SELECT id FROM family_documents WHERE id = $1 AND tenant_id = $2', [docId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Document not found or access denied.');
  }

  await query(
    `UPDATE family_documents
     SET contact_id = $1, 
         document_type = $2, 
         document_number = $3, 
         issue_date = $4, 
         expiry_date = $5, 
         review_date = $6, 
         notes = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8`,
    [
      contactId || null,
      documentType.trim(),
      documentNumber?.trim() || null,
      issueDate || null,
      expiryDate || null,
      reviewDate || null,
      notes?.trim() || null,
      docId
    ]
  );

  revalidatePath('/documents');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  return { success: true };
}

/**
 * Deletes a family document.
 */
export async function deleteDocument(docId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const check = await query('SELECT id FROM family_documents WHERE id = $1 AND tenant_id = $2', [docId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Document not found or access denied.');
  }

  await query('DELETE FROM family_documents WHERE id = $1', [docId]);

  revalidatePath('/documents');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  return { success: true };
}

/**
 * Archives or restores a family document.
 */
export async function toggleArchiveDocument(docId: string, isArchived: boolean) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const check = await query('SELECT id FROM family_documents WHERE id = $1 AND tenant_id = $2', [docId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Document not found or access denied.');
  }

  await query('UPDATE family_documents SET is_archived = $1 WHERE id = $2', [isArchived, docId]);

  revalidatePath('/documents');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  return { success: true };
}
