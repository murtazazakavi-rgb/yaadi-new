'use client';

import React, { useState, useEffect } from 'react';
import { getTenants, createTenant, decryptPassword } from './actions';
import { ShieldCheck, Eye, EyeOff, Plus, UserPlus } from 'lucide-react';

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
      // Hide if already decrypted
      const updated = { ...decryptedPasswords };
      delete updated[tenantId];
      setDecryptedPasswords(updated);
    } else {
      // Decrypt and show
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
    <div style={{ padding: '20px 0' }}>
      {/* Title Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck style={{ color: 'var(--color-gold)' }} /> System Administration
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage multi-tenant family spaces and credentials.
        </p>
      </div>

      {error && (
        <div style={{ margin: '0 20px 20px 20px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', padding: '12px', borderRadius: 'var(--radius-button)', fontSize: '12px' }}>
          {error}
        </div>
      )}

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

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={formLoading}>
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
                backgroundColor: '#FAF9F6',
                border: '1px solid rgba(0,0,0,0.03)',
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
    </div>
  );
}
