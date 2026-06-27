'use client';

import React, { useState, useEffect } from 'react';
import { getTenants, createTenant, decryptPassword, getAllSystemContacts } from './actions';
import { ShieldCheck, Eye, EyeOff, Plus, UserPlus, Search, Download, Users, Filter, Calendar } from 'lucide-react';

export default function AdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Password visibility map (tenantId -> plainText password)
  const [decryptedPasswords, setDecryptedPasswords] = useState<{ [key: string]: string }>({});
  const [decryptingId, setDecryptingId] = useState<string | null>(null);

  // Tab and Contacts states
  const [activeTab, setActiveTab] = useState<'spaces' | 'contacts'>('spaces');
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');

  const fetchTenantsList = async () => {
    try {
      const list = await getTenants();
      setTenants(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load users');
      if (err.message.includes('Access denied')) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsList = async () => {
    setContactsLoading(true);
    try {
      const list = await getAllSystemContacts();
      setContacts(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantsList();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    setFormLoading(true);

    try {
      await createTenant({ email, displayName, password });
      setFormMsg({ type: 'success', text: 'User account created successfully.' });
      setEmail('');
      setDisplayName('');
      setPassword('');
      await fetchTenantsList();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setFormLoading(false);
    }
  };

  const togglePasswordVisibility = async (tenantId: string, encryptedText: string) => {
    if (decryptedPasswords[tenantId]) {
      const updated = { ...decryptedPasswords };
      delete updated[tenantId];
      setDecryptedPasswords(updated);
    } else {
      setDecryptingId(tenantId);
      try {
        const plain = await decryptPassword(encryptedText);
        setDecryptedPasswords((prev) => ({ ...prev, [tenantId]: plain }));
      } catch (err) {
        console.error(err);
      } finally {
        setDecryptingId(null);
      }
    }
  };

  // Helper to format event dates
  const getEventDetails = (events: any[], type: string) => {
    const ev = events.find(e => e.event_type === type);
    if (!ev) return '';
    if (type.includes('hijri')) {
      const shortHijriMonths = ['Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj'];
      return `${ev.h_day} ${shortHijriMonths[ev.h_month] || ev.h_month} ${ev.h_year || ''}`.trim();
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${ev.g_day} ${months[ev.g_month - 1] || ev.g_month} ${ev.g_year || ''}`.trim();
    }
  };

  const getAnniversaryDetails = (events: any[]) => {
    const ev = events.find(e => e.event_type === 'anniversary');
    if (!ev) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${ev.g_day} ${months[ev.g_month - 1] || ev.g_month} ${ev.g_year || ''}`.trim();
  };

  // Filter logic
  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''} ${c.last_name}`.toLowerCase();
    const phone = (c.phone_number || '').toLowerCase();
    const email = (c.email || '').toLowerCase();
    const addedBy = (c.added_by || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = fullName.includes(query) || phone.includes(query) || email.includes(query) || addedBy.includes(query);
    if (!matchesSearch) return false;

    if (workspaceFilter !== 'all' && c.tenant_id !== workspaceFilter) {
      return false;
    }

    if (eventFilter !== 'all') {
      if (eventFilter === 'birthday') {
        return c.events.some((e: any) => e.event_type.includes('birthday'));
      }
      if (eventFilter === 'death') {
        return c.events.some((e: any) => e.event_type.includes('death'));
      }
      if (eventFilter === 'anniversary') {
        return c.events.some((e: any) => e.event_type === 'anniversary');
      }
    }

    return true;
  });

  // CSV Export logic
  const exportToCSV = () => {
    const headers = [
      'Name', 
      'Phone Number', 
      'Email Address', 
      'Gregorian DOB', 
      'Hijri DOB', 
      'Gregorian Wafaat', 
      'Hijri Wafaat', 
      'Wedding Anniversary', 
      'Added By'
    ];

    const rows = filteredContacts.map(c => {
      const name = `${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''} ${c.last_name}`;
      const phone = c.phone_number || '';
      const email = c.email || '';
      const dobGreg = getEventDetails(c.events, 'birthday_gregorian');
      const dobHijri = getEventDetails(c.events, 'birthday_hijri');
      const wafaatGreg = getEventDetails(c.events, 'death_gregorian');
      const wafaatHijri = getEventDetails(c.events, 'death_hijri');
      const anniv = getEventDetails(c.events, 'anniversary');
      const addedBy = c.added_by;

      return [
        name,
        phone,
        email,
        dobGreg,
        dobHijri,
        wafaatGreg,
        wafaatHijri,
        anniv,
        addedBy
      ].map(val => `"${val.replace(/"/g, '""')}"`);
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `yaadi_contacts_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading Admin portal...
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h3 className="serif-font" style={{ fontSize: '24px', color: 'var(--color-rose)', marginBottom: '12px' }}>
          Access Denied
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          You do not have administrative privileges to access this area.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }} className="page-transition animate-fade-in-up">
      {/* Title Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck style={{ color: 'var(--color-gold)' }} /> System Administration
        </h2>
        <p className="page-subtitle">
          Manage family spaces, login credentials, and view comprehensive directory details.
        </p>
      </div>

      {error && (
        <div style={{ margin: '0 20px 20px 20px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', padding: '12px', borderRadius: 'var(--radius-button)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Segmented Tab Control */}
      <div className="segmented-control" style={{ margin: '0 20px 20px 20px', width: 'calc(100% - 40px)' }}>
        <div 
          className="segmented-control-indicator"
          style={{
            width: 'calc(50% - 2px)',
            transform: `translateX(${activeTab === 'spaces' ? '0%' : '100%'})`
          }}
        />
        <button 
          type="button" 
          onClick={() => setActiveTab('spaces')} 
          className={`segmented-control-item ${activeTab === 'spaces' ? 'active' : ''}`}
        >
          Spaces & Users
        </button>
        <button 
          type="button" 
          onClick={() => {
            setActiveTab('contacts');
            fetchContactsList();
          }} 
          className={`segmented-control-item ${activeTab === 'contacts' ? 'active' : ''}`}
        >
          Global Contacts Directory
        </button>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === 'spaces' ? (
        <>
          {/* Create User Form Section */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={18} style={{ color: 'var(--color-sage)' }} /> Create User Account
            </h3>

            {formMsg.text && (
              <div style={{
                backgroundColor: formMsg.type === 'success' ? 'var(--color-sage-light)' : 'var(--color-rose-light)',
                color: formMsg.type === 'success' ? 'var(--color-sage)' : 'var(--color-rose)',
                padding: '10px',
                borderRadius: 'var(--radius-button)',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Full Name / Family Name</label>
                <input 
                  type="text" 
                  required
                  className="form-input" 
                  placeholder="e.g. Murtaza's Family"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={formLoading}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    required
                    className="form-input" 
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Login Password</label>
                  <input 
                    type="text" 
                    required
                    className="form-input" 
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', width: 'auto' }} disabled={formLoading}>
                <Plus size={16} /> {formLoading ? 'Creating User...' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* Tenants list */}
          <div style={{ padding: '10px 20px' }}>
            <h3 className="serif-font" style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Registered Family Spaces ({tenants.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tenants.map((t) => (
                <div 
                  key={t.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: 'var(--border-thin)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {t.display_name} {t.is_admin && <span style={{ fontSize: '10px', backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>SYSTEM ADMIN</span>}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.email}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Joined {new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Password viewing utility */}
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card-active)',
                    border: 'var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Password (AES-256)</span>
                      <code style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {decryptedPasswords[t.id] 
                          ? decryptedPasswords[t.id] 
                          : (decryptingId === t.id ? 'Decrypting...' : '•••••••••••••••• (Encrypted)')}
                      </code>
                    </div>
                    <button
                      onClick={() => togglePasswordVisibility(t.id, t.password_encrypted)}
                      disabled={decryptingId === t.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                      title={decryptedPasswords[t.id] ? 'Hide Password' : 'Decrypt Password'}
                    >
                      {decryptedPasswords[t.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Filters Bar */}
          <div style={{ padding: '0 20px 16px 20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search name, phone, email, or workspace..." 
                  style={{ paddingLeft: '36px', height: '40px', borderRadius: '10px' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Event Filter dropdown */}
              <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: '150px', height: '40px', borderRadius: '10px', fontSize: '13px' }}
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="birthday">Has Birthday</option>
                <option value="death">Has Wafaat / Passing</option>
                <option value="anniversary">Has Anniversary</option>
              </select>

              {/* Tenant Workspace Filter dropdown */}
              <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: '180px', height: '40px', borderRadius: '10px', fontSize: '13px' }}
                value={workspaceFilter}
                onChange={(e) => setWorkspaceFilter(e.target.value)}
              >
                <option value="all">All Workspaces</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>
            </div>

            {/* CSV Export button */}
            <button 
              onClick={exportToCSV}
              className="btn btn-secondary btn-press" 
              style={{ width: 'auto', height: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
              disabled={filteredContacts.length === 0}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Directory Contacts Table */}
          {contactsLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading global contacts directory...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: 'var(--border-card)', margin: '0 20px' }}>
              No contacts found matching the filters.
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone Number</th>
                    <th>Email Address</th>
                    <th>Date of Birth (DOB)</th>
                    <th>Wafaat / Passing</th>
                    <th>Special Dates</th>
                    <th>Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((c) => {
                    const gregDob = getEventDetails(c.events, 'birthday_gregorian');
                    const hijriDob = getEventDetails(c.events, 'birthday_hijri');
                    const gregDeath = getEventDetails(c.events, 'death_gregorian');
                    const hijriDeath = getEventDetails(c.events, 'death_hijri');
                    const weddingAnniv = getAnniversaryDetails(c.events);

                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
                        </td>
                        <td>{c.phone_number || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td>{c.email || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {gregDob && <span style={{ fontSize: '13px' }}>Greg: {gregDob}</span>}
                            {hijriDob && <span style={{ fontSize: '12px', color: 'var(--color-gold)', fontWeight: '500' }}>Hijri: {hijriDob}</span>}
                            {!gregDob && !hijriDob && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {gregDeath && <span style={{ fontSize: '13px' }}>Greg: {gregDeath}</span>}
                            {hijriDeath && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>Hijri: {hijriDeath}</span>}
                            {!gregDeath && !hijriDeath && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                          </div>
                        </td>
                        <td>
                          {weddingAnniv ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--color-rose)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Anniversary</span>
                              <span style={{ fontSize: '13px' }}>{weddingAnniv}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-waras" style={{ textTransform: 'none', fontWeight: '500' }}>
                            {c.added_by}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
