import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail, generateHtmlDigest } from '@/lib/mail';
import { getNextGregorianEvent, getNextHijriEvent } from '@/lib/hijri';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenantId = 'd2a05dd4-54e9-4d82-b414-2ae07945ee49'; // zakavi@gmail.com

    // 1. Fetch tenant email and display name
    const tenantRes = await query('SELECT email, display_name FROM tenants WHERE id = $1', [tenantId]);
    if (tenantRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 });
    }
    const tenant = tenantRes.rows[0];

    // 2. Fetch visible contacts
    const contactsRes = await query(
      `SELECT DISTINCT c.id, c.first_name, c.middle_name, c.last_name, c.phone_number, c.email, c.notes, c.tenant_id
       FROM contacts c
       WHERE c.tenant_id = $1
          OR c.id IN (
            SELECT sc.contact_id 
            FROM shared_contacts sc
            JOIN tenant_connections tc ON sc.connection_id = tc.id
            WHERE tc.status = 'accepted'
              AND (
                (tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR
                (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id)
              )
          )`,
      [tenantId]
    );

    // 3. Fetch visible events
    const eventsRes = await query(
      `SELECT e.id, e.contact_id, e.event_type, e.g_day, e.g_month, e.g_year, e.h_day, e.h_month, e.h_year 
       FROM events e 
       JOIN contacts c ON e.contact_id = c.id 
       WHERE c.tenant_id = $1
          OR c.id IN (
            SELECT sc.contact_id 
            FROM shared_contacts sc
            JOIN tenant_connections tc ON sc.connection_id = tc.id
            WHERE tc.status = 'accepted'
              AND (
                (tc.requester_id = $1 AND sc.shared_by = tc.receiver_id) OR
                (tc.receiver_id = $1 AND sc.shared_by = tc.requester_id)
              )
          )`,
      [tenantId]
    );

    const contacts = contactsRes.rows;
    const events = eventsRes.rows;

    // 4. Process event countdowns
    const reminders = events.map((event: any) => {
      const contact = contacts.find((c: any) => c.id === event.contact_id);
      if (!contact) return null;

      let calResult;
      if (event.event_type === 'birthday_gregorian' || event.event_type === 'anniversary' || event.event_type === 'death_gregorian') {
        calResult = getNextGregorianEvent(event.g_month, event.g_day, event.g_year);
      } else if (event.event_type === 'birthday_hijri' || event.event_type === 'death_hijri') {
        calResult = getNextHijriEvent(event.h_month, event.h_day, event.h_year);
      } else {
        return null;
      }

      return {
        eventType: event.event_type,
        daysRemaining: calResult.daysRemaining,
        ordinal: calResult.ordinal,
        contact
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

    const todayEvents = reminders.filter((r: any) => r.daysRemaining === 0);
    const upcomingEvents = reminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);

    // Send the email (forced manual test)
    const html = generateHtmlDigest(tenant.display_name, todayEvents, upcomingEvents);
    const subject = `Yaadi Reminders: Manual Test Digest`;

    const result = await sendEmail({
      to: tenant.email,
      subject,
      html
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId || null,
      error: result.error || null,
      recipient: tenant.email
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
