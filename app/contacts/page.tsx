'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { 
  createContact, 
  updateContact, 
  deleteContact, 
  addRelationship, 
  removeRelationship, 
  getRelationships 
} from './actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, UserPlus, Edit, Trash2, Link2, Unlink, Check, X, Calendar, Plus } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form Drawer States
  const [showForm, setShowForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Event Input States
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');

  const [gDeath, setGDeath] = useState('');
  const [hDDate, setHDDate] = useState('');
  const [hDMonth, setHDMonth] = useState('');
  const [hDYear, setHDYear] = useState('');

  const [gAnniversary, setGAnniversary] = useState('');

  // Relationship Drawer/Section
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [relPartnerId, setRelPartnerId] = useState('');
  const [relType, setRelType] = useState<'spouse' | 'parent'>('spouse');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dbData = await getDashboardData();
      const rels = await getRelationships();
      setContacts(dbData.contacts);
      setEvents(dbData.events);
      setRelationships(rels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic Bidirectional Conversions ---

  // Gregorian Birthday -> Hijri Birthday
  const handleGBirthdayChange = (val: string) => {
    setGBirthday(val);
    if (!val) return;
    const dateObj = new Date(val + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      const h = HijriDate.fromGregorian(dateObj);
      setHBDate(h.day.toString());
      setHBMonth(h.month.toString());
      setHBYear(h.year.toString());
    }
  };

  // Hijri Birthday -> Gregorian Birthday
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
      } catch (err) {
        // invalid date
      }
    }
  };

  // Gregorian Death -> Hijri Death
  const handleGDeathChange = (val: string) => {
    setGDeath(val);
    if (!val) return;
    const dateObj = new Date(val + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      const h = HijriDate.fromGregorian(dateObj);
      setHDDate(h.day.toString());
      setHDMonth(h.month.toString());
      setHDYear(h.year.toString());
    }
  };

  // Hijri Death -> Gregorian Death
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
      } catch (err) {
        // invalid date
      }
    }
  };

  // --- CRUD Handlers ---

  const handleOpenAdd = () => {
    setEditingContactId(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setGBirthday('');
    setHBDate('');
    setHBMonth('');
    setHBYear('');
    setGDeath('');
    setHDDate('');
    setHDMonth('');
    setHDYear('');
    setGAnniversary('');
    setShowForm(true);
  };

  const handleOpenEdit = (contact: any) => {
    setEditingContactId(contact.id);
    setFirstName(contact.first_name);
    setLastName(contact.last_name);
    setPhone(contact.phone_number || '');
    setEmail(contact.email || '');
    setNotes(contact.notes || '');

    // Reset event fields
    setGBirthday('');
    setHBDate('');
    setHBMonth('');
    setHBYear('');
    setGDeath('');
    setHDDate('');
    setHDMonth('');
    setHDYear('');
    setGAnniversary('');

    // Fetch contact's events
    const cEvents = events.filter((e: any) => e.contact_id === contact.id);
    
    cEvents.forEach((ev: any) => {
      if (ev.event_type === 'birthday_gregorian') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGBirthday(gFormatted);
      } else if (ev.event_type === 'birthday_hijri') {
        setHBDate(ev.h_day.toString());
        setHBMonth(ev.h_month.toString());
        setHBYear(ev.h_year.toString());
      } else if (ev.event_type === 'anniversary') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGAnniversary(gFormatted);
      } else if (ev.event_type === 'death_gregorian') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGDeath(gFormatted);
      } else if (ev.event_type === 'death_hijri') {
        setHDDate(ev.h_day.toString());
        setHDMonth(ev.h_month.toString());
        setHDYear(ev.h_year.toString());
      }
    });

    setShowForm(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct events list
    const finalEvents: any[] = [];

    // Birthday Gregorian
    if (gBirthday) {
      const parts = gBirthday.split('-');
      finalEvents.push({
        eventType: 'birthday_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Birthday Hijri (Waras)
    if (hBDate && hBMonth && hBYear) {
      finalEvents.push({
        eventType: 'birthday_hijri',
        hDay: parseInt(hBDate),
        hMonth: parseInt(hBMonth),
        hYear: parseInt(hBYear),
      });
    }

    // Wedding Anniversary
    if (gAnniversary) {
      const parts = gAnniversary.split('-');
      finalEvents.push({
        eventType: 'anniversary',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Death Gregorian
    if (gDeath) {
      const parts = gDeath.split('-');
      finalEvents.push({
        eventType: 'death_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Death Hijri (Wafaat)
    if (hDDate && hDMonth && hDYear) {
      finalEvents.push({
        eventType: 'death_hijri',
        hDay: parseInt(hDDate),
        hMonth: parseInt(hDMonth),
        hYear: parseInt(hDYear),
      });
    }

    const payload = {
      firstName,
      lastName,
      phoneNumber: phone,
      email,
      notes,
      events: finalEvents,
    };

    try {
      if (editingContactId) {
        await updateContact(editingContactId, payload);
      } else {
        await createContact(payload);
      }
      setShowForm(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error saving contact.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact? All their relationships and events will be deleted.')) {
      try {
        await deleteContact(id);
        loadAllData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- Relationship Handlers ---

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId || !relPartnerId) return;

    try {
      await addRelationship(activeContactId, relPartnerId, relType);
      // Reset selection
      setRelPartnerId('');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to create connection');
    }
  };

  const handleRemoveRelationship = async (id: string) => {
    try {
      await removeRelationship(id);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered contacts list
  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const getContactEventsSummary = (contactId: string) => {
    const cEvs = events.filter((e) => e.contact_id === contactId);
    return cEvs.map((e) => {
      let label = e.event_type.replace('_', ' ');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return label;
    }).join(', ') || 'No events registered';
  };

  const getContactRelationships = (contactId: string) => {
    return relationships.filter(
      (r) => r.contact_a_id === contactId || r.contact_b_id === contactId
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading contacts directory...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Page Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)' }}>
            Contacts Directory
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage family directory, dates, and family connections.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={handleOpenAdd}>
          <UserPlus size={16} />
        </button>
      </div>

      {/* Directory Search */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '42px', borderRadius: '12px', backgroundColor: '#FFFFFF', border: 'var(--border-thin)', boxShadow: 'var(--shadow-soft)' }}
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No contacts found in directory.
          </div>
        ) : (
          filteredContacts.map((c) => {
            const isActive = activeContactId === c.id;
            const cRels = getContactRelationships(c.id);

            return (
              <div 
                key={c.id} 
                className="card"
                style={{
                  margin: '0 16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: isActive ? '#FAF9F6' : '#FFFFFF',
                  borderColor: isActive ? 'var(--color-gold)' : 'rgba(197, 160, 89, 0.15)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div 
                    onClick={() => setActiveContactId(isActive ? null : c.id)} 
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {c.first_name} {c.last_name}
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {getContactEventsSummary(c.id)}
                    </p>
                  </div>
                  
                  {/* Edit/Delete icons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      onClick={() => handleOpenEdit(c)}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)' }}
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details (Phone, Email, Notes, Relationships) */}
                {isActive && (
                  <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Basic details */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      {c.phone_number && (
                        <div>
                          <strong style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</strong>
                          <span>{c.phone_number}</span>
                        </div>
                      )}
                      {c.email && (
                        <div>
                          <strong style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</strong>
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>

                    {c.notes && (
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notes</strong>
                        <p style={{ color: 'var(--text-secondary)' }}>{c.notes}</p>
                      </div>
                    )}

                    {/* Relationships List */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Relationships / Connections</strong>
                      {cRels.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No relationships mapped yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cRels.map((r) => {
                            const isA = r.contact_a_id === c.id;
                            const partnerName = isA ? `${r.b_first} ${r.b_last}` : `${r.a_first} ${r.a_last}`;
                            let relLabel = r.relation_type;
                            if (r.relation_type === 'parent') {
                              relLabel = isA ? 'Parent of' : 'Child of';
                            } else if (r.relation_type === 'spouse') {
                              relLabel = 'Spouse of';
                            }

                            return (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#FAF9F6', borderRadius: '6px', fontSize: '12px' }}>
                                <span><strong>{relLabel}</strong> {partnerName}</span>
                                <button 
                                  onClick={() => handleRemoveRelationship(r.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)' }}
                                >
                                  <Unlink size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Relationship Linker Form */}
                      <form onSubmit={handleAddRelationship} style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          className="form-select" 
                          style={{ height: '34px', padding: '4px 8px', fontSize: '12px' }}
                          value={relType}
                          onChange={(e: any) => setRelType(e.target.value)}
                        >
                          <option value="spouse">Spouse</option>
                          <option value="parent">Parent Of</option>
                        </select>

                        <select 
                          className="form-select" 
                          style={{ height: '34px', padding: '4px 8px', fontSize: '12px' }}
                          required
                          value={relPartnerId}
                          onChange={(e) => setRelPartnerId(e.target.value)}
                        >
                          <option value="">Select Contact...</option>
                          {contacts
                            .filter((item) => item.id !== c.id)
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.first_name} {item.last_name}
                              </option>
                            ))}
                        </select>

                        <button type="submit" className="btn btn-secondary" style={{ width: 'auto', height: '34px', padding: '0 12px' }}>
                          Link
                        </button>
                      </form>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact Form Modal Drawer */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '22px' }}>
                {editingContactId ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveContact}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Ayesha" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Khan" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Phone Number (with Country Code)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 919876543210" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@domain.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Gregorian / Hijri Birthday Dynamic Sync */}
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

              {/* Gregorian / Hijri Death Dynamic Sync */}
              <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Passing Away (Death Anniversary)</h4>
                
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

              {/* Wedding Anniversary */}
              <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '8px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Wedding Anniversary</h4>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Anniversary Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={gAnniversary}
                    onChange={(e) => setGAnniversary(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '60px', resize: 'none' }}
                  placeholder="Notes, address, secondary numbers..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Save Contact
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
