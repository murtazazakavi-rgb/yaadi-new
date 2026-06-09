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
 * Fetches all family documents for the logged-in tenant, joining linked contact name fields and attachment metadata.
 */
export async function getDocuments() {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    `SELECT d.*, c.first_name, c.middle_name, c.last_name,
            a.id AS attachment_id, a.file_name AS attachment_name, 
            a.file_type AS attachment_type, a.file_size AS attachment_size
     FROM family_documents d
     LEFT JOIN contacts c ON d.contact_id = c.id
     LEFT JOIN document_attachments a ON d.id = a.document_id
     WHERE d.tenant_id = $1
     ORDER BY d.expiry_date ASC NULLS LAST, d.created_at DESC`,
    [tenantId]
  );
  return res.rows;
}

/**
 * Creates a new family document reminder and optional file attachment.
 */
export async function createDocument(formData: {
  contactId?: string | null;
  documentType: string;
  documentNumber?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  reviewDate?: string | null;
  notes?: string;
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileContent: string; // base64 string
  } | null;
}) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { contactId, documentType, documentNumber, issueDate, expiryDate, reviewDate, notes, attachment } = formData;

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

  const documentId = res.rows[0].id;

  if (attachment) {
    await query(
      `INSERT INTO document_attachments (
        document_id, tenant_id, file_name, file_type, file_size, storage_key, file_content
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        documentId,
        tenantId,
        attachment.fileName,
        attachment.fileType,
        attachment.fileSize,
        `db://attachments/${documentId}`,
        attachment.fileContent
      ]
    );
  }

  revalidatePath('/documents');
  revalidatePath('/dashboard');
  revalidatePath('/calendar');
  return { success: true, documentId };
}

/**
 * Updates an existing family document reminder and optional file attachment.
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
    attachment?: {
      fileName: string;
      fileType: string;
      fileSize: number;
      fileContent: string; // base64 string
    } | null;
  }
) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const { contactId, documentType, documentNumber, issueDate, expiryDate, reviewDate, notes, attachment } = formData;

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

  if (attachment) {
    // Keep 1 attachment rule: delete previous attachment first
    await query('DELETE FROM document_attachments WHERE document_id = $1 AND tenant_id = $2', [docId, tenantId]);

    // Insert new attachment
    await query(
      `INSERT INTO document_attachments (
        document_id, tenant_id, file_name, file_type, file_size, storage_key, file_content
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        docId,
        tenantId,
        attachment.fileName,
        attachment.fileType,
        attachment.fileSize,
        `db://attachments/${docId}`,
        attachment.fileContent
      ]
    );
  }

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

/**
 * Deletes an attachment.
 */
export async function deleteAttachment(attachmentId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  // Verify ownership
  const check = await query('SELECT id FROM document_attachments WHERE id = $1 AND tenant_id = $2', [attachmentId, tenantId]);
  if (check.rows.length === 0) {
    throw new Error('Attachment not found or access denied.');
  }

  await query('DELETE FROM document_attachments WHERE id = $1', [attachmentId]);

  revalidatePath('/documents');
  return { success: true };
}

/**
 * Fetches the base64 content of an attachment for view/download.
 */
export async function getAttachmentContent(attachmentId: string) {
  const session = await requireAuth();
  const tenantId = session.userId;

  const res = await query(
    'SELECT file_content, file_name, file_type FROM document_attachments WHERE id = $1 AND tenant_id = $2',
    [attachmentId, tenantId]
  );

  if (res.rows.length === 0) {
    throw new Error('Attachment not found or access denied.');
  }

  return res.rows[0];
}

/**
 * Parses an uploaded document image/PDF to extract document fields via Gemini.
 */
export async function parseDocumentFile(base64DataUrl: string) {
  try {
    await requireAuth();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY environment variable is not configured. Please add it to your .env.local file.',
      };
    }

    if (!base64DataUrl) {
      return {
        success: false,
        error: 'No file data provided.',
      };
    }

    const base64Parts = base64DataUrl.split(';base64,');
    const base64Data = base64Parts[1] || base64Parts[0];
    const mimeType = base64Parts[0].split(':')[1] || 'image/jpeg';

    const systemInstruction = `
You are an expert OCR and data extraction assistant for a family document organizer app.
Your task is to analyze the uploaded document file (which could be an image of a passport, driver's license, national ID, insurance policy, etc.) and extract key fields into a structured JSON response.

Strictly return a JSON object with the following fields:
- "documentType": Must be one of the following string keys based on the document classification:
  * "passport" (for passports)
  * "visa" (for travel visas)
  * "driving_licence" (for driving licenses)
  * "aadhaar" (for Indian Aadhaar cards)
  * "pan" (for Indian PAN cards)
  * "vehicle_insurance" (for car/bike insurance policies)
  * "puc_certificate" (for vehicle pollution certificates)
  * "health_insurance" (for medical/health insurance)
  * "school_id" (for student/school/college IDs)
  * "rent_agreement" (for tenancy/rent agreements)
  * "national_id" (for general national or voter ID cards)
  * "other" (for any other type of document)
- "documentNumber": The primary identification/reference number of the document (string, or null if not found).
- "issueDate": The issue date of the document in exactly YYYY-MM-DD format (string, or null if not found).
- "expiryDate": The expiry date of the document in exactly YYYY-MM-DD format (string, or null if not found).
- "holderName": The full name of the document owner/holder if printed (string, or null if not found).
- "notes": A brief summary of other relevant details found on the document (e.g. date of birth, issuing country/state, address, vehicle details, or any other important metadata).

Do not output any markdown code blocks or text outside of the JSON. Output only the raw JSON.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `System Instructions:\n${systemInstruction}\n\nPerform OCR and extract document details from this uploaded file.` },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!parsedText) {
      throw new Error('No parsing result returned from Gemini API.');
    }

    const data = JSON.parse(parsedText.trim());

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Error parsing document with Gemini:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred while parsing the document.',
    };
  }
}
