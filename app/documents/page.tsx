'use client';

import React, { useState, useEffect } from 'react';
import { getDocuments, createDocument, updateDocument, deleteDocument, toggleArchiveDocument } from './actions';
import { getDashboardData } from '@/app/dashboard/actions';
import { DOCUMENT_TYPES, getDocumentTypeLabel } from '@/lib/documentTypes';
import { 
  Search, Plus, Edit, Trash2, FolderOpen, FileText, Calendar, X, 
  Archive, User, AlertTriangle, CheckCircle, Eye, RefreshCw, Trash, Info
} from 'lucide-react';
import Portal from '@/app/components/Portal';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedContactFilter, setSelectedContactFilter] = useState('');

  // Form Drawer States
  const [showForm, setShowForm] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Form Fields
  const [contactId, setContactId] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const docs = await getDocuments();
      const dashboard = await getDashboardData();
      
      setDocuments(docs);
      // Only allow linking documents to contacts owned by this tenant
      const ownContacts = dashboard.contacts.filter((c: any) => c.is_owner !== false);
      setContacts(ownContacts);
    } catch (err) {
      console.error('Error loading documents page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDocId(null);
    setContactId('');
    setDocumentType('');
    setDocumentNumber('');
    setIssueDate('');
    setExpiryDate('');
    setReviewDate('');
    setNotes('');
    setShowForm(true);
  };

  const handleOpenEdit = (doc: any) => {
    setEditingDocId(doc.id);
    setContactId(doc.contact_id || '');
    setDocumentType(doc.document_type);
    setDocumentNumber(doc.document_number || '');
    
    // Format date strings to YYYY-MM-DD for HTML input
    setIssueDate(doc.issue_date ? new Date(doc.issue_date).toISOString().split('T')[0] : '');
    setExpiryDate(doc.expiry_date ? new Date(doc.expiry_date).toISOString().split('T')[0] : '');
    setReviewDate(doc.review_date ? new Date(doc.review_date).toISOString().split('T')[0] : '');
    setNotes(doc.notes || '');
    setShowForm(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentType) {
      alert('Document type is required.');
      return;
    }

    const payload = {
      contactId: contactId || null,
      documentType,
      documentNumber: documentNumber.trim(),
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      reviewDate: reviewDate || null,
      notes: notes.trim(),
    };

    try {
      if (editingDocId) {
        await updateDocument(editingDocId, payload);
      } else {
        await createDocument(payload);
      }
      setShowForm(false);
      loadAllData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving document reminder.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this document reminder?')) {
      try {
        await deleteDocument(id);
        loadAllData();
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Error deleting document.');
      }
    }
  };

  const handleToggleArchive = async (id: string, currentArchiveState: boolean) => {
    const actionText = currentArchiveState ? 'restore' : 'archive';
    if (confirm(`Are you sure you want to ${actionText} this document reminder?`)) {
      try {
        await toggleArchiveDocument(id, !currentArchiveState);
        loadAllData();
      } catch (err: any) {
        console.error(err);
        alert(err.message || `Error trying to ${actionText} document.`);
      }
    }
  };

  // Helper date formatter
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Expiry alert status logic
  const getExpiryStatus = (expiryDateStr: string | null | undefined) => {
    if (!expiryDateStr) {
      return { 
        label: 'No Expiry', 
        color: 'var(--text-muted)', 
        bg: 'rgba(0,0,0,0.03)', 
        border: '1px solid rgba(0,0,0,0.05)',
        icon: <Info size={12} />
      };
    }
    
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    expiry.setHours(0,0,0,0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        label: `Expired (${Math.abs(diffDays)}d ago)`, 
        color: 'var(--color-rose)', 
        bg: 'var(--color-rose-light)', 
        border: '1px solid rgba(196, 91, 122, 0.2)',
        icon: <AlertTriangle size={12} />
      };
    } else if (diffDays === 0) {
      return { 
        label: 'Expires Today', 
        color: 'var(--color-rose)', 
        bg: 'var(--color-rose-light)', 
        border: '1px solid rgba(196, 91, 122, 0.3)',
        icon: <AlertTriangle size={12} />
      };
    } else if (diffDays <= 30) {
      return { 
        label: `Expires in ${diffDays}d`, 
        color: 'var(--color-rose)', 
        bg: 'var(--color-rose-light)', 
        border: '1px solid rgba(196, 91, 122, 0.2)',
        icon: <AlertTriangle size={12} />
      };
    } else if (diffDays <= 90) {
      return { 
        label: `Expires in ${diffDays}d`, 
        color: 'var(--color-gold)', 
        bg: 'var(--color-gold-light)', 
        border: '1px solid rgba(196, 149, 58, 0.2)',
        icon: <AlertTriangle size={12} />
      };
    } else {
      return { 
        label: `Expires in ${diffDays}d`, 
        color: 'var(--color-sage)', 
        bg: 'var(--color-sage-light)', 
        border: '1px solid rgba(107, 142, 110, 0.2)',
        icon: <CheckCircle size={12} />
      };
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    // 1. Tab active/archived state
    const matchesTab = filterTab === 'active' ? !doc.is_archived : doc.is_archived;
    if (!matchesTab) return false;

    // 2. Document type filter
    if (selectedTypeFilter && doc.document_type !== selectedTypeFilter) return false;

    // 3. Contact filter
    if (selectedContactFilter && doc.contact_id !== selectedContactFilter) return false;

    // 4. Search query
    const docTypeLabel = getDocumentTypeLabel(doc.document_type).toLowerCase();
    const docNum = (doc.document_number || '').toLowerCase();
    const contactName = `${doc.first_name || ''} ${doc.middle_name || ''} ${doc.last_name || ''}`.toLowerCase();
    const notesStr = (doc.notes || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    if (query) {
      return docTypeLabel.includes(query) || 
             docNum.includes(query) || 
             contactName.includes(query) || 
             notesStr.includes(query);
    }

    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading documents registry...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Page Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)' }}>
            Family Documents
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Track expiry dates and document reminders for your family members.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ width: 'auto', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }} 
          onClick={handleOpenAdd}
        >
          <Plus size={16} /> Add Document
        </button>
      </div>

      {/* Directory Search & Filters */}
      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: 'var(--border-thin)', boxShadow: 'var(--shadow-soft)' }}
            placeholder="Search documents by type, number, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X 
              size={16} 
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }} 
              onClick={() => setSearchQuery('')}
            />
          )}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            className="form-select"
            style={{ flex: 1, height: '38px', borderRadius: '10px', fontSize: '12px', backgroundColor: 'var(--bg-card)' }}
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <option value="">All Document Types</option>
            {DOCUMENT_TYPES.map(type => (
              <option key={type.key} value={type.key}>{type.label}</option>
            ))}
          </select>

          <select 
            className="form-select"
            style={{ flex: 1, height: '38px', borderRadius: '10px', fontSize: '12px', backgroundColor: 'var(--bg-card)' }}
            value={selectedContactFilter}
            onChange={(e) => setSelectedContactFilter(e.target.value)}
          >
            <option value="">All Family Members</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="segmented-control" style={{ margin: '0 16px 16px 16px', width: 'calc(100% - 32px)' }}>
        <button 
          type="button"
          onClick={() => setFilterTab('active')} 
          className={`segmented-control-item ${filterTab === 'active' ? 'active' : ''}`}
        >
          Active
        </button>
        <button 
          type="button"
          onClick={() => setFilterTab('archived')} 
          className={`segmented-control-item ${filterTab === 'archived' ? 'active' : ''}`}
        >
          Archived ({documents.filter(d => d.is_archived).length})
        </button>
      </div>

      {/* Documents Grid / List */}
      <div className="contacts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredDocuments.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FolderOpen size={48} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            <p style={{ fontSize: '14px' }}>No documents found matching filters.</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiry_date);
            const typeLabel = getDocumentTypeLabel(doc.document_type);
            const contactName = doc.contact_id 
              ? `${doc.first_name}${doc.middle_name ? ' ' + doc.middle_name : ''} ${doc.last_name}`
              : 'Family Space (Unlinked)';

            return (
              <div 
                key={doc.id} 
                className="card"
                style={{
                  margin: '0 16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'rgba(197, 160, 89, 0.15)'
                }}
              >
                {/* Card Title Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 className="serif-font" style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {typeLabel}
                      </h3>
                      {/* Expiry Badge */}
                      <span 
                        style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: expiryStatus.bg,
                          color: expiryStatus.color,
                          border: expiryStatus.border,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {expiryStatus.icon}
                        {expiryStatus.label}
                      </span>
                    </div>
                    
                    {/* Linked Contact */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <User size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{contactName}</span>
                    </div>
                  </div>

                  {/* Actions Dropdown/Row */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                      onClick={() => handleOpenEdit(doc)}
                      title="Edit Document"
                    >
                      <Edit size={15} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                      onClick={() => handleToggleArchive(doc.id, doc.is_archived)}
                      title={doc.is_archived ? "Restore Document" : "Archive Document"}
                    >
                      <Archive size={15} />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)', padding: '4px' }}
                      onClick={() => handleDelete(doc.id)}
                      title="Delete Permanently"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Dates & Reference Section */}
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '10px',
                    backgroundColor: 'var(--bg-primary)', 
                    padding: '10px 12px',
                    borderRadius: '10px',
                    fontSize: '12px'
                  }}
                >
                  {doc.document_number && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doc Number</strong>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontWeight: '500' }}>
                        {doc.document_number}
                      </span>
                    </div>
                  )}
                  {doc.issue_date && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Issue Date</strong>
                      <span style={{ color: 'var(--text-primary)' }}>{formatDate(doc.issue_date)}</span>
                    </div>
                  )}
                  {doc.expiry_date && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expiry Date</strong>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{formatDate(doc.expiry_date)}</span>
                    </div>
                  )}
                  {doc.review_date && (
                    <div>
                      <strong style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review/Alert Date</strong>
                      <span style={{ color: 'var(--text-primary)' }}>{formatDate(doc.review_date)}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {doc.notes && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                    <strong style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Notes</strong>
                    {doc.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Drawer Modal (Bottom Sheet on mobile, centered on desktop) */}
      {showForm && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              borderRadius: '24px 24px 0 0', 
              padding: '24px',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '22px', fontWeight: '600' }}>
                {editingDocId ? 'Edit Document Reminder' : 'Add Document Reminder'}
              </h3>
              <button onClick={() => setShowForm(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Document Type Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Document Type *</label>
                <select 
                  className="form-select" 
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Family Contact Select */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Link Family Member</label>
                <select 
                  className="form-select" 
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                >
                  <option value="">No link (General Family Space)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.middle_name ? c.middle_name + ' ' : ''}{c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Reference Number */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Document Reference Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={
                    DOCUMENT_TYPES.find(t => t.key === documentType)?.placeholderNumber || 'Enter reference number...'
                  }
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>

              {/* Grid of Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Issue Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expiry Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Alert Review Date */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alert / Review Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Choose a date to receive an early notification before the actual expiry.
                </span>
              </div>

              {/* Form Notes */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-textarea" 
                  rows={3} 
                  placeholder="Any details, renewal offices, or website links..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }}
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
