'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from './actions';
import { HijriDate, getNextGregorianEvent, getNextHijriEvent, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, Send, Calendar, Cake, ShieldCheck, Heart, UserMinus, MessageCircle, X, Clock, BarChart3, Award } from 'lucide-react';
import Portal from '@/app/components/Portal';

export default function DashboardPage() {
  const [data, setData] = useState<any>({ contacts: [], events: [], templates: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  // Current Date Strings
  const [gregorianTodayStr, setGregorianTodayStr] = useState('');
  const [hijriTodayStr, setHijriTodayStr] = useState('');

  // Added States for Countdown and Analytics Tab
  const [activeTab, setActiveTab] = useState<'events' | 'insights'>('events');
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [insightCalendarType, setInsightCalendarType] = useState<'gregorian' | 'hijri'>('gregorian');

  useEffect(() => {
    const today = new Date();
    setGregorianTodayStr(
      today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    );
    const hDate = HijriDate.fromGregorian(today);
    setHijriTodayStr(`${hDate.day} ${HIJRI_MONTH_NAMES[hDate.month]} ${hDate.year}`);

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  // Helper to format ordinal numbers (e.g. 28th, 1st, 2nd)
  const getOrdinalSuffix = (num: number): string => {
    if (num <= 0) return '';
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  };

  // Identify passed away contacts (any contact with a death event)
  const deceasedContactIds = new Set(
    data.events
      .filter((e: any) => e.event_type === 'death_gregorian' || e.event_type === 'death_hijri')
      .map((e: any) => e.contact_id)
  );

  // Process all events and calculate countdowns
  const allCalculatedReminders = data.events.map((event: any) => {
    const contact = data.contacts.find((c: any) => c.id === event.contact_id);
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
  })
  .filter(Boolean);

  // Find next closest upcoming event
  const absoluteUpcoming = allCalculatedReminders
    .filter((r: any) => r && r.daysRemaining >= 0)
    .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);
  const nextEvent = absoluteUpcoming[0];

  // Filter raw reminders by search query for UI lists
  const rawReminders = allCalculatedReminders
    .filter((r: any) => {
      const name = `${r.contact.first_name}${r.contact.middle_name ? ' ' + r.contact.middle_name : ''} ${r.contact.last_name}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });

  const livingReminders = rawReminders.filter((r: any) => !deceasedContactIds.has(r.contact.id));
  const deceasedReminders = rawReminders.filter((r: any) => deceasedContactIds.has(r.contact.id));

  // Real-time Countdown Timer Effect
  useEffect(() => {
    if (!nextEvent) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const eventDate = new Date(nextEvent.eventDate);
      eventDate.setHours(0, 0, 0, 0); // start of day

      const diffMs = eventDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextEvent?.id, nextEvent?.eventDate]);

  // Insights Stats
  const insights = React.useMemo(() => {
    if (!data.contacts || data.contacts.length === 0) {
      return { totalContacts: 0, avgAge: 0, gMonthCounts: Array(12).fill(0), hMonthCounts: Array(12).fill(0), mostCommonGMonth: 'N/A', landmarks: [] };
    }

    const totalContacts = data.contacts.length;
    
    // Average Age
    let totalAge = 0;
    let ageCount = 0;
    const currentYear = new Date().getFullYear();
    const currentHYear = HijriDate.fromGregorian(new Date()).year;

    data.events.forEach((e: any) => {
      if (e.event_type === 'birthday_gregorian' && e.g_year) {
        totalAge += (currentYear - e.g_year);
        ageCount++;
      } else if (e.event_type === 'birthday_hijri' && e.h_year) {
        totalAge += (currentHYear - e.h_year);
        ageCount++;
      }
    });
    const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;

    // Month distribution
    const gMonthCounts = Array(12).fill(0);
    const hMonthCounts = Array(12).fill(0);

    data.events.forEach((e: any) => {
      if (e.event_type === 'birthday_gregorian' && e.g_month) {
        gMonthCounts[e.g_month - 1]++;
      } else if (e.event_type === 'birthday_hijri' && e.h_month !== undefined && e.h_month !== null) {
        hMonthCounts[e.h_month]++;
      }
    });

    // Most common birth month
    let maxGMonth = 0;
    let maxGCount = 0;
    gMonthCounts.forEach((count, idx) => {
      if (count > maxGCount) {
        maxGCount = count;
        maxGMonth = idx;
      }
    });
    const gMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mostCommonGMonth = maxGCount > 0 ? `${gMonthNames[maxGMonth]} (${maxGCount} events)` : 'N/A';

    // Landmark Celebrations (1st, 10th, 25th, 50th, 60th, 70th, 75th, 80th, 90th)
    const landmarkYears = [1, 10, 25, 50, 60, 70, 75, 80, 90];
    const landmarks = allCalculatedReminders
      .filter((r: any) => r && landmarkYears.includes(r.ordinal) && r.daysRemaining <= 180 && !deceasedContactIds.has(r.contact.id))
      .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

    return {
      totalContacts,
      avgAge,
      gMonthCounts,
      hMonthCounts,
      mostCommonGMonth,
      landmarks
    };
  }, [data.contacts, data.events, allCalculatedReminders, deceasedContactIds]);

  // Helper to group reminders by contact within each timeframe
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

  // Group events and then combine duplicate contacts within each group
  const rawTodayEvents = rawReminders.filter((r: any) => r.daysRemaining === 0);
  const rawWeekEvents = rawReminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);
  const rawMonthEvents = livingReminders.filter((r: any) => r.daysRemaining > 7 && r.daysRemaining <= 30);
  const rawLaterEvents = livingReminders.filter((r: any) => r.daysRemaining > 30);

  const todayEvents = groupRemindersByContact(rawTodayEvents);
  const weekEvents = groupRemindersByContact(rawWeekEvents);
  const monthEvents = groupRemindersByContact(rawMonthEvents);
  const laterEvents = groupRemindersByContact(rawLaterEvents);

  const deceasedEvents = groupRemindersByContact(deceasedReminders);

  const todayEventsCount = rawTodayEvents.length;

  // Open WhatsApp template composer
  const handleOpenWhatsAppComposer = (reminder: any) => {
    setSelectedReminder(reminder);

    const type = reminder.eventType;
    const name = `${reminder.contact.first_name}${reminder.contact.middle_name ? ' ' + reminder.contact.middle_name : ''} ${reminder.contact.last_name}`;
    const ordinalStr = getOrdinalSuffix(reminder.ordinal);

    // Look for custom template in database
    const dbTemplate = data.templates.find((t: any) => t.event_type === type);
    
    let templateText = '';
    if (dbTemplate) {
      templateText = dbTemplate.message_body;
    } else {
      // Default templates
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

    // Interpolate template placeholders
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
    // Format phone: remove spaces, dashes, parentheses
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

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading your dashboard...
      </div>
    );
  }

  // Stats Counters
  const next30DaysCount = livingReminders.filter((r: any) => r.daysRemaining <= 30).length;

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Welcome Greeting Section */}
      <div className="welcome-section" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="welcome-title serif-font">
            Assalamu Alaikum!
          </h2>
          <div className="welcome-dates">
            <span>{gregorianTodayStr}</span>
            <span className="welcome-hijri-date">{hijriTodayStr}</span>
          </div>
        </div>
      </div>

      {/* Pending Action Alerts */}
      {data.pendingApprovalsCount > 0 && (
        <div className="card page-transition" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(197, 160, 89, 0.08) 100%)',
          border: '1px solid rgba(197, 160, 89, 0.25)',
          padding: '16px',
          margin: '0 16px 16px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📝</span>
            <div>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Pending Contact Submissions
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {data.pendingApprovalsCount} new {data.pendingApprovalsCount === 1 ? 'entry is' : 'entries are'} waiting for your approval.
              </span>
            </div>
          </div>
          <a 
            href="/approvals" 
            className="btn btn-secondary btn-press" 
            style={{ width: 'auto', padding: '6px 14px', fontSize: '11px', height: '30px' }}
          >
            Review
          </a>
        </div>
      )}

      {data.pendingConnectionsCount > 0 && (
        <div className="card page-transition" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(107, 142, 110, 0.08) 100%)',
          border: '1px solid rgba(107, 142, 110, 0.25)',
          padding: '16px',
          margin: '0 16px 16px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🤝</span>
            <div>
              <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                Directory Sharing Request
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                You have {data.pendingConnectionsCount} incoming connection {data.pendingConnectionsCount === 1 ? 'request' : 'requests'} pending response.
              </span>
            </div>
          </div>
          <a 
            href="/connections" 
            className="btn btn-secondary btn-press" 
            style={{ width: 'auto', padding: '6px 14px', fontSize: '11px', height: '30px', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', borderColor: 'rgba(107, 142, 110, 0.2)' }}
          >
            View
          </a>
        </div>
      )}

      {/* Stats Board */}
      <div className="stats-board">
        <div className="card stats-card">
          <span className="stats-label">Total Directory</span>
          <span className="serif-font stats-value value-sage">{data.contacts.length}</span>
        </div>
        <div className="card stats-card">
          <span className="stats-label">Next 30 Days</span>
          <span className="serif-font stats-value value-gold">{next30DaysCount}</span>
        </div>
      </div>

      {/* Real-time Countdown Widget */}
      {nextEvent && timeLeft && (
        <div className="card next-up-card" style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(197, 160, 89, 0.05) 100%)',
          border: '1px solid rgba(197, 160, 89, 0.3)',
          padding: '20px',
          margin: '0 16px 20px 16px',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-soft)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚡ Next Event Countdown
            </span>
            <span className={`badge ${getEventBadgeClass(nextEvent.eventType)}`} style={{ fontSize: '10px' }}>
              {getEventLabel(nextEvent)}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-gradient" style={{ height: '44px', width: '44px', fontSize: '14px', flexShrink: 0 }}>
                {getInitials(nextEvent.contact)}
              </div>
              <div>
                <h4 className="serif-font" style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  {nextEvent.contact.first_name}{nextEvent.contact.middle_name ? ' ' + nextEvent.contact.middle_name : ''} {nextEvent.contact.last_name}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {formatDateDisplay(nextEvent)} • {getEventLabel(nextEvent)}
                </p>
              </div>
            </div>
            
            {/* Countdown Clock or Today Badge */}
            {nextEvent.daysRemaining === 0 ? (
              <div 
                className="page-pulse"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  color: nextEvent.eventType.includes('death') ? 'var(--text-muted)' : 'var(--color-gold)', 
                  backgroundColor: 'var(--bg-primary)', 
                  padding: '8px 14px', 
                  borderRadius: '12px', 
                  border: `1px solid ${nextEvent.eventType.includes('death') ? 'rgba(140, 137, 132, 0.2)' : 'rgba(197, 160, 89, 0.25)'}`
                }}
              >
                {nextEvent.eventType.includes('death') ? '🤍 Remembering Today' : '🎉 Celebrating Today!'}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[
                  { value: timeLeft.days, label: 'Days' },
                  { value: timeLeft.hours, label: 'Hrs' },
                  { value: timeLeft.minutes, label: 'Mins' },
                  { value: timeLeft.seconds, label: 'Secs' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '44px', padding: '6px 2px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: 'var(--border-light)' }}>
                    <span className="serif-font" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2' }}>
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Today's Celebration Banner (Conditional Amber Gradient Banner) */}
      {todayEvents.length > 0 && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, #DDAE4F 0%, #C4953A 100%)',
          color: '#FFFFFF',
          border: 'none',
          padding: '20px',
          margin: '0 16px 20px 16px',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 24px rgba(196, 149, 58, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎉</span>
            <h3 className="serif-font" style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700', margin: 0 }}>
              Today's Celebrations!
            </h3>
          </div>
          <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>
            You have {todayEventsCount} special family event{todayEventsCount > 1 ? 's' : ''} today. Send them your prayers and blessings!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {todayEvents.map((group: any) => (
              <div 
                key={group.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                  padding: '12px 14px', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar-gradient" style={{ height: '30px', width: '30px', fontSize: '10px', flexShrink: 0 }}>
                    {getInitials(group.contact)}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {group.contact.first_name}{group.contact.middle_name ? ' ' + group.contact.middle_name : ''} {group.contact.last_name}
                    {deceasedContactIds.has(group.contact.id) && (
                      <span title="Passed Away" style={{ fontSize: '12px', cursor: 'help' }}>🤍</span>
                    )}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '40px' }}>
                  {group.events.map((r: any) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>
                        {getEventLabel(r)}
                      </span>
                      <button 
                        onClick={() => handleOpenWhatsAppComposer(r)}
                        className="btn btn-press"
                        style={{ 
                          width: 'auto', 
                          padding: '4px 10px', 
                          fontSize: '10px', 
                          backgroundColor: '#FFFFFF', 
                          color: '#C4953A',
                          fontWeight: '600',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          height: '24px'
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
      )}

      {/* Segmented Tab Control */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
        <button 
          onClick={() => setActiveTab('events')} 
          className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, height: '36px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: activeTab === 'events' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)', color: activeTab === 'events' ? 'var(--color-gold)' : 'var(--text-secondary)' }}
        >
          <Calendar size={15} /> Celebrations
        </button>
        <button 
          onClick={() => setActiveTab('insights')} 
          className={`btn ${activeTab === 'insights' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ flex: 1, height: '36px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: activeTab === 'insights' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)', color: activeTab === 'insights' ? 'var(--color-gold)' : 'var(--text-secondary)' }}
        >
          <BarChart3 size={15} /> Insights & Analytics
        </button>
      </div>

      {activeTab === 'insights' ? (
        <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="card" style={{ padding: '16px', margin: 0, textAlign: 'center', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Average Age</span>
              <span className="serif-font" style={{ display: 'block', fontSize: '22px', fontWeight: '700', color: 'var(--color-sage)', marginTop: '4px' }}>
                {insights.avgAge} yrs
              </span>
            </div>
            <div className="card" style={{ padding: '16px', margin: 0, textAlign: 'center', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Common Month</span>
              <span className="serif-font" style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: 'var(--color-gold)', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={insights.mostCommonGMonth}>
                {insights.mostCommonGMonth}
              </span>
            </div>
            <div className="card" style={{ padding: '16px', margin: 0, textAlign: 'center', borderRadius: '12px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Active Directory</span>
              <span className="serif-font" style={{ display: 'block', fontSize: '22px', fontWeight: '700', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {insights.totalContacts} members
              </span>
            </div>
          </div>

          {/* Month Distribution Bar Chart */}
          <div className="card" style={{ padding: '20px', margin: 0, borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 className="serif-font" style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Month Distribution</h4>
              <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '8px', gap: '2px' }}>
                <button
                  onClick={() => setInsightCalendarType('gregorian')}
                  style={{ border: 'none', background: insightCalendarType === 'gregorian' ? 'var(--bg-card)' : 'none', color: insightCalendarType === 'gregorian' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Gregorian
                </button>
                <button
                  onClick={() => setInsightCalendarType('hijri')}
                  style={{ border: 'none', background: insightCalendarType === 'hijri' ? 'var(--bg-card)' : 'none', color: insightCalendarType === 'hijri' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hijri
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(insightCalendarType === 'gregorian'
                ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                : ['Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj']
              ).map((name, idx) => {
                const count = insightCalendarType === 'gregorian' ? insights.gMonthCounts[idx] : insights.hMonthCounts[idx];
                const maxCount = Math.max(...(insightCalendarType === 'gregorian' ? insights.gMonthCounts : insights.hMonthCounts), 1);
                const percent = (count / maxCount) * 100;
                
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11.5px', width: '75px', color: 'var(--text-secondary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>{name}</span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, backgroundColor: 'var(--color-gold)', borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>
                    <span style={{ fontSize: '11px', width: '20px', textAlign: 'right', fontWeight: '600', color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Landmark Milestones */}
          <div className="card" style={{ padding: '20px', margin: 0, borderRadius: '12px' }}>
            <h4 className="serif-font" style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} style={{ color: 'var(--color-gold)' }} /> Landmark Milestones (Next 6 Months)
            </h4>

            {insights.landmarks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {insights.landmarks.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: 'var(--border-light)' }}>
                    <div>
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                        {r.contact.first_name}{r.contact.middle_name ? ' ' + r.contact.middle_name : ''} {r.contact.last_name}
                      </span>
                      <span className="reminder-subtext" style={{ fontSize: '11px' }}>
                        {formatDateDisplay(r)} • {getEventLabel(r)}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-sage)' }}>
                      {getCountdownText(r.daysRemaining)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                No landmark milestones coming up in the next 6 months.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Elegant Search bar */}
          <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            className="form-input search-input"
            placeholder="Search friends & family..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Event Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {livingReminders.length === 0 && deceasedReminders.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No celebrations found in your directory.
          </div>
        ) : (
          <>
            {/* THIS WEEK Group - Horizontally Scrollable Cards */}
            {weekEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-sage)', fontWeight: '600' }}>Upcoming This Week</h3>
                <div className="horizontal-snap-scroll hide-scrollbar reminders-grid-desktop" style={{ 
                  gap: '16px', 
                  padding: '4px 20px 16px 20px'
                }}>
                  {weekEvents.map((group: any) => (
                    <div 
                      key={group.id} 
                      className="card reminder-card horizontal-snap-item"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px',
                        margin: 0,
                        width: '260px',
                        minWidth: '260px',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar-gradient" style={{ flexShrink: 0, height: '36px', width: '36px', fontSize: '12px' }}>
                          {getInitials(group.contact)}
                        </div>
                        <h4 className="reminder-name" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {group.contact.first_name}{group.contact.middle_name ? ' ' + group.contact.middle_name : ''} {group.contact.last_name}
                          {deceasedContactIds.has(group.contact.id) && (
                            <span title="Passed Away" style={{ fontSize: '12px', cursor: 'help' }}>🤍</span>
                          )}
                        </h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                        {group.events.map((r: any) => (
                          <div 
                            key={r.id} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '4px',
                              borderTop: group.events.indexOf(r) > 0 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                              paddingTop: group.events.indexOf(r) > 0 ? '8px' : '0'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <span className={`badge ${getEventBadgeClass(r.eventType)}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                                {getEventLabel(r)}
                              </span>
                              <button 
                                className="btn-whatsapp btn-press" 
                                onClick={() => handleOpenWhatsAppComposer(r)}
                                style={{ width: 'auto', padding: '3px 8px', fontSize: '9px', height: '22px' }}
                              >
                                <Send size={8} />
                                <span style={{ marginLeft: '4px' }}>Dua</span>
                              </button>
                            </div>
                            <span className="reminder-subtext" style={{ fontSize: '10px' }}>
                              {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* THIS MONTH Group */}
            {monthEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-gold)', fontWeight: '600' }}>Coming Up This Month</h3>
                <div className="reminders-grid">
                  {monthEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer, deceasedContactIds))}
                </div>
              </div>
            )}

            {/* LATER Group */}
            {laterEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--text-secondary)' }}>Later Events</h3>
                <div className="reminders-grid">
                  {laterEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer, deceasedContactIds))}
                </div>
              </div>
            )}

            {/* Passed Away Family & Friends */}
            {deceasedEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--text-secondary)', borderTop: 'var(--border-light)', paddingTop: '16px', marginTop: '16px' }}>
                  Passed Away Family & Friends
                </h3>
                <div className="reminders-grid">
                  {deceasedEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer, deceasedContactIds))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      {/* WhatsApp Message Template Composer Drawer Modal */}
      {showModal && selectedReminder && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '20px' }}>Send Blessings</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="serif-font" style={{ fontSize: '16px', fontWeight: '600' }}>
                  {selectedReminder.contact.first_name}{selectedReminder.contact.middle_name ? ' ' + selectedReminder.contact.middle_name : ''} {selectedReminder.contact.last_name}
                </span>
                <span className={`badge ${getEventBadgeClass(selectedReminder.eventType)}`}>
                  {getEventLabel(selectedReminder)}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Phone: {selectedReminder.contact.phone_number || 'No number saved'}
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Message Draft</label>
              <textarea 
                className="form-input" 
                style={{ height: '120px', resize: 'none', lineHeight: '1.6', fontFamily: 'inherit' }}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleSendWhatsApp}
              disabled={!selectedReminder.contact.phone_number}
            >
              <MessageCircle size={16} /> 
              {selectedReminder.contact.phone_number ? 'Send via WhatsApp' : 'Save & Share (No Phone Number)'}
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// Sibling helper functions
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

// Sub-component card rendering helper
function renderReminderCard(group: any, onWhatsAppOpen: (reminder: any) => void, deceasedContactIds: Set<any>) {
  const getInitials = (c: any) => {
    return `${c.first_name[0] || ''}${c.last_name[0] || ''}`.toUpperCase();
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'birthday_gregorian': return 'badge-birthday';
      case 'birthday_hijri': return 'badge-waras';
      case 'anniversary': return 'badge-anniversary';
      default: return 'badge-death';
    }
  };

  const getEventLabel = (r: any): string => {
    const getOrdinalSuffix = (num: number): string => {
      if (num <= 0) return '';
      const j = num % 10, k = num % 100;
      if (j === 1 && k !== 11) return num + 'st';
      if (j === 2 && k !== 12) return num + 'nd';
      if (j === 3 && k !== 13) return num + 'rd';
      return num + 'th';
    };

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

  return (
    <div 
      key={group.id} 
      className="card reminder-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        margin: '8px 16px',
        borderRadius: '12px',
        gap: '12px'
      }}
    >
      {/* Contact Info Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="avatar-gradient" style={{ height: '36px', width: '36px', fontSize: '12px', flexShrink: 0 }}>
          {getInitials(group.contact)}
        </div>
        <h4 className="reminder-name" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {group.contact.first_name}{group.contact.middle_name ? ' ' + group.contact.middle_name : ''} {group.contact.last_name}
          {deceasedContactIds.has(group.contact.id) && (
            <span title="Passed Away" style={{ fontSize: '12px', cursor: 'help' }}>🤍</span>
          )}
        </h4>
      </div>

      {/* Events List */}
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
              <span className="reminder-subtext" style={{ fontSize: '12px' }}>
                {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
              </span>
            </div>
            
            <button 
              className="btn-whatsapp btn-press" 
              onClick={() => onWhatsAppOpen(r)}
              style={{ width: 'auto', flexShrink: 0, padding: '4px 10px', fontSize: '11px', height: '26px' }}
            >
              <Send size={10} />
              <span>Dua</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
