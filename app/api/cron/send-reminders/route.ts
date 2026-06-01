import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail, generateHtmlDigest } from '@/lib/mail';
import { getNextGregorianEvent, getNextHijriEvent } from '@/lib/hijri';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerKey = searchParams.get('key');
    const forceSend = searchParams.get('force') === 'true';

    // Verify security secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      if (triggerKey !== cronSecret && bearerToken !== cronSecret) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    // Fetch all tenants with email reminder preferences
    const tenantsRes = await query('SELECT id, email, display_name, email_reminders_enabled, reminder_days_ahead, reminder_types FROM tenants');
    const tenants = tenantsRes.rows;

    const summaryResults: any[] = [];

    for (const tenant of tenants) {
      // Skip if email reminders are disabled for this tenant
      if (tenant.email_reminders_enabled === false) {
        continue;
      }

      // Parse enabled event types
      const enabledTypes = tenant.reminder_types 
        ? tenant.reminder_types.split(',') 
        : ['birthday_gregorian', 'birthday_hijri', 'anniversary', 'death_gregorian', 'death_hijri'];

      // 1. Fetch visible contacts
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
        [tenant.id]
      );

      // 2. Fetch visible events
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
        [tenant.id]
      );

      const contacts = contactsRes.rows;
      const events = eventsRes.rows;

      // 3. Process events to reminders
      const reminders = events.map((event: any) => {
        // Skip if event type is not enabled
        if (!enabledTypes.includes(event.event_type)) {
          return null;
        }

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
      const daysAhead = tenant.reminder_days_ahead !== null && tenant.reminder_days_ahead !== undefined 
        ? tenant.reminder_days_ahead 
        : 7;
      const upcomingEvents = reminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= daysAhead);

      // Only send if there's at least one event today, or if forceSend override is active (e.g. testing)
      if (todayEvents.length > 0 || forceSend) {
        const html = generateHtmlDigest(tenant.display_name, todayEvents, upcomingEvents);
        const subject = todayEvents.length > 0 
          ? `Yaadi Reminders: Family Events Today! (${todayEvents.length})`
          : `Yaadi Reminders: Weekly Digest Preview`;

        const mailResult = await sendEmail({
          to: tenant.email,
          subject,
          html
        });

        summaryResults.push({
          tenantEmail: tenant.email,
          todayCount: todayEvents.length,
          upcomingCount: upcomingEvents.length,
          sent: mailResult.success,
          error: mailResult.error || null
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedTenants: summaryResults
    });
  } catch (err: any) {
    console.error('Error in send-reminders API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
