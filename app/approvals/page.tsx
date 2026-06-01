'use client';

import React, { useState, useEffect } from 'react';
import { getPendingSubmissions, approveSubmission, rejectSubmission } from '@/app/share/actions';
import { getGroups } from '@/app/contacts/groupActions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Check, X, ShieldAlert, Eye, User, Calendar, Save } from 'lucide-react';
import Portal from '@/app/components/Portal';
import { COUNTRY_CODES, parsePhoneNumber } from '@/lib/countries';

export default function ApprovalsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review Drawer States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  // Form Fields for modification during approval review
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bornAfterMaghrib, setBornAfterMaghrib] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Event Inputs
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');

  const [gAnniversary, setGAnniversary] = useState('');

  const [gDeath, setGDeath] = useState('');
  const [hDDate, setHDDate] = useState('');
  const [hDMonth, setHDMonth] = useState('');
  const [hDYear, setHDYear] = useState('');

  useEffect(() => {
    fetchSubmissions();
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const list = await getGroups();
      setGroups(list);
    } catch (err) {}
  };

  const fetchSubmissions = async () => {
    try {
      const list = await getPendingSubmissions();
      setSubmissions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (sub: any) => {
    setSelectedSub(sub);
    setFirstName(sub.first_name);
    setMiddleName(sub.middle_name || '');
    setLastName(sub.last_name);
    const { code, local } = parsePhoneNumber(sub.phone_number || '');
    setCountryCode(code);
    setLocalNumber(local);

    // Parse event data JSON
    let parsedEvents: any[] = [];
    let parsedEmail = '';
    let parsedNotes = '';

    try {
      const dataObj = typeof sub.event_data === 'string' ? JSON.parse(sub.event_data) : sub.event_data;
      parsedEvents = dataObj.events || [];
      parsedEmail = dataObj.email || '';
      parsedNotes = dataObj.notes || '';
    } catch (e) {
      console.error('Failed to parse event_data JSON', e);
    }

    setEmail(parsedEmail);
    setNotes(parsedNotes);
    setBornAfterMaghrib(sub.born_after_maghrib || false);
    setSelectedGroupIds([]);

    // Reset event form fields
    setGBirthday('');
    setHBDate('');
    setHBMonth('');
    setHBYear('');
    setGAnniversary('');
    setGDeath('');
    setHDDate('');
    setHDMonth('');
    setHDYear('');

    // Pre-fill fields from events data
    parsedEvents.forEach((ev: any) => {
      if (ev.eventType === 'birthday_gregorian') {
        const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
        setGBirthday(formatted);
      } else if (ev.eventType === 'birthday_hijri') {
        setHBDate(ev.hDay.toString());
        setHBMonth(ev.hMonth.toString());
        setHBYear(ev.hYear.toString());
      } else if (ev.eventType === 'anniversary') {
        const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
        setGAnniversary(formatted);
      } else if (ev.eventType === 'death_gregorian') {
        const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
        setGDeath(formatted);
      } else if (ev.eventType === 'death_hijri') {
        setHDDate(ev.hDay.toString());
        setHDMonth(ev.hMonth.toString());
        setHDYear(ev.hYear.toString());
      }
    });

    setShowReviewModal(true);
  };

  const handleApprove = async () => {
    if (!selectedSub) return;

    // Construct events list
    const finalEvents: any[] = [];

    if (gBirthday) {
      const parts = gBirthday.split('-');
      finalEvents.push({
        eventType: 'birthday_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2])
      });
    }

    if (hBDate && hBMonth && hBYear) {
      finalEvents.push({
        eventType: 'birthday_hijri',
        hDay: parseInt(hBDate),
        hMonth: parseInt(hBMonth),
        hYear: parseInt(hBYear)
      });
    }

    if (gAnniversary) {
      const parts = gAnniversary.split('-');
      finalEvents.push({
        eventType: 'anniversary',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2])
      });
    }

    if (gDeath) {
      const parts = gDeath.split('-');
      finalEvents.push({
        eventType: 'death_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2])
      });
    }

    if (hDDate && hDMonth && hDYear) {
      finalEvents.push({
        eventType: 'death_hijri',
        hDay: parseInt(hDDate),
        hMonth: parseInt(hDMonth),
        hYear: parseInt(hDYear)
      });
    }

    const combinedPhone = localNumber.trim() ? `${countryCode}${localNumber.trim()}` : '';
    const payload = {
      firstName,
      middleName,
      lastName,
      phoneNumber: combinedPhone,
      email,
      notes,
      bornAfterMaghrib,
      groupIds: selectedGroupIds,
      events: finalEvents
    };

    try {
      await approveSubmission(selectedSub.id, payload);
      setShowReviewModal(false);
      fetchSubmissions();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this submission? It will be deleted from approvals.')) {
      try {
        await rejectSubmission(id);
        setShowReviewModal(false);
        fetchSubmissions();
      } catch (err: any) {
        alert(err.message || 'Rejection failed');
      }
    }
  };

  // Dynamic calculations inside modal
  const handleGBirthdayChange = (val: string, isAfterMaghrib = bornAfterMaghrib) => {
    setGBirthday(val);
    if (!val) return;
    const d = new Date(val + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      let calcDate = d;
      if (isAfterMaghrib) {
        calcDate = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      }
      const h = HijriDate.fromGregorian(calcDate);
      setHBDate(h.day.toString());
      setHBMonth(h.month.toString());
      setHBYear(h.year.toString());
    }
  };

  const handleBornAfterMaghribToggle = (checked: boolean) => {
    setBornAfterMaghrib(checked);
    if (gBirthday) {
      handleGBirthdayChange(gBirthday, checked);
    }
  };

  const syncHBirthdayToGregorian = (d: string, m: string, y: string, isAfterMaghrib = bornAfterMaghrib) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        let gDateObj = h.toGregorian();
        if (isAfterMaghrib) {
          gDateObj = new Date(gDateObj.getTime() - 24 * 60 * 60 * 1000);
        }
        // format to yyyy-mm-dd (local time safe)
        const year = gDateObj.getFullYear();
        const month = String(gDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(gDateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setGBirthday(formatted);
      } catch (err) {}
    }
  };

  const handleGDeathChange = (val: string) => {
    setGDeath(val);
    if (!val) return;
    const d = new Date(val + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      const h = HijriDate.fromGregorian(d);
      setHDDate(h.day.toString());
      setHDMonth(h.month.toString());
      setHDYear(h.year.toString());
    }
  };

  const syncHDeathToGregorian = (d: string, m: string, y: string) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        const gDateObj = h.toGregorian();
        // format to yyyy-mm-dd (local time safe)
        const year = gDateObj.getFullYear();
        const month = String(gDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(gDateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setGDeath(formatted);
      } catch (err) {}
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading submissions queue...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Pending Approvals
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Review and approve details submitted by family members via invitation links.
        </p>
      </div>

      {error && (
        <div style={{ margin: '0 20px 20px 20px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', padding: '12px', borderRadius: 'var(--radius-button)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Submissions queue */}
      <div className="approvals-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px' }}>
        {submissions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pending submissions to review.
          </div>
        ) : (
          submissions.map((sub) => {
            let infoSummary = 'No events';
            try {
              const obj = typeof sub.event_data === 'string' ? JSON.parse(sub.event_data) : sub.event_data;
              infoSummary = obj.events.map((e: any) => e.eventType.replace('_', ' ')).join(', ') || 'No events';
            } catch (e) {}

            return (
              <div 
                key={sub.id} 
                className="card approval-card"
                style={{
                  margin: 0,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <h4 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {sub.first_name}{sub.middle_name ? ' ' + sub.middle_name : ''} {sub.last_name}</h4>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Phone: {sub.phone_number || 'None'} • Submits: {infoSummary}
                  </span>
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Submitted {new Date(sub.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: 'auto', padding: '8px 12px' }}
                    onClick={() => handleOpenReview(sub)}
                  >
                    <Eye size={14} /> Review
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Modal Form */}
      {showReviewModal && selectedSub && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '22px' }}>Review Submission</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              {/* Name Details */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">Middle Name (Opt)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Details */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label className="form-label">WhatsApp Phone</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '90px', flexShrink: 0, paddingRight: '4px' }}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.flag} {item.code}
                        </option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      className="form-input"
                      placeholder="e.g. 9825535907"
                      value={localNumber}
                      onChange={(e) => setLocalNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    required
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Groups Selection */}
              <div style={{ marginTop: '12px', borderTop: 'var(--border-light)', paddingTop: '12px' }}>
                <label className="form-label">Assign to Groups</label>
                {groups.length === 0 ? (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                    No groups created yet. Groups can be created in the Contacts page.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                    {groups.map((g) => {
                       const isSelected = selectedGroupIds.includes(g.id);
                       return (
                         <button
                           key={g.id}
                           type="button"
                           onClick={() => {
                             if (isSelected) {
                               setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                             } else {
                               setSelectedGroupIds([...selectedGroupIds, g.id]);
                             }
                           }}
                           style={{
                             display: 'inline-flex',
                             alignItems: 'center',
                             gap: '4px',
                             padding: '6px 12px',
                             borderRadius: '16px',
                             fontSize: '11px',
                             border: '1px solid',
                             cursor: 'pointer',
                             transition: 'var(--transition-smooth)',
                             backgroundColor: isSelected ? g.color : 'transparent',
                             borderColor: g.color,
                             color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                             opacity: isSelected ? 1 : 0.75
                           }}
                         >
                           {g.name}
                         </button>
                       );
                    })}
                  </div>
                )}
              </div>

              {/* Birthday Gregorian / Hijri Sync */}
              <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Birthday & Waras</h4>
                <div className="form-group">
                  <label className="form-label">Gregorian Birthday</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={gBirthday}
                    onChange={(e) => handleGBirthdayChange(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="born-after-maghrib-check"
                    checked={bornAfterMaghrib}
                    onChange={(e) => handleBornAfterMaghribToggle(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="born-after-maghrib-check" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                    Born after Maghrib (Sunset)
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ width: '70px' }}>
                    <label className="form-label">Hijri Day</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="30"
                      className="form-input" 
                      placeholder="Day"
                      value={hBDate}
                      onChange={(e) => {
                        setHBDate(e.target.value);
                        syncHBirthdayToGregorian(e.target.value, hBMonth, hBYear);
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Hijri Month</label>
                    <select 
                      className="form-select"
                      value={hBMonth}
                      onChange={(e) => {
                        setHBMonth(e.target.value);
                        syncHBirthdayToGregorian(hBDate, e.target.value, hBYear);
                      }}
                    >
                      <option value="">Select Month...</option>
                      {HIJRI_MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ width: '80px' }}>
                    <label className="form-label">Hijri Year</label>
                    <input 
                      type="number" 
                      min="1000" 
                      max="2000"
                      className="form-input" 
                      placeholder="Year"
                      value={hBYear}
                      onChange={(e) => {
                        setHBYear(e.target.value);
                        syncHBirthdayToGregorian(hBDate, hBMonth, e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Anniversary */}
              <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Wedding Anniversary</h4>
                <div className="form-group">
                  <label className="form-label">Anniversary Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={gAnniversary}
                    onChange={(e) => setGAnniversary(e.target.value)}
                  />
                </div>
              </div>

              {/* Deceased Relative (Wafaat) */}
              <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Passing Away (Wafaat)</h4>
                <div className="form-group">
                  <label className="form-label">Gregorian Death Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={gDeath}
                    onChange={(e) => handleGDeathChange(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ width: '70px' }}>
                    <label className="form-label">Hijri Day</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="30"
                      className="form-input" 
                      placeholder="Day"
                      value={hDDate}
                      onChange={(e) => {
                        setHDDate(e.target.value);
                        syncHDeathToGregorian(e.target.value, hDMonth, hDYear);
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Hijri Month</label>
                    <select 
                      className="form-select"
                      value={hDMonth}
                      onChange={(e) => {
                        setHDMonth(e.target.value);
                        syncHDeathToGregorian(hDDate, e.target.value, hDYear);
                      }}
                    >
                      <option value="">Select Month...</option>
                      {HIJRI_MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ width: '80px' }}>
                    <label className="form-label">Hijri Year</label>
                    <input 
                      type="number" 
                      min="1000" 
                      max="2000"
                      className="form-input" 
                      placeholder="Year"
                      value={hDYear}
                      onChange={(e) => {
                        setHDYear(e.target.value);
                        syncHDeathToGregorian(hDDate, hDMonth, e.target.value);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Admin Notes</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '60px', resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, color: 'var(--color-rose)', borderColor: 'rgba(214,168,164,0.3)', backgroundColor: 'var(--color-rose-light)' }}
                  onClick={() => handleReject(selectedSub.id)}
                >
                  <X size={16} /> Reject
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={handleApprove}
                >
                  <Check size={16} /> Approve & Merge
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
