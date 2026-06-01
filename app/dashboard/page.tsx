'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from './actions';
import { HijriDate, getNextGregorianEvent, getNextHijriEvent, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, Send, Calendar, Cake, ShieldCheck, Heart, UserMinus, MessageCircle, X } from 'lucide-react';

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

  // Process all events and calculate countdowns
  const reminders = data.events.map((event: any) => {
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
  .filter(Boolean)
  // Filter by search query
  .filter((r: any) => {
    const name = `${r.contact.first_name}${r.contact.middle_name ? ' ' + r.contact.middle_name : ''} ${r.contact.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  })
  // Sort chronologically by remaining days
  .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

  // Group events
  const todayEvents = reminders.filter((r: any) => r.daysRemaining === 0);
  const weekEvents = reminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);
  const monthEvents = reminders.filter((r: any) => r.daysRemaining > 7 && r.daysRemaining <= 30);
  const laterEvents = reminders.filter((r: any) => r.daysRemaining > 30);

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
  const next30DaysCount = reminders.filter((r: any) => r.daysRemaining <= 30).length;

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
            You have {todayEvents.length} special family event{todayEvents.length > 1 ? 's' : ''} today. Send them your prayers and blessings!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {todayEvents.map((r: any) => (
              <div 
                key={r.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                  padding: '10px 14px', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar-gradient" style={{ height: '30px', width: '30px', fontSize: '10px', flexShrink: 0 }}>
                    {getInitials(r.contact)}
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: '600' }}>
                      {r.contact.first_name} {r.contact.last_name}
                    </span>
                    <span style={{ fontSize: '11px', opacity: 0.85 }}>
                      {getEventLabel(r)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenWhatsAppComposer(r)}
                  className="btn btn-press"
                  style={{ 
                    width: 'auto', 
                    padding: '6px 12px', 
                    fontSize: '11px', 
                    backgroundColor: '#FFFFFF', 
                    color: '#C4953A',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Send Dua
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        {reminders.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No celebrations found in your directory.
          </div>
        ) : (
          <>
            {/* THIS WEEK Group - Horizontally Scrollable Cards */}
            {weekEvents.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-sage)', fontWeight: '600' }}>Upcoming This Week</h3>
                <div className="horizontal-snap-scroll hide-scrollbar" style={{ 
                  gap: '16px', 
                  padding: '4px 20px 16px 20px'
                }}>
                  {weekEvents.map((r: any) => (
                    <div 
                      key={r.id} 
                      className="card reminder-card horizontal-snap-item"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px',
                        margin: 0,
                        width: '260px',
                        minWidth: '260px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <div className="avatar-gradient" style={{ flexShrink: 0 }}>
                          {getInitials(r.contact)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <h4 className="reminder-name">
                            {r.contact.first_name} {r.contact.last_name}
                          </h4>
                          <span className="reminder-subtext">
                            {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span className={`badge ${getEventBadgeClass(r.eventType)}`}>
                          {getEventLabel(r)}
                        </span>
                        <button 
                          className="btn-whatsapp btn-press" 
                          onClick={() => handleOpenWhatsAppComposer(r)}
                          style={{ width: 'auto' }}
                        >
                          <Send size={10} />
                          <span>Dua</span>
                        </button>
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
                  {monthEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
                </div>
              </div>
            )}

            {/* LATER Group */}
            {laterEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--text-secondary)' }}>Later Events</h3>
                <div className="reminders-grid">
                  {laterEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* WhatsApp Message Template Composer Drawer Modal */}
      {showModal && selectedReminder && (
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
function renderReminderCard(r: any, onWhatsAppOpen: (reminder: any) => void) {
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
      key={r.id} 
      className="card reminder-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        margin: '8px 16px',
        borderRadius: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        {/* Compact Avatar */}
        <div className="avatar-gradient" style={{ flexShrink: 0 }}>
          {getInitials(r.contact)}
        </div>

        {/* Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <h4 className="reminder-name">
            {r.contact.first_name}{r.contact.middle_name ? ' ' + r.contact.middle_name : ''} {r.contact.last_name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className={`badge ${getEventBadgeClass(r.eventType)}`}>
              {getEventLabel(r)}
            </span>
            <span className="reminder-subtext">
              {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Action WhatsApp Button */}
      <button 
        className="btn-whatsapp btn-press" 
        onClick={() => onWhatsAppOpen(r)}
        style={{ width: 'auto', flexShrink: 0 }}
      >
        <Send size={12} />
        <span>Dua</span>
      </button>
    </div>
  );
}
