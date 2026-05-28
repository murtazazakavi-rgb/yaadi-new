'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { saveTemplates } from './actions';
import { MessageSquare, Save, Link2, Copy, Check } from 'lucide-react';

export default function TemplatesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Template inputs
  const [tBirthdayG, setTBirthdayG] = useState('');
  const [tBirthdayH, setTBirthdayH] = useState('');
  const [tAnniversary, setTAnniversary] = useState('');
  const [tDeathG, setTDeathG] = useState('');
  const [tDeathH, setTDeathH] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getDashboardData();
      setData(res);

      // Extract template values
      const bG = res.templates.find((t: any) => t.event_type === 'birthday_gregorian')?.message_body || '';
      const bH = res.templates.find((t: any) => t.event_type === 'birthday_hijri')?.message_body || '';
      const ann = res.templates.find((t: any) => t.event_type === 'anniversary')?.message_body || '';
      const dG = res.templates.find((t: any) => t.event_type === 'death_gregorian')?.message_body || '';
      const dH = res.templates.find((t: any) => t.event_type === 'death_hijri')?.message_body || '';

      setTBirthdayG(bG);
      setTBirthdayH(bH);
      setTAnniversary(ann);
      setTDeathG(dG);
      setTDeathH(dH);

      // Retrieve current session user ID on client side to build invitation link
      const authRes = await fetch('/api/auth/login', { method: 'GET' }).catch(() => null);
      // Construct public link based on hostname
      const host = window.location.origin;
      // We can fetch tenant info from a cookie decode or api, but we can write a simple endpoint to get session details or embed it
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      if (session?.userId) {
        setShareUrl(`${host}/share/${session.userId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = [
      { eventType: 'birthday_gregorian', messageBody: tBirthdayG },
      { eventType: 'birthday_hijri', messageBody: tBirthdayH },
      { eventType: 'anniversary', messageBody: tAnniversary },
      { eventType: 'death_gregorian', messageBody: tDeathG },
      { eventType: 'death_hijri', messageBody: tDeathH },
    ];

    try {
      await saveTemplates(payload);
      alert('Templates saved successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to save templates.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading message templates...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare style={{ color: 'var(--color-gold)' }} /> WhatsApp Templates
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Configure pre-filled greetings and invitation links.
        </p>
      </div>

      {/* Share Invitation Link Section */}
      {shareUrl && (
        <div className="card" style={{ padding: '16px', backgroundColor: 'var(--color-gold-light)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link2 size={14} /> Directory Invitation Link
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Send this link to friends and family. Anyone visiting this link can submit their name, number, and dates to add them to your directory.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              readOnly 
              className="form-input" 
              style={{ flex: 1, backgroundColor: '#FFFFFF', fontSize: '12px', height: '36px' }}
              value={shareUrl}
            />
            <button 
              onClick={handleCopyLink} 
              className="btn btn-secondary" 
              style={{ width: 'auto', padding: '0 12px', height: '36px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Templates Editor Form */}
      <form onSubmit={handleSave} style={{ marginTop: '20px' }}>
        <div style={{ padding: '0 20px 12px 20px' }}>
          <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.8px' }}>Template Instructions</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
            You can use the following placeholders in your drafts. They will be replaced dynamically when launching a message:<br />
            <code>{'{name}'}</code> ➡️ Contact's full name<br />
            <code>{'{age}'}</code> ➡️ Calculated event age (e.g. 28)<br />
            <code>{'{ordinal}'}</code> ➡️ Calculated ordinal year (e.g. 28th)
          </p>
        </div>

        <div className="templates-grid">
          {/* Gregorian Birthday Template */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>Gregorian Birthday Template</label>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Happy {ordinal} Birthday, {name}! Wishing you a blessed day..."
              value={tBirthdayG}
              onChange={(e) => setTBirthdayG(e.target.value)}
            />
          </div>

          {/* Hijri Birthday Template */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>Hijri Birthday (Waras) Template</label>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Mubarak on your {ordinal} Waras, {name}! Sending prayers and love..."
              value={tBirthdayH}
              onChange={(e) => setTBirthdayH(e.target.value)}
            />
          </div>

          {/* Wedding Anniversary Template */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>Wedding Anniversary Template</label>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Happy {ordinal} Anniversary, {name}! Wishing you a lifetime of joy..."
              value={tAnniversary}
              onChange={(e) => setTAnniversary(e.target.value)}
            />
          </div>

          {/* Gregorian Death Anniversary Template */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>Gregorian Death Anniversary Template</label>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Remembering {name} on their {ordinal} death anniversary..."
              value={tDeathG}
              onChange={(e) => setTDeathG(e.target.value)}
            />
          </div>

          {/* Hijri Death Anniversary Template */}
          <div className="card">
            <label className="form-label" style={{ marginBottom: '8px' }}>Hijri Death (Wafaat) Template</label>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Remembering {name} on their {ordinal} Wafaat anniversary..."
              value={tDeathH}
              onChange={(e) => setTDeathH(e.target.value)}
            />
          </div>
        </div>

        <div style={{ padding: '0 16px 24px 16px', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', minWidth: '180px' }}>
            <Save size={16} /> Save Templates
          </button>
        </div>
      </form>
    </div>
  );
}
