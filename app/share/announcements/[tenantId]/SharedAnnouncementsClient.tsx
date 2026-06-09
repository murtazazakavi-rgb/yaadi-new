'use client';

import React, { useState, useEffect } from 'react';
import { HijriDate, getNextGregorianEvent, getNextHijriEvent, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Send, Calendar, Cake, ShieldCheck, Heart, MessageCircle, X } from 'lucide-react';
import Portal from '@/app/components/Portal';

interface SharedAnnouncementsClientProps {
  tenantId: string;
  initialData: {
    displayName: string;
    theme: string;
    uiStyle: string;
    contacts: any[];
    events: any[];
    templates: any[];
  };
}

export default function SharedAnnouncementsClient({ tenantId, initialData }: SharedAnnouncementsClientProps) {
  const { displayName, contacts, events, templates } = initialData;
  const [showModal, setShowModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  // Today Date Strings
  const [gregorianTodayStr, setGregorianTodayStr] = useState('');
  const [hijriTodayStr, setHijriTodayStr] = useState('');

  // 1. Dynamic Styling application based on Owner's Settings
  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme') || '';
    const originalDark = document.documentElement.classList.contains('dark');
    const originalStyle = document.documentElement.getAttribute('data-ui-style') || '';

    // Apply owner's workspace styles
    document.documentElement.setAttribute('data-theme', initialData.theme);
    if (initialData.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-ui-style', initialData.uiStyle);

    return () => {
      // Cleanup: Restore original visitor theme/style
      if (originalTheme) {
        document.documentElement.setAttribute('data-theme', originalTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      if (originalDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      if (originalStyle) {
        document.documentElement.setAttribute('data-ui-style', originalStyle);
      } else {
        document.documentElement.removeAttribute('data-ui-style');
      }
    };
  }, [initialData.theme, initialData.uiStyle]);

  // 2. Set Today's Dates
  useEffect(() => {
    const today = new Date();
    setGregorianTodayStr(
      today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    );
    const hDate = HijriDate.fromGregorian(today);
    setHijriTodayStr(`${hDate.day} ${HIJRI_MONTH_NAMES[hDate.month]} ${hDate.year}`);
  }, []);

  // Helper: ordinal suffix (1st, 2nd, etc)
  const getOrdinalSuffix = (num: number): string => {
    if (num <= 0) return '';
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  };

  // Identify passed away contacts
  const deceasedContactIds = new Set(
    events
      .filter((e: any) => e.event_type === 'death_gregorian' || e.event_type === 'death_hijri')
      .map((e: any) => e.contact_id)
  );

  // Process events
  const rawReminders = events.map((event: any) => {
    const contact = contacts.find((c: any) => c.id === event.contact_id);
    if (!contact) return null;

    let calResult;
    if (event.event_type === 'birthday_gregorian') {
      calResult = getNextGregorianEvent(event.g_month, event.g_day, event.g_year);
    } else if (event.event_type === 'anniversary') {
      calResult = getNextGregorianEvent(event.g_month, event.g_day, event.g_year);
    } else if (event.event_type === 'death_gregorian') {
      calResult = getNextGregorianEvent(event.g_month, event.g_day, event.g_year);
    } else if (event.event_type === 'birthday_hijri') {
      calResult = getNextHijriEvent(event.h_month, event.h_day, event.h_year);
    } else if (event.event_type === 'death_hijri') {
      calResult = getNextHijriEvent(event.h_month, event.h_day, event.h_year);
    } else {
      return null;
    }

    return {
      id: event.id,
      eventType: event.event_type,
      eventDate: calResult.date,
      daysRemaining: calResult.daysRemaining,
      ordinal: calResult.ordinal,
      contact,
      eventData: event
    };
  }).filter(Boolean);

  // Helper to group by contact
  const groupRemindersByContact = (remindersList: any[]) => {
    const groupedMap: { [contactId: string]: any } = {};
    remindersList.forEach((r: any) => {
      const cId = r.contact.id;
      if (!groupedMap[cId]) {
        groupedMap[cId] = {
          contact: r.contact,
          events: [],
          daysRemaining: r.daysRemaining,
          id: `${cId}-${r.eventType}`
        };
      }
      groupedMap[cId].events.push(r);
      if (r.daysRemaining < groupedMap[cId].daysRemaining) {
        groupedMap[cId].daysRemaining = r.daysRemaining;
      }
    });
    
    return Object.values(groupedMap).map((g: any) => {
      g.events.sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
      g.id = `${g.contact.id}-${g.events.map((e: any) => e.id).join('-')}`;
      return g;
    }).sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
  };

  const rawTodayEvents = rawReminders.filter((r: any) => r.daysRemaining === 0);
  const rawWeekEvents = rawReminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);

  const todayEvents = groupRemindersByContact(rawTodayEvents);
  const weekEvents = groupRemindersByContact(rawWeekEvents);

  const todayEventsCount = rawTodayEvents.length;

  const handleOpenWhatsAppComposer = (reminder: any) => {
    setSelectedReminder(reminder);

    const type = reminder.eventType;
    const name = `${reminder.contact.first_name}${reminder.contact.middle_name ? ' ' + reminder.contact.middle_name : ''} ${reminder.contact.last_name}`;
    const ordinalStr = getOrdinalSuffix(reminder.ordinal);

    const dbTemplate = templates.find((t: any) => t.event_type === type);
    
    let templateText = '';
    if (dbTemplate) {
      templateText = dbTemplate.message_body;
    } else {
      if (type === 'birthday_gregorian') {
        templateText = "Happy {ordinal} Birthday, {name}! Wishing you a wonderful year filled with love, laughter, and success.";
      } else if (type === 'birthday_hijri') {
        templateText = "Mubarak on your {ordinal} Waras, {name}! Wishing you a blessed year ahead filled with health and happiness.";
      } else if (type === 'anniversary') {
        templateText = "Wishing you both a very Happy {ordinal} Wedding Anniversary, {name}! May your love continue to grow stronger each day.";
      } else if (type === 'death_gregorian') {
        templateText = "Remembering {name} on their {ordinal} death anniversary today. You are forever in our hearts.";
      } else if (type === 'death_hijri') {
        templateText = "Remembering {name} on their {ordinal} Wafaat anniversary today. Sending our deepest thoughts and prayers.";
      }
    }

    const interpolated = templateText
      .replace(/{name}/g, name)
      .replace(/{ordinal}/g, ordinalStr)
      .replace(/{age}/g, reminder.ordinal.toString());

    setMessageText(interpolated);
    setShowModal(true);
  };

  const handleSendWhatsApp = () => {
    if (!selectedReminder) return;
    let phone = selectedReminder.contact.phone_number || '';
    phone = phone.replace(/[^0-9]/g, '');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    setShowModal(false);
  };

  const getEventLabel = (r: any): string => {
    const suffix = r.ordinal > 0 ? ` (${getOrdinalSuffix(r.ordinal)})` : '';
    switch (r.eventType) {
      case 'birthday_gregorian': return `Birthday${suffix}`;
      case 'birthday_hijri': return `Waras${suffix}`;
      case 'anniversary': return `Anniversary${suffix}`;
      case 'death_gregorian': return `Death Anniversary${suffix}`;
      case 'death_hijri': return `Wafaat Anniversary${suffix}`;
      default: return 'Event';
    }
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'birthday_gregorian': return 'badge-birthday';
      case 'birthday_hijri': return 'badge-waras';
      case 'anniversary': return 'badge-anniversary';
      default: return 'badge-death';
    }
  };

  const getInitials = (c: any) => {
    return `${c.first_name[0] || ''}${c.last_name[0] || ''}`.toUpperCase();
  };

  const maskPhoneNumber = (num?: string) => {
    if (!num) return 'No phone number';
    const clean = num.trim();
    if (clean.length < 5) return '••••';
    return `${clean.slice(0, 3)} •••• ••${clean.slice(-3)}`;
  };

  const formatDateDisplay = (r: any): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (r.eventType.includes('hijri')) {
      const shortHijriMonths = ['Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj'];
      return `${r.eventData.h_day} ${shortHijriMonths[r.eventData.h_month]}`;
    } else {
      return `${months[r.eventData.g_month - 1]} ${r.eventData.g_day}`;
    }
  };

  const getCountdownText = (days: number): string => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-primary)', 
      color: 'var(--text-primary)',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Top Header Card */}
        <div className="card" style={{ 
          margin: '0 0 24px 0', 
          padding: '24px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(197, 160, 89, 0.04) 100%)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-soft)',
          borderRadius: '16px'
        }}>
          <img src="/logo.png" alt="Yaadi Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain', margin: '0 auto 12px auto' }} />
          <h2 className="serif-font" style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)' }}>
            {displayName}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '500', marginBottom: '16px' }}>
            Family Announcements
          </p>

          <div style={{ 
            display: 'inline-flex', 
            flexDirection: 'column', 
            backgroundColor: 'var(--bg-primary)', 
            padding: '8px 16px', 
            borderRadius: '12px', 
            border: 'var(--border-light)',
            fontSize: '13px',
            gap: '2px'
          }}>
            <span style={{ fontWeight: '500' }}>{gregorianTodayStr}</span>
            <span style={{ color: 'var(--color-gold)', fontWeight: '600', fontSize: '12px' }}>{hijriTodayStr}</span>
          </div>
        </div>

        {/* TODAY'S CELEBRATIONS */}
        {todayEvents.length > 0 ? (
          <div className="card" style={{
            background: 'linear-gradient(135deg, #DDAE4F 0%, #C4953A 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '24px',
            margin: '0 0 24px 0',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(196, 149, 58, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '22px' }}>🎉</span>
              <h3 className="serif-font" style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700', margin: 0 }}>
                Today's Celebrations!
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayEvents.map((group: any) => (
                <div 
                  key={group.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                    padding: '14px', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(5px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-gradient" style={{ height: '32px', width: '32px', fontSize: '11px', flexShrink: 0, backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                      {getInitials(group.contact)}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {group.contact.first_name}{group.contact.middle_name ? ' ' + group.contact.middle_name : ''} {group.contact.last_name}
                      {deceasedContactIds.has(group.contact.id) && (
                        <span title="Passed Away" style={{ fontSize: '12px' }}>🤍</span>
                      )}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '42px' }}>
                    {group.events.map((r: any) => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.9 }}>
                          {getEventLabel(r)}
                        </span>
                        <button 
                          onClick={() => handleOpenWhatsAppComposer(r)}
                          className="btn btn-press"
                          style={{ 
                            width: 'auto', 
                            padding: '4px 12px', 
                            fontSize: '11px', 
                            backgroundColor: '#FFFFFF', 
                            color: '#C4953A',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            height: '26px'
                          }}
                        >
                          Send Dua
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* UPCOMING THIS WEEK */}
        <div style={{ marginBottom: '24px' }}>
          <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--color-sage)', fontWeight: '600', marginBottom: '12px', paddingLeft: '4px' }}>
            Upcoming This Week
          </h3>

          {weekEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {weekEvents.map((group: any) => (
                <div 
                  key={group.id} 
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    margin: 0,
                    borderRadius: '12px',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar-gradient" style={{ flexShrink: 0, height: '36px', width: '36px', fontSize: '12px' }}>
                      {getInitials(group.contact)}
                    </div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {group.contact.first_name}{group.contact.middle_name ? ' ' + group.contact.middle_name : ''} {group.contact.last_name}
                      {deceasedContactIds.has(group.contact.id) && (
                        <span title="Passed Away" style={{ fontSize: '12px' }}>🤍</span>
                      )}
                    </h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {group.events.map((r: any) => (
                      <div 
                        key={r.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          gap: '12px',
                          borderTop: group.events.indexOf(r) > 0 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                          paddingTop: group.events.indexOf(r) > 0 ? '8px' : '0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`badge ${getEventBadgeClass(r.eventType)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                            {getEventLabel(r)}
                          </span>
                          <span className="reminder-subtext" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
                          </span>
                        </div>
                        
                        <button 
                          className="btn-whatsapp btn-press" 
                          onClick={() => handleOpenWhatsAppComposer(r)}
                          style={{ width: 'auto', flexShrink: 0, padding: '4px 10px', fontSize: '11px', height: '26px' }}
                        >
                          <Send size={10} />
                          <span>Dua</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : todayEvents.length === 0 ? (
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center', margin: 0 }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🕊️</span>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                No events scheduled for this week. Keep your family in your thoughts and prayers!
              </p>
            </div>
          ) : (
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No other events this week.
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '32px', borderTop: 'var(--border-light)', paddingTop: '16px' }}>
          This page is private to family and friends. Created via Yaadi Family Directory.
        </p>
      </div>

      {/* WhatsApp Message Template Composer Drawer Modal */}
      {showModal && selectedReminder && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="serif-font" style={{ fontSize: '18px' }}>Send Blessings</h3>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="serif-font" style={{ fontSize: '15px', fontWeight: '600' }}>
                    {selectedReminder.contact.first_name}{selectedReminder.contact.middle_name ? ' ' + selectedReminder.contact.middle_name : ''} {selectedReminder.contact.last_name}
                  </span>
                  <span className={`badge ${getEventBadgeClass(selectedReminder.eventType)}`}>
                    {getEventLabel(selectedReminder)}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Phone: {maskPhoneNumber(selectedReminder.contact.phone_number)}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Message Draft</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '110px', resize: 'none', lineHeight: '1.5', fontFamily: 'inherit', fontSize: '13px' }}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleSendWhatsApp}
                disabled={!selectedReminder.contact.phone_number}
              >
                <MessageCircle size={15} /> 
                {selectedReminder.contact.phone_number ? 'Send via WhatsApp' : 'No Phone Number Saved'}
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
