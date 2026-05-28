'use client';

import React, { useState } from 'react';
import { submitGuestDetails } from '../actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Send, CheckCircle, Calendar, Plus, X } from 'lucide-react';

interface ShareFormClientProps {
  tenantId: string;
  tenantName: string;
}

export default function ShareFormClient({ tenantId, tenantName }: ShareFormClientProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Contact Inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Birthday Sync
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');

  // Death Sync (Optional)
  const [hasDeceasedEvent, setHasDeceasedEvent] = useState(false);
  const [decFirstName, setDecFirstName] = useState('');
  const [decLastName, setDecLastName] = useState('');
  const [gDeath, setGDeath] = useState('');
  const [hDDate, setHDDate] = useState('');
  const [hDMonth, setHDMonth] = useState('');
  const [hDYear, setHDYear] = useState('');

  // Anniversary
  const [gAnniversary, setGAnniversary] = useState('');

  // --- Dynamic conversions ---
  const handleGBirthdayChange = (val: string) => {
    setGBirthday(val);
    if (!val) return;
    const d = new Date(val + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      const h = HijriDate.fromGregorian(d);
      setHBDate(h.day.toString());
      setHBMonth(h.month.toString());
      setHBYear(h.year.toString());
    }
  };

  const syncHBirthdayToGregorian = (d: string, m: string, y: string) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        const gDateObj = h.toGregorian();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const finalEvents: any[] = [];

    // Birthday
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

    // Wedding Anniversary
    if (gAnniversary) {
      const parts = gAnniversary.split('-');
      finalEvents.push({
        eventType: 'anniversary',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2])
      });
    }

    // Deceased events (submitted as associated events for reference)
    if (hasDeceasedEvent && decFirstName && decLastName) {
      const notesPrefix = `Deceased Relative: ${decFirstName} ${decLastName}`;
      
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
    }

    try {
      let finalNotes = notes;
      if (hasDeceasedEvent && decFirstName && decLastName) {
        finalNotes = `${notes ? notes + '\n' : ''}Submitted deceased relative: ${decFirstName} ${decLastName}.`;
      }

      await submitGuestDetails(tenantId, {
        firstName,
        lastName,
        phoneNumber: phone,
        email,
        notes: finalNotes,
        events: finalEvents
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit form.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
        <div className="card" style={{ maxWidth: '360px', padding: '32px' }}>
          <CheckCircle size={48} style={{ color: 'var(--color-sage)', marginBottom: '16px' }} />
          <h3 className="serif-font" style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Thank You!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
            Your details have been successfully submitted to <strong>{tenantName}</strong>. 
            Once reviewed and approved by the admin, your reminders will go live in the directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '40px 24px',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Yaadi Logo" 
            style={{ 
              height: 'auto', 
              width: '100%',
              maxWidth: '220px',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              marginBottom: '8px'
            }} 
          />
          <h2 className="serif-font" style={{ fontSize: '26px', color: 'var(--text-primary)' }}>
            Join Family Directory
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Submit your details for <strong>{tenantName}</strong>.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', padding: '10px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Ingestion form */}
        <form onSubmit={handleSubmit} className="card" style={{ margin: 0, padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
            Contact Details
          </h3>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="e.g. Fatima"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="e.g. Syed"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Phone Number</label>
            <input 
              type="text" 
              required
              className="form-input" 
              placeholder="e.g. 919876543210 (with country code)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email (Optional)</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Birthday Calendar Sync Section */}
          <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Birthday & Waras</h4>
            
            <div className="form-group">
              <label className="form-label">Gregorian Birthday</label>
              <input 
                type="date" 
                className="form-input" 
                value={gBirthday}
                onChange={(e) => handleGBirthdayChange(e.target.value)}
                disabled={loading}
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
                  value={hBDate}
                  onChange={(e) => {
                    setHBDate(e.target.value);
                    syncHBirthdayToGregorian(e.target.value, hBMonth, hBYear);
                  }}
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Wedding Anniversary */}
          <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Anniversary</h4>
            <div className="form-group">
              <label className="form-label">Anniversary Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={gAnniversary}
                onChange={(e) => setGAnniversary(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Deceased Relative Switch */}
          <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input 
                type="checkbox" 
                id="deceased-check"
                checked={hasDeceasedEvent}
                onChange={(e) => setHasDeceasedEvent(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="deceased-check" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Add Deceased Relative (Wafaat)
              </label>
            </div>

            {hasDeceasedEvent && (
              <div style={{ backgroundColor: '#FAF9F6', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Relative's First Name</label>
                    <input 
                      type="text" 
                      required
                      className="form-input" 
                      placeholder="e.g. Shabbir"
                      value={decFirstName}
                      onChange={(e) => setDecFirstName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Relative's Last Name</label>
                    <input 
                      type="text" 
                      required
                      className="form-input" 
                      placeholder="e.g. Syed"
                      value={decLastName}
                      onChange={(e) => setDecLastName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label className="form-label">Gregorian Death Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={gDeath}
                    onChange={(e) => handleGDeathChange(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ width: '70px', marginBottom: 0 }}>
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
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Hijri Month</label>
                    <select 
                      className="form-select"
                      value={hDMonth}
                      onChange={(e) => {
                        setHDMonth(e.target.value);
                        syncHDeathToGregorian(hDDate, e.target.value, hDYear);
                      }}
                      disabled={loading}
                    >
                      <option value="">Select Month...</option>
                      {HIJRI_MONTH_NAMES.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
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
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Additional Info / Notes</label>
            <textarea 
              className="form-input" 
              style={{ height: '60px', resize: 'none' }}
              placeholder="e.g. Relationship to family, secondary contacts..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }} disabled={loading}>
            <Send size={14} /> {loading ? 'Submitting Details...' : 'Submit Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
