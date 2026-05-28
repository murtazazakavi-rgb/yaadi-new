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
    const name = `${r.contact.first_name} ${r.contact.last_name}`.toLowerCase();
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
    const name = `${reminder.contact.first_name} ${reminder.contact.last_name}`;
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
    <div style={{ padding: '20px 0' }}>
      {/* Welcome Greeting Section */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Assalamu Alaikum!
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>{gregorianTodayStr}</span>
          <span style={{ color: 'var(--color-gold)', fontWeight: '500' }}>{hijriTodayStr}</span>
        </div>
      </div>

      {/* Stats Board */}
      <div style={{ display: 'flex', gap: '12px', padding: '0 16px', marginBottom: '16px' }}>
        <div className="card" style={{ flex: 1, margin: 0, padding: '16px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Directory</span>
          <span className="serif-font" style={{ fontSize: '28px', color: 'var(--color-sage)', fontWeight: '600' }}>{data.contacts.length}</span>
        </div>
        <div className="card" style={{ flex: 1, margin: 0, padding: '16px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>Next 30 Days</span>
          <span className="serif-font" style={{ fontSize: '28px', color: 'var(--color-gold)', fontWeight: '600' }}>{next30DaysCount}</span>
        </div>
      </div>

      {/* Elegant Search bar */}
      <div style={{ padding: '0 16px 16px 16px', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '42px', borderRadius: '12px', backgroundColor: '#FFFFFF', border: 'var(--border-thin)', boxShadow: 'var(--shadow-soft)' }}
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
            {/* TODAY Group */}
            {todayEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-rose)', fontWeight: '600' }}>Today's Celebrations</h3>
                {todayEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
              </div>
            )}

            {/* THIS WEEK Group */}
            {weekEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-sage)', fontWeight: '600' }}>Upcoming This Week</h3>
                {weekEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
              </div>
            )}

            {/* THIS MONTH Group */}
            {monthEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--color-gold)', fontWeight: '600' }}>Coming Up This Month</h3>
                {monthEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
              </div>
            )}

            {/* LATER Group */}
            {laterEvents.length > 0 && (
              <div>
                <h3 className="serif-font" style={{ padding: '0 20px 8px 20px', fontSize: '18px', color: 'var(--text-secondary)' }}>Later Events</h3>
                {laterEvents.map((r: any) => renderReminderCard(r, handleOpenWhatsAppComposer))}
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
                  {selectedReminder.contact.first_name} {selectedReminder.contact.last_name}
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
    <div 
      key={r.id} 
      className="card"
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
        <div style={{
          height: '36px',
          width: '36px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-gold-light)',
          color: 'var(--color-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '600',
          border: '1px solid rgba(197, 160, 89, 0.2)'
        }}>
          {getInitials(r.contact)}
        </div>

        {/* Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {r.contact.first_name} {r.contact.last_name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span className={`badge ${getEventBadgeClass(r.eventType)}`}>
              {getEventLabel(r)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Action WhatsApp Button */}
      <button 
        className="btn-whatsapp" 
        onClick={() => onWhatsAppOpen(r)}
        style={{ width: 'auto', flexShrink: 0 }}
      >
        <Send size={12} />
        <span>Dua</span>
      </button>
    </div>
  );
}
