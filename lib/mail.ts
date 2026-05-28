import nodemailer from 'nodemailer';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || 'Yaadi Reminders <onboarding@resend.dev>';

  if (!host || !user || !pass) {
    console.warn('SMTP configuration is missing. Logged email content:');
    console.log(`To: ${to}\nSubject: ${subject}\nHTML Content Preview:\n${html.slice(0, 500)}...`);
    return { success: false, error: 'SMTP configuration is missing. Email details were logged to server console.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('Failed to send email via SMTP:', err);
    return { success: false, error: err.message || 'SMTP sending failed.' };
  }
}

export function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return num + 'st';
  if (j === 2 && k !== 12) return num + 'nd';
  if (j === 3 && k !== 13) return num + 'rd';
  return num + 'th';
}

export function getEventLabel(type: string, ordinal: number): string {
  const suffix = ordinal > 0 ? ` (${getOrdinalSuffix(ordinal)})` : '';
  switch (type) {
    case 'birthday_gregorian': return `Birthday${suffix}`;
    case 'birthday_hijri': return `Waras${suffix}`;
    case 'anniversary': return `Anniversary${suffix}`;
    case 'death_gregorian': return `Death Anniversary${suffix}`;
    case 'death_hijri': return `Wafaat Anniversary${suffix}`;
    default: return 'Event';
  }
}

export function getBadgeColors(type: string) {
  switch (type) {
    case 'birthday_gregorian':
      return { bg: '#E5F0FF', text: '#0E5ECA', label: 'Birthday' };
    case 'birthday_hijri':
      return { bg: '#EAF6EC', text: '#137333', label: 'Waras' };
    case 'anniversary':
      return { bg: '#FDF2F2', text: '#9B1C1C', label: 'Anniversary' };
    case 'death_gregorian':
    case 'death_hijri':
      return { bg: '#F3F4F6', text: '#4B5563', label: type === 'death_hijri' ? 'Wafaat' : 'Death' };
    default:
      return { bg: '#F3F4F6', text: '#4B5563', label: 'Event' };
  }
}

export function generateHtmlDigest(
  displayName: string,
  todayReminders: any[],
  upcomingReminders: any[]
): string {
  const todaySection = todayReminders.length === 0
    ? `<div style="padding: 16px; text-align: center; color: #8C8984; font-size: 14px; border: 1px dashed #ECEBE6; border-radius: 8px;">
         No family events scheduled for today.
       </div>`
    : todayReminders.map(r => {
        const name = `${r.contact.first_name}${r.contact.middle_name ? ' ' + r.contact.middle_name : ''} ${r.contact.last_name}`;
        const colors = getBadgeColors(r.eventType);
        return `
          <div style="background-color: #FAF9F6; border-left: 4px solid ${colors.text}; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="font-weight: 600; color: #3C3935; font-size: 16px; font-family: 'Playfair Display', Georgia, serif;">${name}</span>
              <span style="background-color: ${colors.bg}; color: ${colors.text}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px; font-family: sans-serif; text-transform: uppercase;">
                ${colors.label}
              </span>
            </div>
            <div style="font-size: 13px; color: #706D68; margin-top: 6px;">
              Celebrating today! This is their <strong>${getOrdinalSuffix(r.ordinal)}</strong> ${colors.label.toLowerCase()}.
            </div>
            ${r.contact.phone_number ? `
              <div style="margin-top: 10px;">
                <a href="https://wa.me/${r.contact.phone_number.replace(/[^0-9]/g, '')}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 4px; font-family: sans-serif;">
                  Send WhatsApp Greeting
                </a>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

  const upcomingSection = upcomingReminders.length === 0
    ? `<div style="padding: 12px; text-align: center; color: #8C8984; font-size: 13px;">
         No upcoming events in the next 7 days.
       </div>`
    : upcomingReminders.map(r => {
        const name = `${r.contact.first_name}${r.contact.middle_name ? ' ' + r.contact.middle_name : ''} ${r.contact.last_name}`;
        const colors = getBadgeColors(r.eventType);
        return `
          <div style="padding: 10px 0; border-bottom: 1px solid #F4F3EF; display: flex; justify-content: space-between; align-items: center; font-family: sans-serif;">
            <div>
              <div style="font-weight: 600; color: #3C3935; font-size: 14px;">${name}</div>
              <div style="font-size: 12px; color: #8C8984; margin-top: 2px;">
                ${getEventLabel(r.eventType, r.ordinal)}
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 12px; font-weight: 700; color: ${colors.text}; background-color: ${colors.bg}; padding: 2px 6px; border-radius: 4px;">
                In ${r.daysRemaining} days
              </span>
            </div>
          </div>
        `;
      }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Yaadi Reminders Digest</title>
      </head>
      <body style="background-color: #F6F5F2; margin: 0; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="max-width: 500px; background-color: #ffffff; border: 1px solid #EAE8E2; border-radius: 12px; padding: 32px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
          
          <!-- Header -->
          <div style="text-align: center; border-bottom: 1px solid #ECEBE6; padding-bottom: 20px; margin-bottom: 24px;">
            <div style="font-size: 26px; font-weight: 700; color: #3C3935; font-family: 'Playfair Display', Georgia, serif; letter-spacing: -0.5px;">
              Yaadi
            </div>
            <div style="font-size: 12px; color: #8C8984; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; font-weight: 600;">
              Daily Reminders Digest
            </div>
          </div>

          <!-- Intro -->
          <p style="font-size: 14px; color: #55514C; line-height: 1.6; margin-bottom: 24px;">
            Hello <strong>${displayName}</strong>, here is your digest of upcoming family events and reminders for today and the week ahead.
          </p>

          <!-- Today's Section -->
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #3C3935; border-bottom: 2px solid #EAE8E2; padding-bottom: 6px; margin-bottom: 12px; font-weight: 700;">
              Today's Events
            </h3>
            ${todaySection}
          </div>

          <!-- Upcoming Section -->
          <div>
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #3C3935; border-bottom: 2px solid #EAE8E2; padding-bottom: 6px; margin-bottom: 12px; font-weight: 700;">
              Upcoming (Next 7 Days)
            </h3>
            <div style="background-color: #FCFCFB; border: 1px solid #ECEBE6; border-radius: 8px; padding: 4px 16px;">
              ${upcomingSection}
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 32px; border-top: 1px solid #ECEBE6; padding-top: 16px; text-align: center; font-size: 11px; color: #8C8984;">
            This is an automated reminder email from your Yaadi Family Directory.
            <br />
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yaadi.com'}" style="color: #8C8984; text-decoration: underline; margin-top: 6px; display: inline-block;">
              Manage your directory
            </a>
          </div>

        </div>
      </body>
    </html>
  `;
}
