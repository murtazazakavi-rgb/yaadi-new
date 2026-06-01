'use client';

import React, { useState } from 'react';
import { submitGuestDetails } from '../actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Send, CheckCircle, Calendar, Plus, X } from 'lucide-react';
import { COUNTRY_CODES } from '@/lib/countries';

interface ShareFormClientProps {
  tenantId: string;
  tenantName: string;
}

export default function ShareFormClient({ tenantId, tenantName }: ShareFormClientProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formStep, setFormStep] = useState(1);

  // Contact Inputs
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Birthday Sync
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');
  const [bornAfterMaghrib, setBornAfterMaghrib] = useState(false);

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

      const combinedPhone = localNumber.trim() ? `${countryCode}${localNumber.trim()}` : '';
      await submitGuestDetails(tenantId, {
        firstName,
        middleName,
        lastName,
        phoneNumber: combinedPhone,
        email,
        notes: finalNotes,
        bornAfterMaghrib,
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
              maxWidth: '130px',
              objectFit: 'contain',
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

        {/* Steps Indicator Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '20px', width: '100%' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 1 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 2 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 3 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
        </div>

        {/* Ingestion form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          if (formStep < 3) {
            setFormStep(formStep + 1);
          } else {
            handleSubmit(e);
          }
        }} className="card" style={{ margin: 0, padding: '20px', width: '100%' }}>
          {/* STEP 1: Basic Details */}
          {formStep === 1 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', borderBottom: 'var(--border-light)', paddingBottom: '8px', color: 'var(--color-gold)' }}>
                Step 1: Contact Details
              </h3>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Murtaza"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">Middle Name (Opt)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Juzer"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '100px' }}>
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Zakavi"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label className="form-label">WhatsApp Phone Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      className="form-select" 
                      style={{ width: '90px', flexShrink: 0, paddingRight: '4px' }}
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      disabled={loading}
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
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    required
                    className="form-input" 
                    placeholder="murtaza@zakavi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Birthday & Anniversary */}
          {formStep === 2 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', borderBottom: 'var(--border-light)', paddingBottom: '8px', color: 'var(--color-gold)' }}>
                Step 2: Birthday & Anniversary
              </h3>

              {/* Birthday Calendar Sync Section */}
              <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', marginBottom: '12px' }}>
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

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input 
                    type="checkbox" 
                    id="born-after-maghrib-check"
                    checked={bornAfterMaghrib}
                    onChange={(e) => handleBornAfterMaghribToggle(e.target.checked)}
                    disabled={loading}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="born-after-maghrib-check" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                    Born after Maghrib (Sunset)
                  </label>
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
                      value={hBDate}
                      onChange={(e) => {
                        setHBDate(e.target.value);
                        syncHBirthdayToGregorian(e.target.value, hBMonth, hBYear);
                      }}
                      disabled={loading}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
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
                  <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
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
              <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Anniversary</h4>
                <div className="form-group" style={{ margin: 0 }}>
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
            </div>
          )}

          {/* STEP 3: Deceased Relative & Notes */}
          {formStep === 3 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', borderBottom: 'var(--border-light)', paddingBottom: '8px', color: 'var(--color-gold)' }}>
                Step 3: Deceased Relative & Notes
              </h3>

              {/* Deceased Relative Switch */}
              <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', marginBottom: '12px' }}>
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
                  <div style={{ backgroundColor: 'var(--bg-card-active)', padding: '12px', borderRadius: '8px', border: 'var(--border-light)', marginTop: '12px' }}>
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
            </div>
          )}

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px', borderTop: 'var(--border-light)', paddingTop: '16px' }}>
            {formStep > 1 && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, height: '40px' }} 
                onClick={() => setFormStep(formStep - 1)}
                disabled={loading}
              >
                Back
              </button>
            )}

            {formStep < 3 ? (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1, height: '40px' }}
                disabled={loading}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1, height: '40px' }} 
                disabled={loading}
              >
                <Send size={14} /> {loading ? 'Submitting Details...' : 'Submit Details'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
