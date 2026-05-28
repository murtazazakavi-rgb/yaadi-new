'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '24px',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        textAlign: 'center'
      }}>
        {/* Brand Header */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          <h2 style={{ 
            fontSize: '28px', 
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500
          }}>
            Create Your Space
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Set up an isolated directory for your family.
          </p>
        </div>

        {/* Register Card */}
        <div className="card" style={{ margin: 0, padding: '24px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
            Account Details
          </h3>

          {error && (
            <div style={{
              backgroundColor: 'var(--color-rose-light)',
              color: 'var(--color-rose)',
              padding: '10px',
              borderRadius: 'var(--radius-button)',
              fontSize: '12px',
              marginBottom: '16px',
              border: '1px solid rgba(214, 168, 164, 0.3)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Display Name / Family Name</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                placeholder="e.g. Murtaza's Family"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                required 
                className="form-input" 
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="Make it secure"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Initializing Space...' : 'Register'}
            </button>
          </form>
        </div>

        {/* Login Footer */}
        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/" style={{ color: 'var(--color-gold)', fontWeight: '500', textDecoration: 'none' }}>
            Log in instead
          </Link>
        </p>
      </div>
    </div>
  );
}
