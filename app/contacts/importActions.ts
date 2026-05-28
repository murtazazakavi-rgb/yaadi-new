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

export async function bulkImportContacts(contactsList: any[]) {
  const session = await requireAuth();
  const tenantId = session.userId;

  let successCount = 0;
  const errors: { row: number; name: string; error: string }[] = [];

  for (let i = 0; i < contactsList.length; i++) {
    const rowNum = i + 2; // Row index 0 in list corresponds to Row 2 in CSV (Row 1 is headers)
    const row = contactsList[i];
    const name = `${row.firstName || ''} ${row.middleName ? row.middleName + ' ' : ''}${row.lastName || ''}`.trim();

    try {
      if (!row.firstName || !row.lastName) {
        throw new Error('First name and last name are required.');
      }

      // Insert contact
      const contactRes = await query(
        `INSERT INTO contacts (tenant_id, first_name, middle_name, last_name, phone_number, email, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          tenantId,
          row.firstName.trim(),
          row.middleName?.trim() || null,
          row.lastName.trim(),
          row.phoneNumber?.trim() || null,
          row.email?.trim() || null,
          row.notes?.trim() || null
        ]
      );

      const contactId = contactRes.rows[0].id;

      // Insert events
      if (row.events && Array.isArray(row.events)) {
        for (const ev of row.events) {
          await query(
            `INSERT INTO events (contact_id, event_type, g_day, g_month, g_year, h_day, h_month, h_year) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              contactId,
              ev.eventType,
              ev.gDay || null,
              ev.gMonth || null,
              ev.gYear || null,
              ev.hDay !== undefined && ev.hDay !== null ? parseInt(ev.hDay) : null,
              ev.hMonth !== undefined && ev.hMonth !== null ? parseInt(ev.hMonth) : null,
              ev.hYear !== undefined && ev.hYear !== null ? parseInt(ev.hYear) : null
            ]
          );
        }
      }

      successCount++;
    } catch (err: any) {
      errors.push({
        row: rowNum,
        name: name || `Row ${rowNum}`,
        error: err.message || 'Database error occurred'
      });
    }
  }

  revalidatePath('/contacts');
  revalidatePath('/dashboard');
  revalidatePath('/tree');

  return {
    success: true,
    successCount,
    errors
  };
}
