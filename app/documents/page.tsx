'use client';

import React, { useState, useEffect } from 'react';
import { 
  getDocuments, createDocument, updateDocument, deleteDocument, 
  toggleArchiveDocument, deleteAttachment, getAttachmentContent, parseDocumentFile 
} from './actions';
import { getDashboardData } from '@/app/dashboard/actions';
import { DOCUMENT_TYPES, getDocumentTypeLabel } from '@/lib/documentTypes';
import { 
  Search, Plus, Edit, Trash2, FolderOpen, FileText, Calendar, X, 
  Archive, User, AlertTriangle, CheckCircle, Eye, RefreshCw, Trash, Info,
  Paperclip, Download, Loader2
} from 'lucide-react';
import Portal from '@/app/components/Portal';

// Helper for client-side image compression
function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<{ base64: string; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          base64: e.target?.result as string,
          compressedSize: file.size
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        const stringLength = compressedBase64.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = Math.round(stringLength * 0.75);

        resolve({
          base64: compressedBase64,
          compressedSize: sizeInBytes
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Format file size utility
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

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

  // Attachment & Scan States
  const [isScanning, setIsScanning] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<any | null>(null);
  const [attachmentMetadata, setAttachmentMetadata] = useState<any | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

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
    setAttachmentFile(null);
    setAttachmentMetadata(null);
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
    setAttachmentFile(null);
    if (doc.attachment_id) {
      setAttachmentMetadata({
        id: doc.attachment_id,
        name: doc.attachment_name,
        type: doc.attachment_type,
        size: doc.attachment_size
      });
    } else {
      setAttachmentMetadata(null);
    }
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
      attachment: attachmentFile
    };

    try {
      if (editingDocId) {
        await updateDocument(editingDocId, payload);
      } else {
        await createDocument(payload);
      }
      setShowForm(false);
      setAttachmentFile(null);
      setAttachmentMetadata(null);
      loadAllData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error saving document reminder.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Please select a file under 5MB.');
      return;
    }

    setIsScanning(true);
    try {
      // 1. Compress image in browser (or read base64 directly if PDF)
      const { base64, compressedSize } = await compressImage(file);

      setAttachmentFile({
        fileName: file.name,
        fileType: file.type === 'application/pdf' ? 'application/pdf' : 'image/jpeg',
        fileSize: compressedSize,
        fileContent: base64
      });

      // 2. Scan with Gemini OCR
      const res = await parseDocumentFile(base64);

      if (res.success && res.data) {
        const info = res.data;

        if (info.documentType) {
          setDocumentType(info.documentType);
        }
        if (info.documentNumber) {
          setDocumentNumber(info.documentNumber);
        }
        if (info.issueDate) {
          setIssueDate(info.issueDate);
        }
        if (info.expiryDate) {
          setExpiryDate(info.expiryDate);
        }

        let autoNotes = '';
        if (info.holderName) {
          autoNotes += `Holder: ${info.holderName}\n`;
          
          // Suggest linking to family contact if names match
          const matchedContact = contacts.find((c: any) => {
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().trim();
            return fullName.includes(info.holderName.toLowerCase().trim()) || 
                   info.holderName.toLowerCase().trim().includes(fullName);
          });
          if (matchedContact) {
            setContactId(matchedContact.id);
            autoNotes += `Linked Contact: ${matchedContact.first_name} ${matchedContact.last_name} (Auto-matched)\n`;
          }
        }
        if (info.notes) {
          autoNotes += info.notes;
        }

        if (autoNotes) {
          setNotes((prev) => prev ? `${prev}\n\n[Extracted Info]\n${autoNotes}` : autoNotes);
        }

        alert('Document scanned and fields auto-filled successfully! Please review.');
      } else {
        alert(res.error || 'Failed to scan document content. You can still fill it manually.');
      }
    } catch (err: any) {
      console.error('OCR scanning error:', err);
      alert(err.message || 'An error occurred while uploading/scanning.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, name: string, type: string) => {
    setIsDownloadingId(attachmentId);
    try {
      const res = await getAttachmentContent(attachmentId);
      if (!res || !res.file_content) {
        alert('Could not download file content.');
        return;
      }

      const link = document.createElement('a');
      link.href = res.file_content;
      link.download = res.file_name || name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Error downloading file.');
    } finally {
      setIsDownloadingId(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (confirm('Are you sure you want to permanently delete this attachment? The document reminder will remain.')) {
      try {
        await deleteAttachment(attachmentId);
        setAttachmentMetadata(null);
        loadAllData();
      } catch (err: any) {
        console.error('Delete attachment error:', err);
        alert(err.message || 'Error deleting attachment.');
      }
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

                {/* File Attachment */}
                {doc.attachment_id && (
                  <div style={{ fontSize: '12.5px', borderTop: '1px dashed rgba(0,0,0,0.06)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', overflow: 'hidden', marginRight: '8px' }}>
                      <Paperclip size={13} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                      <span style={{ fontWeight: '500', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.attachment_name}>
                        {doc.attachment_name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        ({formatFileSize(doc.attachment_size)})
                      </span>
                    </div>
                    <button 
                      className="btn btn-ghost"
                      style={{ height: '24px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', width: 'auto', color: 'var(--color-gold)', flexShrink: 0 }}
                      onClick={() => handleDownloadAttachment(doc.attachment_id, doc.attachment_name, doc.attachment_type)}
                      disabled={isDownloadingId === doc.attachment_id}
                    >
                      {isDownloadingId === doc.attachment_id ? (
                        <Loader2 size={11} className="spin" />
                      ) : (
                        <Download size={11} />
                      )}
                      Download
                    </button>
                  </div>
                )}

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

              {/* File Upload Dropzone / Attachment Status */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Document Attachment</label>
                
                {isScanning ? (
                  <div 
                    style={{ 
                      border: '2px dashed rgba(197, 160, 89, 0.4)', 
                      borderRadius: '12px', 
                      padding: '24px 20px', 
                      textAlign: 'center', 
                      backgroundColor: 'rgba(197, 160, 89, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Loader2 size={24} className="spin" style={{ color: 'var(--color-gold)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      Scanning document using Gemini AI OCR...
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Please wait, extracting details to auto-fill the form
                    </span>
                  </div>
                ) : attachmentMetadata ? (
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 12px', 
                      backgroundColor: 'rgba(197, 160, 89, 0.06)', 
                      borderRadius: '10px',
                      border: '1px solid rgba(197, 160, 89, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Paperclip size={14} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
                      <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={attachmentMetadata.name}>
                        {attachmentMetadata.name}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        ({formatFileSize(attachmentMetadata.size)})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button"
                        className="btn btn-ghost"
                        style={{ height: '28px', padding: '0 8px', width: 'auto', display: 'flex', alignItems: 'center', fontSize: '11px', gap: '4px', color: 'var(--color-gold)' }}
                        onClick={() => handleDownloadAttachment(attachmentMetadata.id, attachmentMetadata.name, attachmentMetadata.type)}
                      >
                        <Download size={12} /> View
                      </button>
                      <button 
                        type="button"
                        className="btn btn-ghost"
                        style={{ height: '28px', padding: '0 8px', width: 'auto', display: 'flex', alignItems: 'center', fontSize: '11px', gap: '4px', color: 'var(--color-rose)' }}
                        onClick={() => handleDeleteAttachment(attachmentMetadata.id)}
                      >
                        <Trash size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ) : attachmentFile ? (
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 12px', 
                      backgroundColor: 'rgba(74, 117, 89, 0.06)', 
                      borderRadius: '10px',
                      border: '1px solid rgba(74, 117, 89, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <Paperclip size={14} style={{ color: 'var(--color-sage)', flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={attachmentFile.fileName}>
                          {attachmentFile.fileName}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-sage)' }}>
                          Pending save ({formatFileSize(attachmentFile.fileSize)})
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-ghost"
                      style={{ height: '28px', padding: '0 8px', width: 'auto', display: 'flex', alignItems: 'center', fontSize: '11px', gap: '4px', color: 'var(--color-rose)' }}
                      onClick={() => setAttachmentFile(null)}
                    >
                      <Trash size={12} /> Clear
                    </button>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      border: '2px dashed rgba(197, 160, 89, 0.3)', 
                      borderRadius: '12px', 
                      padding: '16px', 
                      textAlign: 'center', 
                      backgroundColor: 'var(--bg-primary)', 
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input 
                      type="file" 
                      accept="image/*,application/pdf" 
                      onChange={handleFileChange}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        opacity: 0, 
                        cursor: 'pointer' 
                      }} 
                    />
                    <FolderOpen size={20} style={{ color: 'var(--color-gold)', marginBottom: '6px', opacity: 0.8 }} />
                    <p style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>
                      Upload Photo or PDF scan to auto-fill
                    </p>
                    <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                      Supports all document types up to 5MB
                    </p>
                  </div>
                )}
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
