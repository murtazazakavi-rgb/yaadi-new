'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { 
  createContact, 
  updateContact, 
  deleteContact, 
  addRelationship, 
  removeRelationship, 
  getRelationships 
} from './actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, UserPlus, Edit, Trash2, Link2, Unlink, Check, X, Calendar, Plus, Upload, Download, Mic } from 'lucide-react';
import { COUNTRY_CODES, parsePhoneNumber } from '@/lib/countries';
import { bulkImportContacts } from './importActions';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'withEvents' | 'familyTree'>('all');

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {};
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };
    recognition.onerror = () => {
      alert("Voice search encountered an error.");
    };
    recognition.start();
  };

  const renderEventChips = (contactId: string) => {
    const cEvs = events.filter((e) => e.contact_id === contactId);
    if (cEvs.length === 0) {
      return <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No events registered</span>;
    }
    
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
        {cEvs.map((e) => {
          let label = '';
          let badgeClass = '';
          switch (e.event_type) {
            case 'birthday_gregorian':
              label = `Birthday (${e.g_day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][e.g_month - 1]})`;
              badgeClass = 'badge-birthday';
              break;
            case 'birthday_hijri':
              label = `Waras (${e.h_day} ${['Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj'][e.h_month]})`;
              badgeClass = 'badge-waras';
              break;
            case 'anniversary':
              label = `Anniversary (${e.g_day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][e.g_month - 1]})`;
              badgeClass = 'badge-anniversary';
              break;
            case 'death_gregorian':
              label = `Death (${e.g_day} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][e.g_month - 1]})`;
              badgeClass = 'badge-death';
              break;
            case 'death_hijri':
              label = `Wafaat (${e.h_day} ${['Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Jumada I', 'Jumada II', 'Rajab', 'Shabaan', 'Ramadaan', 'Shawwal', 'Zilqadah', 'Zilhaj'][e.h_month]})`;
              badgeClass = 'badge-death';
              break;
            default:
              label = e.event_type;
              badgeClass = 'badge-death';
          }
          return (
            <span key={e.id} className={`badge ${badgeClass}`}>
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  // Form Drawer States
  const [showForm, setShowForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(1);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [localNumber, setLocalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Event Input States
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');

  const [gDeath, setGDeath] = useState('');
  const [hDDate, setHDDate] = useState('');
  const [hDMonth, setHDMonth] = useState('');
  const [hDYear, setHDYear] = useState('');

  const [gAnniversary, setGAnniversary] = useState('');

  // Relationship Drawer/Section
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [relPartnerId, setRelPartnerId] = useState('');
  const [relType, setRelType] = useState<'spouse' | 'parent'>('spouse');

  // Import CSV States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<any[]>([]);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(val => val.replace(/^["']|["']$/g, ''));
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    if (!headers.includes('first name') || !headers.includes('last name')) {
      throw new Error('CSV must contain "First Name" and "Last Name" columns.');
    }

    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      const contact: any = {
        firstName: rowData['first name'] || '',
        middleName: rowData['middle name'] || '',
        lastName: rowData['last name'] || '',
        phoneNumber: rowData['phone number'] || rowData['phone_number'] || '',
        email: rowData['email'] || '',
        notes: rowData['notes'] || '',
        events: []
      };

      // Gregorian Birthday
      const gBday = rowData['gregorian birthday (yyyy-mm-dd)'] || rowData['gregorian birthday'] || '';
      if (gBday) {
        const parts = gBday.split('-');
        if (parts.length === 3) {
          contact.events.push({
            eventType: 'birthday_gregorian',
            gYear: parseInt(parts[0]),
            gMonth: parseInt(parts[1]),
            gDay: parseInt(parts[2])
          });
        }
      }

      // Hijri Birthday
      const hBDayVal = rowData['hijri birthday day (1-30)'] || rowData['hijri birthday day'] || '';
      const hBMonthVal = rowData['hijri birthday month (1-12)'] || rowData['hijri birthday month'] || '';
      const hBYearVal = rowData['hijri birthday year (1000-2000)'] || rowData['hijri birthday year'] || '';
      if (hBDayVal && hBMonthVal && hBYearVal) {
        contact.events.push({
          eventType: 'birthday_hijri',
          hDay: parseInt(hBDayVal),
          hMonth: parseInt(hBMonthVal), // 1-indexed in CSV, will be mapped to 0-11 in import action
          hYear: parseInt(hBYearVal)
        });
      }

      // Wedding Anniversary
      const gAnniv = rowData['anniversary date (yyyy-mm-dd)'] || rowData['anniversary date'] || '';
      if (gAnniv) {
        const parts = gAnniv.split('-');
        if (parts.length === 3) {
          contact.events.push({
            eventType: 'anniversary',
            gYear: parseInt(parts[0]),
            gMonth: parseInt(parts[1]),
            gDay: parseInt(parts[2])
          });
        }
      }

      // Deceased relative death events
      const isDeceased = (rowData['deceased (true/false)'] || rowData['deceased'] || '').toLowerCase() === 'true';
      if (isDeceased) {
        const gDVal = rowData['deceased gregorian death date (yyyy-mm-dd)'] || rowData['deceased gregorian death date'] || '';
        if (gDVal) {
          const parts = gDVal.split('-');
          if (parts.length === 3) {
            contact.events.push({
              eventType: 'death_gregorian',
              gYear: parseInt(parts[0]),
              gMonth: parseInt(parts[1]),
              gDay: parseInt(parts[2])
            });
          }
        }

        const hDDayVal = rowData['deceased hijri death day (1-30)'] || rowData['deceased hijri death day'] || '';
        const hDMonthVal = rowData['deceased hijri death month (1-12)'] || rowData['deceased hijri death month'] || '';
        const hDYearVal = rowData['deceased hijri death year (1000-2000)'] || rowData['deceased hijri death year'] || '';
        if (hDDayVal && hDMonthVal && hDYearVal) {
          contact.events.push({
            eventType: 'death_hijri',
            hDay: parseInt(hDDayVal),
            hMonth: parseInt(hDMonthVal), // 1-indexed in CSV, mapped to 0-11 in import action
            hYear: parseInt(hDYearVal)
          });
        }
      }

      results.push(contact);
    }

    return results;
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'First Name', 'Middle Name', 'Last Name', 'Phone Number', 'Email', 'Notes',
      'Gregorian Birthday (YYYY-MM-DD)', 'Hijri Birthday Day (1-30)', 'Hijri Birthday Month (1-12)', 'Hijri Birthday Year (1000-2000)',
      'Anniversary Date (YYYY-MM-DD)', 'Deceased (true/false)', 'Deceased Gregorian Death Date (YYYY-MM-DD)',
      'Deceased Hijri Death Day (1-30)', 'Deceased Hijri Death Month (1-12)', 'Deceased Hijri Death Year (1000-2000)'
    ];

    const dummyRow = [
      'Murtaza', 'Juzer', 'Zakavi', '+919825535907', 'murtaza@zakavi.com', 'Example close family friend',
      '1988-11-21', '22', '2', '1371',
      '2015-05-28', 'false', '', '', '', ''
    ];

    const csvContent = [headers.join(','), dummyRow.map(val => `"${val.replace(/"/g, '""')}"`).join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'yaadi_contacts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          throw new Error('CSV is empty or contains no data rows.');
        }
        setParsedContacts(parsed);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse CSV.');
        setParsedContacts([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (parsedContacts.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await bulkImportContacts(parsedContacts);
      setImportResult(res);
      loadAllData();
    } catch (err: any) {
      setImportError(err.message || 'Failed to import contacts.');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenImport = () => {
    setImportFile(null);
    setParsedContacts([]);
    setImportError('');
    setImportResult(null);
    setShowImportModal(true);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dbData = await getDashboardData();
      const rels = await getRelationships();
      setContacts(dbData.contacts);
      setEvents(dbData.events);
      setRelationships(rels);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic Bidirectional Conversions ---

  // Gregorian Birthday -> Hijri Birthday
  const handleGBirthdayChange = (val: string) => {
    setGBirthday(val);
    if (!val) return;
    const dateObj = new Date(val + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      const h = HijriDate.fromGregorian(dateObj);
      setHBDate(h.day.toString());
      setHBMonth(h.month.toString());
      setHBYear(h.year.toString());
    }
  };

  // Hijri Birthday -> Gregorian Birthday
  const syncHBirthdayToGregorian = (d: string, m: string, y: string) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        const gDateObj = h.toGregorian();
        // format to yyyy-mm-dd (local time safe)
        const year = gDateObj.getFullYear();
        const month = String(gDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(gDateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setGBirthday(formatted);
      } catch (err) {
        // invalid date
      }
    }
  };

  // Gregorian Death -> Hijri Death
  const handleGDeathChange = (val: string) => {
    setGDeath(val);
    if (!val) return;
    const dateObj = new Date(val + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      const h = HijriDate.fromGregorian(dateObj);
      setHDDate(h.day.toString());
      setHDMonth(h.month.toString());
      setHDYear(h.year.toString());
    }
  };

  // Hijri Death -> Gregorian Death
  const syncHDeathToGregorian = (d: string, m: string, y: string) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        const gDateObj = h.toGregorian();
        // format to yyyy-mm-dd (local time safe)
        const year = gDateObj.getFullYear();
        const month = String(gDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(gDateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setGDeath(formatted);
      } catch (err) {
        // invalid date
      }
    }
  };

  // --- CRUD Handlers ---

  const handleOpenAdd = () => {
    setEditingContactId(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setCountryCode('+91');
    setLocalNumber('');
    setEmail('');
    setNotes('');
    setGBirthday('');
    setHBDate('');
    setHBMonth('');
    setHBYear('');
    setGDeath('');
    setHDDate('');
    setHDMonth('');
    setHDYear('');
    setGAnniversary('');
    setFormStep(1);
    setShowForm(true);
  };

  const handleOpenEdit = (contact: any) => {
    setEditingContactId(contact.id);
    setFirstName(contact.first_name);
    setMiddleName(contact.middle_name || '');
    setLastName(contact.last_name);
    const { code, local } = parsePhoneNumber(contact.phone_number || '');
    setCountryCode(code);
    setLocalNumber(local);
    setEmail(contact.email || '');
    setNotes(contact.notes || '');

    // Reset event fields
    setGBirthday('');
    setHBDate('');
    setHBMonth('');
    setHBYear('');
    setGDeath('');
    setHDDate('');
    setHDMonth('');
    setHDYear('');
    setGAnniversary('');

    // Fetch contact's events
    const cEvents = events.filter((e: any) => e.contact_id === contact.id);
    
    cEvents.forEach((ev: any) => {
      if (ev.event_type === 'birthday_gregorian') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGBirthday(gFormatted);
      } else if (ev.event_type === 'birthday_hijri') {
        setHBDate(ev.h_day.toString());
        setHBMonth(ev.h_month.toString());
        setHBYear(ev.h_year.toString());
      } else if (ev.event_type === 'anniversary') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGAnniversary(gFormatted);
      } else if (ev.event_type === 'death_gregorian') {
        const gFormatted = `${ev.g_year}-${String(ev.g_month).padStart(2, '0')}-${String(ev.g_day).padStart(2, '0')}`;
        setGDeath(gFormatted);
      } else if (ev.event_type === 'death_hijri') {
        setHDDate(ev.h_day.toString());
        setHDMonth(ev.h_month.toString());
        setHDYear(ev.h_year.toString());
      }
    });

    setFormStep(1);
    setShowForm(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct events list
    const finalEvents: any[] = [];

    // Birthday Gregorian
    if (gBirthday) {
      const parts = gBirthday.split('-');
      finalEvents.push({
        eventType: 'birthday_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Birthday Hijri (Waras)
    if (hBDate && hBMonth && hBYear) {
      finalEvents.push({
        eventType: 'birthday_hijri',
        hDay: parseInt(hBDate),
        hMonth: parseInt(hBMonth),
        hYear: parseInt(hBYear),
      });
    }

    // Wedding Anniversary
    if (gAnniversary) {
      const parts = gAnniversary.split('-');
      finalEvents.push({
        eventType: 'anniversary',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Death Gregorian
    if (gDeath) {
      const parts = gDeath.split('-');
      finalEvents.push({
        eventType: 'death_gregorian',
        gYear: parseInt(parts[0]),
        gMonth: parseInt(parts[1]),
        gDay: parseInt(parts[2]),
      });
    }

    // Death Hijri (Wafaat)
    if (hDDate && hDMonth && hDYear) {
      finalEvents.push({
        eventType: 'death_hijri',
        hDay: parseInt(hDDate),
        hMonth: parseInt(hDMonth),
        hYear: parseInt(hDYear),
      });
    }

    const combinedPhone = localNumber.trim() ? `${countryCode}${localNumber.trim()}` : '';
    const payload = {
      firstName,
      middleName,
      lastName,
      phoneNumber: combinedPhone,
      email,
      notes,
      events: finalEvents,
    };

    try {
      if (editingContactId) {
        await updateContact(editingContactId, payload);
      } else {
        await createContact(payload);
      }
      setShowForm(false);
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error saving contact.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact? All their relationships and events will be deleted.')) {
      try {
        await deleteContact(id);
        loadAllData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- Relationship Handlers ---

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId || !relPartnerId) return;

    try {
      await addRelationship(activeContactId, relPartnerId, relType);
      // Reset selection
      setRelPartnerId('');
      loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to create connection');
    }
  };

  const handleRemoveRelationship = async (id: string) => {
    try {
      await removeRelationship(id);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered contacts list
  const filteredContacts = contacts.filter((c) => {
    const fullName = `${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''} ${c.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterTab === 'withEvents') {
      return events.some((e) => e.contact_id === c.id);
    }
    if (filterTab === 'familyTree') {
      return relationships.some((r) => r.contact_a_id === c.id || r.contact_b_id === c.id);
    }
    return true;
  });

  const getContactEventsSummary = (contactId: string) => {
    const cEvs = events.filter((e) => e.contact_id === contactId);
    return cEvs.map((e) => {
      let label = e.event_type.replace('_', ' ');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      return label;
    }).join(', ') || 'No events registered';
  };

  const getContactRelationships = (contactId: string) => {
    return relationships.filter(
      (r) => r.contact_a_id === contactId || r.contact_b_id === contactId
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading contacts directory...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Page Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="serif-font page-title">
            Contacts Directory
          </h2>
          <p className="page-subtitle">
            Manage family directory, dates, and family connections.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }} 
            onClick={handleOpenImport}
          >
            <Upload size={14} /> Import CSV
          </button>
          <button 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} 
            onClick={handleOpenAdd}
          >
            <UserPlus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Directory Search */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text"
            className="form-input search-input"
            style={{ paddingRight: '44px' }}
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Mic size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={handleVoiceSearch} />
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="segmented-control" style={{ margin: '0 16px 16px 16px', width: 'calc(100% - 32px)' }}>
        <button 
          type="button"
          onClick={() => setFilterTab('all')} 
          className={`segmented-control-item ${filterTab === 'all' ? 'active' : ''}`}
        >
          All
        </button>
        <button 
          type="button"
          onClick={() => setFilterTab('withEvents')} 
          className={`segmented-control-item ${filterTab === 'withEvents' ? 'active' : ''}`}
        >
          With Events
        </button>
        <button 
          type="button"
          onClick={() => setFilterTab('familyTree')} 
          className={`segmented-control-item ${filterTab === 'familyTree' ? 'active' : ''}`}
        >
          Family Connections
        </button>
      </div>

      {/* Contacts List */}
      <div className="contacts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredContacts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No contacts found in directory.
          </div>
        ) : (
          filteredContacts.map((c) => {
            const isActive = activeContactId === c.id;
            const cRels = getContactRelationships(c.id);
            const isOwn = c.is_owner !== false;

            return (
              <div 
                key={c.id} 
                className="card contact-card"
                style={{
                  margin: '0 16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: isActive ? 'var(--bg-card-active)' : 'var(--bg-card)',
                  borderColor: isActive ? 'var(--color-gold)' : 'rgba(197, 160, 89, 0.15)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div 
                    onClick={() => setActiveContactId(isActive ? null : c.id)} 
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <h3 className="serif-font contact-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
                      {!isOwn && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'normal',
                          backgroundColor: 'rgba(197, 160, 89, 0.1)',
                          color: 'var(--color-gold)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(197, 160, 89, 0.2)'
                        }}>
                          Shared by {c.owner_name}
                        </span>
                      )}
                    </h3>
                    {renderEventChips(c.id)}
                  </div>
                  
                  {/* Edit/Delete icons */}
                  {isOwn ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Contact"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)' }}
                        onClick={() => handleDelete(c.id)}
                        title="Delete Contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>
                      Read-only
                    </div>
                  )}
                </div>

                {/* Expanded Details (Phone, Email, Notes, Relationships) */}
                {isActive && (
                  <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Basic details */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: 'var(--font-size-sm)' }}>
                      {c.phone_number && (
                        <div>
                          <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</strong>
                          <span>{c.phone_number}</span>
                        </div>
                      )}
                      {c.email && (
                        <div>
                          <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</strong>
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>

                    {c.notes && (
                      <div style={{ fontSize: 'var(--font-size-sm)' }}>
                        <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notes</strong>
                        <p style={{ color: 'var(--text-secondary)' }}>{c.notes}</p>
                      </div>
                    )}

                    {/* Relationships List */}
                    <div>
                      <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Relationships / Connections</strong>
                      {cRels.length === 0 ? (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No relationships mapped yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cRels.map((r) => {
                            const isA = r.contact_a_id === c.id;
                            const partnerName = isA ? 
                              `${r.b_first}${r.b_middle ? ' ' + r.b_middle : ''} ${r.b_last}` : 
                              `${r.a_first}${r.a_middle ? ' ' + r.a_middle : ''} ${r.a_last}`;
                            let relLabel = r.relation_type;
                            if (r.relation_type === 'parent') {
                              relLabel = isA ? 'Parent of' : 'Child of';
                            } else if (r.relation_type === 'spouse') {
                              relLabel = 'Spouse of';
                            }

                            return (
                              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: 'var(--bg-card-active)', borderRadius: '6px', fontSize: '12px' }}>
                                <span><strong>{relLabel}</strong> {partnerName}</span>
                                {isOwn && (
                                  <button 
                                    onClick={() => handleRemoveRelationship(r.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)' }}
                                    title="Remove Relationship"
                                  >
                                    <Unlink size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
 
                      {/* Add Relationship Linker Form */}
                      {isOwn && (
                        <form onSubmit={handleAddRelationship} style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select 
                            className="form-select" 
                            style={{ height: '34px', padding: '4px 8px', fontSize: '12px' }}
                            value={relType}
                            onChange={(e: any) => setRelType(e.target.value)}
                          >
                            <option value="spouse">Spouse</option>
                            <option value="parent">Parent Of</option>
                          </select>
 
                          <select 
                            className="form-select" 
                            style={{ height: '34px', padding: '4px 8px', fontSize: '12px' }}
                            required
                            value={relPartnerId}
                            onChange={(e) => setRelPartnerId(e.target.value)}
                          >
                            <option value="">Select Contact...</option>
                            {contacts
                              .filter((item) => item.id !== c.id)
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.first_name}{item.middle_name ? ' ' + item.middle_name : ''} {item.last_name}
                                </option>
                              ))}
                          </select>
 
                          <button type="submit" className="btn btn-secondary" style={{ width: 'auto', height: '34px', padding: '0 12px' }}>
                            Link
                          </button>
                        </form>
                      )}
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contact Form Modal Drawer */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '22px' }}>
                {editingContactId ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Steps Indicator Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 1 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 2 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
              <div style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: formStep >= 3 ? 'var(--color-gold)' : 'var(--bg-input)' }} />
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (formStep < 3) {
                setFormStep(formStep + 1);
              } else {
                handleSaveContact(e);
              }
            }}>
              {/* STEP 1: Basic Details */}
              {formStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-gold)' }}>Step 1: Contact Details</h4>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">First Name</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        placeholder="e.g. Murtaza" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Middle Name (Opt)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Juzer" 
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                      <label className="form-label">Last Name</label>
                      <input 
                        type="text" 
                        required 
                        className="form-input" 
                        placeholder="e.g. Zakavi" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                      <label className="form-label">Phone Number</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                          className="form-select" 
                          style={{ width: '90px', flexShrink: 0, paddingRight: '4px' }}
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                        >
                          {COUNTRY_CODES.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.flag} {item.code}
                            </option>
                          ))}
                        </select>
                        <input 
                          type="tel" 
                          className="form-input" 
                          placeholder="e.g. 9825535907" 
                          value={localNumber}
                          onChange={(e) => setLocalNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                      <label className="form-label">Email</label>
                      <input 
                        type="email" 
                        required 
                        className="form-input" 
                        placeholder="murtaza@zakavi.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Birthday & Anniversary */}
              {formStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-gold)' }}>Step 2: Birthday & Anniversary</h4>

                  <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Birthday & Waras</h5>
                    
                    <div className="form-group">
                      <label className="form-label">Gregorian Birthday</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={gBirthday}
                        onChange={(e) => handleGBirthdayChange(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ width: '70px', marginBottom: 0 }}>
                        <label className="form-label">Hijri Day</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="30"
                          className="form-input" 
                          placeholder="Day"
                          value={hBDate}
                          onChange={(e) => {
                            setHBDate(e.target.value);
                            syncHBirthdayToGregorian(e.target.value, hBMonth, hBYear);
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="form-label">Hijri Month</label>
                        <select 
                          className="form-select"
                          value={hBMonth}
                          onChange={(e) => {
                            setHBMonth(e.target.value);
                            syncHBirthdayToGregorian(hBDate, e.target.value, hBYear);
                          }}
                        >
                          <option value="">Select Month...</option>
                          {HIJRI_MONTH_NAMES.map((name, idx) => (
                            <option key={idx} value={idx}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                        <label className="form-label">Hijri Year</label>
                        <input 
                          type="number" 
                          min="1000" 
                          max="2000"
                          className="form-input" 
                          placeholder="Year"
                          value={hBYear}
                          onChange={(e) => {
                            setHBYear(e.target.value);
                            syncHBirthdayToGregorian(hBDate, hBMonth, e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Wedding Anniversary</h5>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Anniversary Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={gAnniversary}
                        onChange={(e) => setGAnniversary(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Deceased & Notes */}
              {formStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-gold)' }}>Step 3: Deceased Relative & Notes</h4>

                  <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', marginBottom: '12px' }}>
                    <h5 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>Passing Away (Death Anniversary)</h5>
                    
                    <div className="form-group">
                      <label className="form-label">Gregorian Death Date</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={gDeath}
                        onChange={(e) => handleGDeathChange(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ width: '70px', marginBottom: 0 }}>
                        <label className="form-label">Hijri Day</label>
                        <input 
                          type="number" 
                          min="1" 
                          max="30"
                          className="form-input" 
                          placeholder="Day"
                          value={hDDate}
                          onChange={(e) => {
                            setHDDate(e.target.value);
                            syncHDeathToGregorian(e.target.value, hDMonth, hDYear);
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="form-label">Hijri Month</label>
                        <select 
                          className="form-select"
                          value={hDMonth}
                          onChange={(e) => {
                            setHDMonth(e.target.value);
                            syncHDeathToGregorian(hDDate, e.target.value, hDYear);
                          }}
                        >
                          <option value="">Select Month...</option>
                          {HIJRI_MONTH_NAMES.map((name, idx) => (
                            <option key={idx} value={idx}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                        <label className="form-label">Hijri Year</label>
                        <input 
                          type="number" 
                          min="1000" 
                          max="2000"
                          className="form-input" 
                          placeholder="Year"
                          value={hDYear}
                          onChange={(e) => {
                            setHDYear(e.target.value);
                            syncHDeathToGregorian(hDDate, hDMonth, e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '60px', resize: 'none' }}
                      placeholder="Notes, address, secondary numbers..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px', borderTop: 'var(--border-light)', paddingTop: '16px' }}>
                {formStep > 1 ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, height: '40px' }} 
                    onClick={() => setFormStep(formStep - 1)}
                  >
                    Back
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ flex: 1, height: '40px' }} 
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                )}

                {formStep < 3 ? (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, height: '40px' }}
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 1, height: '40px' }}
                  >
                    Save Contact
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="serif-font" style={{ fontSize: '22px' }}>
                Import Contacts via CSV
              </h3>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                Upload a CSV spreadsheet containing your family directory. Download our pre-formatted template with dummy rows to see the exact structure.
              </p>

              <button 
                type="button" 
                onClick={handleDownloadTemplate} 
                className="btn btn-secondary" 
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', padding: '8px 14px', fontSize: '12px' }}
              >
                <Download size={14} /> Download CSV Template
              </button>

              <div style={{ border: '1px dashed var(--color-gold-light)', padding: '20px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', textAlign: 'center' }}>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange} 
                  id="csv-file-input"
                  style={{ display: 'none' }} 
                />
                <label 
                  htmlFor="csv-file-input" 
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={24} style={{ color: 'var(--color-gold)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {importFile ? importFile.name : 'Select CSV File to Upload'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Click to browse files'}
                  </span>
                </label>
              </div>

              {/* Error Display */}
              {importError && (
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-rose-light)', color: 'var(--color-rose)', borderRadius: '6px', fontSize: '12px' }}>
                  {importError}
                </div>
              )}

              {/* Success Result Display */}
              {importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-sage-light)', color: 'var(--color-sage)', borderRadius: '6px', fontSize: '12px', fontWeight: '500' }}>
                    Successfully imported {importResult.successCount} contacts!
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-rose)', display: 'block', marginBottom: '4px' }}>
                        Row Failures ({importResult.errors.length}):
                      </span>
                      {importResult.errors.map((err: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                          Row {err.row} ({err.name}): {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview parsed contacts if loaded and not processed yet */}
              {parsedContacts.length > 0 && !importResult && (
                <div style={{ backgroundColor: 'var(--bg-primary)', border: 'var(--border-thin)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    File Preview: Ready to Import
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Parsed <strong>{parsedContacts.length}</strong> contacts from the spreadsheet. Click "Begin Import" below to merge them into your directory.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: 'var(--border-light)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={() => setShowImportModal(false)}
                >
                  Close
                </button>
                {parsedContacts.length > 0 && !importResult && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    disabled={importing}
                    onClick={handleImportSubmit}
                  >
                    {importing ? 'Importing...' : 'Begin Import'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
