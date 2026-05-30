'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
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
    <div className="page-transition" style={{
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
        {/* Brand Logo & Name */}
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Yaadi Logo" 
            style={{ 
              height: 'auto', 
              width: '100%',
              maxWidth: '180px',
              objectFit: 'contain',
              marginBottom: '8px'
            }} 
          />
        </div>

        {/* Login Card */}
        <div className="card" style={{ margin: 0, padding: '24px', textAlign: 'left' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '20px', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
            Welcome Back
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Entering...' : 'Log In'}
            </button>
          </form>
        </div>

        {/* Registration Footer */}
        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Don't have a space?{' '}
          <Link href="/register" style={{ color: 'var(--color-gold)', fontWeight: '500', textDecoration: 'none' }}>
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}
