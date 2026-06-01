'use client';

import React, { useState, useEffect } from 'react';
import { getPublicSharedGroup } from '../actions';
import { HijriDate, getNextGregorianEvent, getNextHijriEvent, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, Send, Calendar, AlertCircle, MessageCircle, Heart, Cake, X } from 'lucide-react';
import Portal from '@/app/components/Portal';

interface PageProps {
  params: Promise<{ shareLinkId: string }>;
}

export default function SharedGroupPage({ params }: PageProps) {
  const [shareLinkId, setShareLinkId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // WhatsApp Message Composer States
  const [showComposer, setShowComposer] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    params.then((p) => {
      setShareLinkId(p.shareLinkId);
      loadSharedData(p.shareLinkId);
    });
  }, [params]);

  const loadSharedData = async (linkId: string) => {
    try {
      const res = await getPublicSharedGroup(linkId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getOrdinalSuffix = (num: number): string => {
    if (num <= 0) return '';
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontSize: '14px'
      }}>
        Loading shared celebrations calendar...
      </div>
    );
  }

  // Handle link inactive or invalid
  if (!data || data.isActive === false) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: 'var(--bg-primary)',
        textAlign: 'center'
      }}>
        <div className="card" style={{ maxWidth: '400px', padding: '32px' }}>
          <AlertCircle size={48} style={{ color: 'var(--color-rose)', marginBottom: '16px' }} />
          <h3 className="serif-font" style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Shared Calendar Expired
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
            This sharing link is invalid or has been paused by the family workspace administrator. Please request a new active link.
          </p>
        </div>
      </div>
    );
  }

  const { groupName, contacts, events } = data;

  // Process all group events to reminders
  const reminders = events.map((event: any) => {
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
  })
  .filter(Boolean)
  .filter((r: any) => {
    const name = `${r.contact.first_name}${r.contact.middle_name ? ' ' + r.contact.middle_name : ''} ${r.contact.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  })
  .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining);

  const todayEvents = reminders.filter((r: any) => r.daysRemaining === 0);
  const weekEvents = reminders.filter((r: any) => r.daysRemaining > 0 && r.daysRemaining <= 7);
  const monthEvents = reminders.filter((r: any) => r.daysRemaining > 7 && r.daysRemaining <= 30);
  const laterEvents = reminders.filter((r: any) => r.daysRemaining > 30);

  const handleOpenWhatsApp = (reminder: any) => {
    setSelectedReminder(reminder);

    const type = reminder.eventType;
    const name = `${reminder.contact.first_name}${reminder.contact.middle_name ? ' ' + reminder.contact.middle_name : ''} ${reminder.contact.last_name}`;
    const ordinalStr = getOrdinalSuffix(reminder.ordinal);

    let templateText = '';
    if (type === 'birthday_gregorian') {
      templateText = "Happy {ordinal} Birthday, {name}! Wishing you a wonderful year filled with love, laughter, and success.";
    } else if (type === 'birthday_hijri') {
      templateText = "Mubarak on your {ordinal} Waras, {name}! Wishing you a blessed year ahead filled with health and happiness.";
    } else if (type === 'anniversary') {
      templateText = "Wishing you both a very Happy {ordinal} Wedding Anniversary, {name}! May your love continue to grow stronger each day.";
    } else if (type === 'death_gregorian') {
      templateText = "Remembering {name} on their {ordinal} death anniversary today. You are forever in our thoughts and prayers.";
    } else if (type === 'death_hijri') {
      templateText = "Remembering {name} on their {ordinal} Wafaat anniversary today. Sending our deepest thoughts and prayers.";
    }

    const interpolated = templateText
      .replace(/{name}/g, name)
      .replace(/{ordinal}/g, ordinalStr);

    setMessageText(interpolated);
    setShowComposer(true);
  };

  const handleSendWhatsApp = () => {
    if (!selectedReminder) return;
    let phone = selectedReminder.contact.phone_number || '';
    phone = phone.replace(/[^0-9]/g, '');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    setShowComposer(false);
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

  function renderSharedCard(r: any) {
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
          <div className="avatar-gradient" style={{ flexShrink: 0 }}>
            {getInitials(r.contact)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            <h4 className="reminder-name" style={{ fontSize: '14px', fontWeight: '600' }}>
              {r.contact.first_name}{r.contact.middle_name ? ' ' + r.contact.middle_name : ''} {r.contact.last_name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className={`badge ${getEventBadgeClass(r.eventType)}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                {getEventLabel(r)}
              </span>
              <span className="reminder-subtext" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {formatDateDisplay(r)} • {getCountdownText(r.daysRemaining)}
              </span>
            </div>
          </div>
        </div>

        {r.contact.phone_number && (
          <button 
            className="btn-whatsapp btn-press" 
            onClick={() => handleOpenWhatsApp(r)}
            style={{ width: 'auto', padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
          >
            <Send size={10} />
            <span>Dua</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      alignItems: 'center',
      paddingBottom: '40px'
    }}>
      <div style={{ width: '100%', maxWidth: '480px', padding: '24px 0' }}>
        
        {/* Header Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', padding: '0 16px' }}>
          <img src="/logo.png" alt="Yaadi" style={{ height: '32px', width: 'auto', objectFit: 'contain', marginBottom: '8px' }} />
          <h2 className="serif-font" style={{ fontSize: '24px', color: 'var(--text-primary)', margin: 0 }}>
            {groupName} Group
          </h2>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-gold)', fontWeight: '600', marginTop: '2px' }}>
            Shared Family Calendar
          </span>
        </div>

        {/* Search inside group */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text"
              className="form-input search-input"
              placeholder="Search group members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: '42px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Today's Events Banner */}
        {todayEvents.length > 0 && (
          <div className="card" style={{
            background: 'linear-gradient(135deg, #DDAE4F 0%, #C4953A 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '16px',
            margin: '0 16px 20px 16px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(196, 149, 58, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎉</span>
              <h3 className="serif-font" style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Today's Celebrations!
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todayEvents.map((r: any) => (
                <div 
                  key={r.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                    padding: '8px 12px', 
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar-gradient" style={{ height: '28px', width: '28px', fontSize: '10px', flexShrink: 0 }}>
                      {getInitials(r.contact)}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: '600' }}>
                        {r.contact.first_name} {r.contact.last_name}
                      </span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>
                        {getEventLabel(r)}
                      </span>
                    </div>
                  </div>
                  {r.contact.phone_number && (
                    <button 
                      onClick={() => handleOpenWhatsApp(r)}
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
                        cursor: 'pointer'
                      }}
                    >
                      Send Dua
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timelines Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reminders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No upcoming events found in this group.
            </div>
          ) : (
            <>
              {/* This Week */}
              {weekEvents.length > 0 && (
                <div>
                  <h3 className="serif-font" style={{ padding: '0 20px 4px 20px', fontSize: '16px', color: 'var(--color-sage)', fontWeight: '600' }}>Upcoming This Week</h3>
                  <div>
                    {weekEvents.map(renderSharedCard)}
                  </div>
                </div>
              )}

              {/* This Month */}
              {monthEvents.length > 0 && (
                <div>
                  <h3 className="serif-font" style={{ padding: '0 20px 4px 20px', fontSize: '16px', color: 'var(--color-gold)', fontWeight: '600' }}>Coming Up This Month</h3>
                  <div>
                    {monthEvents.map(renderSharedCard)}
                  </div>
                </div>
              )}

              {/* Later */}
              {laterEvents.length > 0 && (
                <div>
                  <h3 className="serif-font" style={{ padding: '0 20px 4px 20px', fontSize: '16px', color: 'var(--text-secondary)' }}>Later Celebrations</h3>
                  <div>
                    {laterEvents.map(renderSharedCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* WhatsApp Message Draft Dialog */}
      {showComposer && selectedReminder && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowComposer(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="serif-font" style={{ fontSize: '18px' }}>Send Blessings</h3>
                <button className="modal-close" onClick={() => setShowComposer(false)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="serif-font" style={{ fontSize: '15px', fontWeight: '600' }}>
                    {selectedReminder.contact.first_name} {selectedReminder.contact.last_name}
                  </span>
                  <span className={`badge ${getEventBadgeClass(selectedReminder.eventType)}`} style={{ fontSize: '10px' }}>
                    {getEventLabel(selectedReminder)}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Message Draft</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '100px', resize: 'none', lineHeight: '1.5', fontSize: '12px' }}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleSendWhatsApp}
                style={{ height: '38px', fontSize: '12px' }}
              >
                <MessageCircle size={14} /> Send via WhatsApp
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
