'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { saveTemplates } from './actions';
import { MessageSquare, Save, Link2, Copy, Check, QrCode, Share2 } from 'lucide-react';

export default function TemplatesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const renderPreviewBubble = (templateText: string, defaultPlaceholderText: string) => {
    const sampleName = "Murtaza Zakavi";
    const sampleAge = "28";
    const sampleOrdinal = "28th";
    
    const textToPreview = templateText || defaultPlaceholderText;
    const interpolated = textToPreview
      .replace(/{name}/g, sampleName)
      .replace(/{age}/g, sampleAge)
      .replace(/{ordinal}/g, sampleOrdinal);

    return (
      <div className="whatsapp-preview-container">
        <span style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Live Message Preview
        </span>
        <div className="whatsapp-bubble">
          {interpolated}
          <span className="whatsapp-time">
            {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
      </div>
    );
  };

  const handleSendTest = (templateText: string, defaultPlaceholderText: string) => {
    const text = templateText || defaultPlaceholderText;
    const sampleName = "Murtaza Zakavi";
    const sampleAge = "28";
    const sampleOrdinal = "28th";
    
    const interpolated = text
      .replace(/{name}/g, sampleName)
      .replace(/{age}/g, sampleAge)
      .replace(/{ordinal}/g, sampleOrdinal);
      
    navigator.clipboard.writeText(interpolated);
    triggerToast("Test message copied to clipboard!");
  };

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
    <div style={{ padding: '20px 0' }} className="page-transition">
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
        <div className="card" style={{ 
          padding: '20px', 
          border: '1.5px solid var(--color-gold)', 
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--color-gold-light) 100%)',
          boxShadow: '0 4px 12px rgba(196, 149, 58, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Link2 size={14} /> Directory Invitation Link
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Send this link to friends and family. Anyone visiting this link can submit their name, number, and dates to add them to your directory.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flex: 1, minWidth: '240px', gap: '8px' }}>
              <input 
                type="text" 
                readOnly 
                className="form-input" 
                style={{ flex: 1, backgroundColor: 'var(--bg-card)', fontSize: '12px', height: '38px', padding: '0 12px' }}
                value={shareUrl}
              />
              <button 
                onClick={() => { handleCopyLink(); triggerToast("Invitation link copied!"); }} 
                className="btn btn-secondary btn-press" 
                style={{ width: 'auto', padding: '0 14px', height: '38px' }}
                title="Copy Link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Hi! Please add your details and family milestones (birthdays, waras, anniversaries) to our family directory on Yaadi using this link: " + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-press"
                style={{
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  width: 'auto',
                  padding: '0 14px',
                  fontSize: '12px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.15)',
                  textDecoration: 'none'
                }}
              >
                <Share2 size={14} /> Share
              </a>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="btn btn-secondary btn-press"
                style={{
                  width: 'auto',
                  padding: '0 14px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <QrCode size={14} /> {showQr ? 'Hide QR' : 'QR Code'}
              </button>
            </div>
          </div>

          {showQr && (
            <div 
              className="page-transition"
              style={{ 
                marginTop: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '16px', 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: '12px', 
                border: '1px solid rgba(197, 160, 89, 0.2)',
                alignSelf: 'center',
                boxShadow: 'var(--shadow-soft)'
              }}
            >
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=c5a059&data=${encodeURIComponent(shareUrl)}`} 
                alt="QR Code" 
                style={{ width: '150px', height: '150px', borderRadius: '8px' }} 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Scan to add details instantly</span>
            </div>
          )}
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
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Gregorian Birthday Template</label>
              <button type="button" onClick={() => handleSendTest(tBirthdayG, "Happy {ordinal} Birthday, {name}! Wishing you a wonderful year filled with love, laughter, and success.")} className="btn btn-secondary btn-press" style={{ width: 'auto', padding: '4px 8px', fontSize: '10px', height: '24px' }}>
                Send Test
              </button>
            </div>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Happy {ordinal} Birthday, {name}! Wishing you a blessed day..."
              value={tBirthdayG}
              onChange={(e) => setTBirthdayG(e.target.value)}
            />
            {renderPreviewBubble(tBirthdayG, "Happy {ordinal} Birthday, {name}! Wishing you a wonderful year filled with love, laughter, and success.")}
          </div>

          {/* Hijri Birthday Template */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Hijri Birthday (Waras) Template</label>
              <button type="button" onClick={() => handleSendTest(tBirthdayH, "Mubarak on your {ordinal} Waras, {name}! Wishing you a blessed year ahead filled with health and happiness.")} className="btn btn-secondary btn-press" style={{ width: 'auto', padding: '4px 8px', fontSize: '10px', height: '24px' }}>
                Send Test
              </button>
            </div>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Mubarak on your {ordinal} Waras, {name}! Sending prayers and love..."
              value={tBirthdayH}
              onChange={(e) => setTBirthdayH(e.target.value)}
            />
            {renderPreviewBubble(tBirthdayH, "Mubarak on your {ordinal} Waras, {name}! Wishing you a blessed year ahead filled with health and happiness.")}
          </div>

          {/* Wedding Anniversary Template */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Wedding Anniversary Template</label>
              <button type="button" onClick={() => handleSendTest(tAnniversary, "Wishing you both a very Happy {ordinal} Wedding Anniversary, {name}! May your love continue to grow stronger each day.")} className="btn btn-secondary btn-press" style={{ width: 'auto', padding: '4px 8px', fontSize: '10px', height: '24px' }}>
                Send Test
              </button>
            </div>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Happy {ordinal} Anniversary, {name}! Wishing you a lifetime of joy..."
              value={tAnniversary}
              onChange={(e) => setTAnniversary(e.target.value)}
            />
            {renderPreviewBubble(tAnniversary, "Wishing you both a very Happy {ordinal} Wedding Anniversary, {name}! May your love continue to grow stronger each day.")}
          </div>

          {/* Gregorian Death Anniversary Template */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Gregorian Death Anniversary Template</label>
              <button type="button" onClick={() => handleSendTest(tDeathG, "Remembering {name} on their {ordinal} death anniversary today. You are forever in our hearts.")} className="btn btn-secondary btn-press" style={{ width: 'auto', padding: '4px 8px', fontSize: '10px', height: '24px' }}>
                Send Test
              </button>
            </div>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Remembering {name} on their {ordinal} death anniversary..."
              value={tDeathG}
              onChange={(e) => setTDeathG(e.target.value)}
            />
            {renderPreviewBubble(tDeathG, "Remembering {name} on their {ordinal} death anniversary today. You are forever in our hearts.")}
          </div>

          {/* Hijri Death Anniversary Template */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Hijri Death (Wafaat) Template</label>
              <button type="button" onClick={() => handleSendTest(tDeathH, "Remembering {name} on their {ordinal} Wafaat anniversary today. Sending our deepest thoughts and prayers.")} className="btn btn-secondary btn-press" style={{ width: 'auto', padding: '4px 8px', fontSize: '10px', height: '24px' }}>
                Send Test
              </button>
            </div>
            <textarea 
              className="form-input" 
              style={{ height: '70px', resize: 'none', lineHeight: '1.5' }}
              placeholder="Remembering {name} on their {ordinal} Wafaat anniversary..."
              value={tDeathH}
              onChange={(e) => setTDeathH(e.target.value)}
            />
            {renderPreviewBubble(tDeathH, "Remembering {name} on their {ordinal} Wafaat anniversary today. Sending our deepest thoughts and prayers.")}
          </div>
        </div>

        <div style={{ padding: '0 16px 24px 16px', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary btn-press" style={{ width: 'auto', minWidth: '180px' }}>
            <Save size={16} /> Save Templates
          </button>
        </div>
      </form>

      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="toast-popup page-slide-up">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
