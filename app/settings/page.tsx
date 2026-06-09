'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Check, AlertTriangle, KeyRound, User, Mail, Send, Share2 } from 'lucide-react';
import { getSettingsData, updateProfile, changePassword, updateReminderSettings, sendTestEmail, updateShareAnnouncements } from './actions';

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
  const [updatingReminders, setUpdatingReminders] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Section 4: Public Share Announcements
  const [shareAnnouncementsEnabled, setShareAnnouncementsEnabled] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [shareUrl, setShareUrl] = useState('');

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
      setShareAnnouncementsEnabled(data.shareAnnouncementsEnabled);
      setTenantId(data.tenantId);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setShareUrl(`${origin}/share/announcements/${data.tenantId}`);
    } catch (err) {
      console.error(err);
      triggerToast('Failed to load settings.');
    } finally {
      setLoading(false);
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
    setUpdatingReminders(true);
    try {
      await updateReminderSettings({
        emailRemindersEnabled,
        reminderDaysAhead,
        reminderTypes
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
