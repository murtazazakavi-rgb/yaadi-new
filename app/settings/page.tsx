'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Check, AlertTriangle, KeyRound, User, Mail, Send, Share2 } from 'lucide-react';
import { getSettingsData, updateProfile, changePassword, updateReminderSettings, sendTestEmail, updateShareAnnouncements } from './actions';
import { getContactsWithEmailsCount, sendBroadcastEmail } from './broadcastActions';

const PRESETS = [
  {
    id: 'care_cards',
    label: 'Introduce Care Cards ("Know Me Better")',
    subject: "Help us know you better! Share your preferences",
    body: "Hi {first_name},\n\nWe have set up a family space on Yaadi. We want to know you better and support you in the best way possible. \n\nPlease click the link below to share your preferences, favorite things, and support style with us:\n{care_card_link}\n\nWarm regards,\n{workspace_name}"
  },
  {
    id: 'profile_pic',
    label: 'Request Profile Pictures',
    subject: "Please add your profile picture for our family tree",
    body: "Hi {first_name},\n\nWe are building our family tree and would love to have your picture displayed on it. \n\nPlease take a quick moment to click the link below and upload your profile picture:\n{care_card_link}\n\nThank you,\n{workspace_name}"
  },
  {
    id: 'verify_details',
    label: 'Verify Family Details',
    subject: "Please verify your birthday and contact details",
    body: "Hi {first_name},\n\nWe want to ensure our family reminders and milestones calendar are accurate. \n\nPlease review and verify your contact details and event dates here:\n{care_card_link}\n\nBest wishes,\n{workspace_name}"
  }
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  
  // Section 1: Profile
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Section 2: Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Section 3: Reminders
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [reminderDaysAhead, setReminderDaysAhead] = useState(7);
  const [reminderTypes, setReminderTypes] = useState<string[]>([]);
  const [additionalReminderEmails, setAdditionalReminderEmails] = useState('');
  const [updatingReminders, setUpdatingReminders] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Section 4: Public Share Announcements
  const [shareAnnouncementsEnabled, setShareAnnouncementsEnabled] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  // Section 5: Broadcast Announcements
  const [contactsWithEmailsCount, setContactsWithEmailsCount] = useState(0);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [sendingTestBroadcast, setSendingTestBroadcast] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettingsData();
      setDisplayName(data.displayName);
      setEmail(data.email);
      setEmailRemindersEnabled(data.emailRemindersEnabled);
      setReminderDaysAhead(data.reminderDaysAhead);
      setReminderTypes(data.reminderTypes);
      setAdditionalReminderEmails(data.additionalReminderEmails || '');
      setShareAnnouncementsEnabled(data.shareAnnouncementsEnabled);
      setTenantId(data.tenantId);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(`${origin}/share/announcements/${data.tenantId}`);
      
      const count = await getContactsWithEmailsCount();
      setContactsWithEmailsCount(count);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    if (!presetId) {
      setBroadcastSubject('');
      setBroadcastBody('');
      return;
    }
    const selected = PRESETS.find(p => p.id === presetId);
    if (selected) {
      setBroadcastSubject(selected.subject);
      setBroadcastBody(selected.body);
    }
  };

  const handleSendTestBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      triggerToast('Please enter both subject and body.');
      return;
    }
    setSendingTestBroadcast(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await sendBroadcastEmail({
        subject: broadcastSubject,
        bodyTemplate: broadcastBody,
        origin,
        isTest: true
      });
      if (res.success) {
        triggerToast(res.message);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to send test email.');
    } finally {
      setSendingTestBroadcast(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) {
      triggerToast('Please enter both subject and body.');
      return;
    }
    if (contactsWithEmailsCount === 0) {
      triggerToast('No contacts with email addresses registered.');
      return;
    }

    const confirmSend = window.confirm(
      `Are you sure you want to broadcast this email to all ${contactsWithEmailsCount} contacts? This action cannot be undone.`
    );
    if (!confirmSend) return;

    setSendingBroadcast(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await sendBroadcastEmail({
        subject: broadcastSubject,
        bodyTemplate: broadcastBody,
        origin,
        isTest: false
      });
      if (res.success) {
        triggerToast(res.message);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to send broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await updateProfile(displayName);
      triggerToast('Profile updated successfully!');
      // Force refresh layout to update display name in top header
      window.location.reload();
    } catch (err: any) {
      triggerToast(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      triggerToast('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleUpdateReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalReminderEmails.trim()) {
      const emailList = additionalReminderEmails.split(',').map(e => e.trim()).filter(Boolean);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of emailList) {
        if (!emailRegex.test(email)) {
          triggerToast(`Invalid email address: "${email}"`);
          return;
        }
      }
    }
    setUpdatingReminders(true);
    try {
      await updateReminderSettings({
        emailRemindersEnabled,
        reminderDaysAhead,
        reminderTypes,
        additionalReminderEmails
      });
      triggerToast('Preferences saved successfully!');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to save preferences.');
    } finally {
      setUpdatingReminders(false);
    }
  };

  const handleToggleReminderType = (type: string) => {
    if (reminderTypes.includes(type)) {
      setReminderTypes(reminderTypes.filter(t => t !== type));
    } else {
      setReminderTypes([...reminderTypes, type]);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTest(true);
    try {
      await sendTestEmail();
      triggerToast('Test email sent! Check your inbox.');
    } catch (err: any) {
      triggerToast(err.message || 'SMTP sending failed.');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings style={{ color: 'var(--color-gold)' }} /> Workspace Settings
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage your family space profile, security, and reminder notifications.
        </p>
      </div>

      <div className="reminders-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 16px' }}>
        
        {/* PROFILE SECTION */}
        <div className="card" style={{ margin: 0, padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} /> Profile Details
          </h4>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Workspace Display Name</label>
              <input 
                type="text" 
                required 
                className="form-input" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. MJZ's Family & Friends"
                disabled={updatingProfile}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address (Read-only)</label>
              <input 
                type="email" 
                readOnly 
                className="form-input" 
                value={email}
                style={{ backgroundColor: 'var(--bg-input)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Used for system log-ins and reminder digests.
              </span>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-press" 
              style={{ width: 'auto', minWidth: '150px', height: '38px', marginTop: '8px' }}
              disabled={updatingProfile}
            >
              {updatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* REMINDERS PREFERENCES */}
        <div className="card" style={{ margin: 0, padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} /> Reminder Notifications
          </h4>
          
          <form onSubmit={handleUpdateReminders}>
            {/* Email Reminders Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: 'var(--border-light)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>Email Notifications</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Daily digest sent to your registered email</span>
              </div>
              <div 
                className={`switch-track ${emailRemindersEnabled ? 'active' : ''}`}
                onClick={() => setEmailRemindersEnabled(!emailRemindersEnabled)}
              >
                <div className="switch-thumb" />
              </div>
            </div>

            {emailRemindersEnabled && (
              <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Warning window dropdown */}
                <div className="form-group">
                  <label className="form-label">Days Ahead Warning Buffer</label>
                  <select 
                    className="form-select" 
                    value={reminderDaysAhead}
                    onChange={(e) => setReminderDaysAhead(parseInt(e.target.value))}
                  >
                    <option value={1}>1 Day in advance</option>
                    <option value={3}>3 Days in advance</option>
                    <option value={7}>7 Days in advance (Recommended)</option>
                    <option value={14}>14 Days in advance</option>
                    <option value={30}>30 Days in advance</option>
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Digest emails will display warnings for milestones upcoming in this window.
                  </span>
                </div>

                {/* Event Types to alert */}
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '10px' }}>Select Event Reminders to Receive</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'birthday_gregorian', label: 'Gregorian Birthday' },
                      { id: 'birthday_hijri', label: 'Hijri Birthday (Waras)' },
                      { id: 'anniversary', label: 'Wedding Anniversary' },
                      { id: 'death_gregorian', label: 'Gregorian Death Anniversary' },
                      { id: 'death_hijri', label: 'Hijri Death Anniversary (Wafaat)' },
                    ].map(ev => {
                      const checked = reminderTypes.includes(ev.id);
                      return (
                        <label 
                          key={ev.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            fontSize: '13px', 
                            cursor: 'pointer',
                            color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => handleToggleReminderType(ev.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span>{ev.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Reminder Emails */}
                <div className="form-group">
                  <label className="form-label">Additional Reminder Emails</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="spouse@example.com, sibling@example.com"
                    value={additionalReminderEmails}
                    onChange={(e) => setAdditionalReminderEmails(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Enter email addresses separated by commas to send them the same daily reminders.
                  </span>
                </div>

                {/* Manual SMTP Test email */}
                <div style={{ borderTop: 'var(--border-light)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>SMTP Health Check</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Send a manual test reminder email to verify SMTP logs</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    className="btn btn-secondary btn-press"
                    style={{ width: 'auto', padding: '0 16px', height: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', alignSelf: 'flex-start' }}
                    disabled={sendingTest}
                  >
                    <Send size={12} /> {sendingTest ? 'Sending Test...' : 'Send Test Email'}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary btn-press" 
              style={{ width: 'auto', minWidth: '180px', height: '38px', marginTop: '20px' }}
              disabled={updatingReminders}
            >
              {updatingReminders ? 'Saving...' : 'Save Reminder Preferences'}
            </button>
          </form>
        </div>

        {/* SHARED ANNOUNCEMENT LINK SECTION */}
        <div className="card" style={{ margin: 0, padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={16} /> Shared Announcement Link
          </h4>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: 'var(--border-light)' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>Public Announcement Page</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Generate a public, read-only list of today's and this week's celebrations</span>
            </div>
            <div 
              className={`switch-track ${shareAnnouncementsEnabled ? 'active' : ''}`}
              onClick={async () => {
                const newValue = !shareAnnouncementsEnabled;
                setShareAnnouncementsEnabled(newValue);
                try {
                  await updateShareAnnouncements(newValue);
                  triggerToast(newValue ? 'Shared announcement link enabled!' : 'Shared announcement link disabled.');
                } catch (err: any) {
                  setShareAnnouncementsEnabled(!newValue); // rollback
                  triggerToast(err.message || 'Failed to update sharing preference.');
                }
              }}
              style={{ flexShrink: 0, cursor: 'pointer' }}
            >
              <div className="switch-thumb" />
            </div>
          </div>

          {shareAnnouncementsEnabled && (
            <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Your Shareable Link</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly 
                    className="form-input" 
                    value={shareUrl}
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px', flex: 1 }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-press" 
                    style={{ width: 'auto', padding: '0 16px', height: '38px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(shareUrl);
                        triggerToast('Link copied to clipboard!');
                      } else {
                        triggerToast('Clipboard not supported, please copy manually.');
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                  Anyone with this link can view the current week's celebrations. Perfect to pin in family group descriptions or email footers!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BROADCAST FEATURE ANNOUNCEMENTS */}
        <div className="card" style={{ margin: 0, padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} /> Broadcast Feature Updates
          </h4>

          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '16px', lineHeight: '1.4' }}>
            Send an email notification about new app features (like Care Cards, or requesting profile picture uploads) to all contacts.
          </span>

          <form onSubmit={handleSendBroadcast}>
            {/* Recipient Count Indicator */}
            <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', border: 'var(--border-light)' }}>
              📢 This broadcast email will be sent to <strong>{contactsWithEmailsCount}</strong> contact{contactsWithEmailsCount === 1 ? '' : 's'} with registered email addresses.
            </div>

            {/* Template Presets Dropdown */}
            <div className="form-group">
              <label className="form-label">Template Preset</label>
              <select
                className="form-select"
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
              >
                <option value="">-- Choose a preset template or compose custom --</option>
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Email Subject */}
            <div className="form-group">
              <label className="form-label">Email Subject</label>
              <input
                type="text"
                required
                className="form-input"
                value={broadcastSubject}
                onChange={(e) => {
                  setBroadcastSubject(e.target.value);
                  setSelectedPreset(''); // clear preset highlight on manual edits
                }}
                placeholder="e.g. Help us know you better! Share your preferences"
              />
            </div>

            {/* Email Body */}
            <div className="form-group">
              <label className="form-label">Email Body</label>
              <textarea
                required
                className="form-input"
                rows={8}
                value={broadcastBody}
                onChange={(e) => {
                  setBroadcastBody(e.target.value);
                  setSelectedPreset(''); // clear preset highlight on manual edits
                }}
                placeholder="Compose your email here. You can use placeholders: {first_name}, {last_name}, {care_card_link}, {workspace_name}"
                style={{ resize: 'vertical', fontSize: '13px', fontFamily: 'inherit', padding: '10px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                <strong>Dynamic Placeholders:</strong> <code>{'{first_name}'}</code>, <code>{'{last_name}'}</code>, <code>{'{care_card_link}'}</code>, <code>{'{workspace_name}'}</code>. They will automatically be replaced with each contact's custom details and unique link.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSendTestBroadcast}
                className="btn btn-secondary btn-press"
                style={{ width: 'auto', minWidth: '160px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                disabled={sendingTestBroadcast || sendingBroadcast}
              >
                <Send size={14} /> {sendingTestBroadcast ? 'Sending Test...' : 'Send Test to Myself'}
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-press"
                style={{ width: 'auto', minWidth: '180px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
                disabled={sendingBroadcast || sendingTestBroadcast || contactsWithEmailsCount === 0}
              >
                <Share2 size={14} /> {sendingBroadcast ? 'Broadcasting...' : 'Broadcast to Contacts'}
              </button>
            </div>
          </form>
        </div>


        {/* SECURITY / PASSWORD CHANGING */}
        <div className="card" style={{ margin: 0, padding: '20px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gold)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Account Security
          </h4>

          {passwordError && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '10px 12px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <AlertTriangle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={updatingPassword}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={updatingPassword}
                />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Verify new password"
                  disabled={updatingPassword}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-press" 
              style={{ width: 'auto', minWidth: '160px', height: '38px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={updatingPassword}
            >
              <KeyRound size={14} /> {updatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

      </div>

      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className="toast-popup page-slide-up">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
