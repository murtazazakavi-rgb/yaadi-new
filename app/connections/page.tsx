'use client';

import React, { useState, useEffect } from 'react';
import { 
  getConnections, 
  sendConnectionRequest, 
  respondToConnectionRequest, 
  removeConnection,
  getSharingStatus,
  updateSharedContacts
} from './actions';
import { Share2, UserPlus, Check, X, ShieldAlert, Link2, Trash2, Search } from 'lucide-react';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<{ outgoing: any[]; incoming: any[]; active: any[] }>({
    outgoing: [],
    incoming: [],
    active: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Send request form states
  const [email, setEmail] = useState('');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Sharing Modal states
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [sharingContacts, setSharingContacts] = useState<any[]>([]);
  const [sharingSearchQuery, setSharingSearchQuery] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [savingSharing, setSavingSharing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getConnections();
      setConnections(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load connections.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });
    setFormLoading(true);

    try {
      await sendConnectionRequest(email);
      setFormMsg({ type: 'success', text: 'Connection request sent successfully.' });
      setEmail('');
      loadData();
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to send request.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    try {
      await respondToConnectionRequest(requestId, accept);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request.');
    }
  };

  const handleDisconnect = async (connId: string) => {
    if (confirm('Are you sure you want to disconnect? You will stop sharing contacts with each other immediately.')) {
      try {
        await removeConnection(connId);
        loadData();
      } catch (err: any) {
        alert(err.message || 'Failed to disconnect.');
      }
    }
  };

  const handleOpenSharing = async (conn: any) => {
    setSelectedConnection(conn);
    setShowSharingModal(true);
    setSharingLoading(true);
    try {
      const list = await getSharingStatus(conn.id);
      setSharingContacts(list);
    } catch (err: any) {
      alert(err.message || 'Failed to load contacts for sharing.');
      setShowSharingModal(false);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleToggleContactShare = (contactId: string) => {
    setSharingContacts(prev => 
      prev.map(c => c.id === contactId ? { ...c, isShared: !c.isShared } : c)
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSharingContacts(prev => 
      prev.map(c => ({ ...c, isShared: select }))
    );
  };

  const handleSaveSharing = async () => {
    if (!selectedConnection) return;
    setSavingSharing(true);
    try {
      const selectedIds = sharingContacts.filter(c => c.isShared).map(c => c.id);
      await updateSharedContacts(selectedConnection.id, selectedIds);
      setShowSharingModal(false);
      setSelectedConnection(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save sharing settings.');
    } finally {
      setSavingSharing(false);
    }
  };

  const filteredSharingContacts = sharingContacts.filter(c => 
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(sharingSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading connections...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Title Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 style={{ color: 'var(--color-gold)' }} /> Contact Sharing Connections
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Connect with other family accounts and choose exactly which contacts to share with each other.
        </p>
      </div>

      {error && (
        <div style={{ margin: '0 20px 20px 20px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', padding: '12px', borderRadius: 'var(--radius-button)', fontSize: '12px' }}>
          {error}
        </div>
      )}

      {/* Send Connection Request Form */}
      <div className="card" style={{ padding: '20px', margin: '0 20px 20px 20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserPlus size={18} style={{ color: 'var(--color-sage)' }} /> Request Sharing Connection
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

        <form onSubmit={handleSendRequest} style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 240px', marginBottom: 0 }}>
            <label className="form-label">Email of family user to connect with</label>
            <input 
              type="email" 
              required
              className="form-input" 
              placeholder="family.name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formLoading}
              style={{ width: '100%' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '42px', padding: '0 20px', width: 'auto', flex: '0 0 auto' }} 
            disabled={formLoading}
          >
            Send Request
          </button>
        </form>
      </div>

      {/* Incoming Requests */}
      {connections.incoming.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <h3 className="serif-font" style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            Incoming Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {connections.incoming.map((req) => (
              <div key={req.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px' }}>{req.display_name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.email}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleRespond(req.id, true)} className="btn btn-secondary" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', border: 'none' }}>
                    <Check size={14} /> Accept
                  </button>
                  <button onClick={() => handleRespond(req.id, false)} className="btn btn-secondary" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', border: 'none' }}>
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {connections.outgoing.length > 0 && (
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <h3 className="serif-font" style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--text-primary)' }}>
            Outgoing Pending Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {connections.outgoing.map((req) => (
              <div key={req.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px' }}>{req.display_name}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.email}</span>
                </div>
                <button onClick={() => handleRespond(req.id, false)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={14} /> Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Connections */}
      <div style={{ padding: '0 20px' }}>
        <h3 className="serif-font" style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Active Shared Spaces ({connections.active.length})
        </h3>
        
        {connections.active.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
            You do not have any active connections yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {connections.active.map((conn) => (
              <div key={conn.id} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{conn.display_name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{conn.email}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleOpenSharing(conn)} 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Link2 size={15} /> Manage Sharing
                  </button>
                  <button 
                    onClick={() => handleDisconnect(conn.id)} 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-rose)' }}
                  >
                    <Trash2 size={15} /> Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sharing Selection Modal */}
      {showSharingModal && selectedConnection && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 className="serif-font" style={{ fontSize: '22px', color: 'var(--text-primary)' }}>
                  Share Contacts
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Select which contacts to share with <strong>{selectedConnection.display_name}</strong>.
                </p>
              </div>
              <button 
                onClick={() => setShowSharingModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Contacts list search */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search your contacts..." 
                style={{ paddingLeft: '36px', height: '36px' }}
                value={sharingSearchQuery}
                onChange={(e) => setSharingSearchQuery(e.target.value)}
              />
            </div>

            {/* Select all / Deselect all */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
              <button onClick={() => handleSelectAll(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold)', fontWeight: '600' }}>
                Select All
              </button>
              <button onClick={() => handleSelectAll(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: '600' }}>
                Deselect All
              </button>
            </div>

            {/* Scrollable list of contacts with checkbox toggles */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', paddingRight: '4px' }}>
              {sharingLoading ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading contacts list...
                </div>
              ) : filteredSharingContacts.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                  No contacts match your query.
                </div>
              ) : (
                filteredSharingContacts.map((c) => (
                  <label 
                    key={c.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: c.isShared ? 'rgba(197, 160, 89, 0.04)' : '#FAF9F6',
                      border: c.isShared ? '1px solid rgba(197, 160, 89, 0.2)' : '1px solid rgba(0,0,0,0.03)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      userSelect: 'none'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: 'var(--color-gold)',
                        cursor: 'pointer'
                      }}
                      checked={c.isShared}
                      onChange={() => handleToggleContactShare(c.id)}
                    />
                    <span>{c.firstName} {c.lastName}</span>
                  </label>
                ))
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowSharingModal(false)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                disabled={savingSharing}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSharing} 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={savingSharing || sharingLoading}
              >
                {savingSharing ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
