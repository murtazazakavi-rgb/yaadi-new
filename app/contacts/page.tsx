'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { 
  createContact, 
  updateContact, 
  deleteContact, 
  addRelationship, 
  removeRelationship, 
  getRelationships,
  bulkCategorizeContacts
} from './actions';
import { parseVoiceContact } from './voiceActions';
import { getGroups, createGroup, deleteGroup, getGroupShareLink, toggleGroupShareLink } from './groupActions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { Search, UserPlus, Edit, Trash2, Link2, Unlink, Check, X, Calendar, Plus, Upload, Download, Mic, Share2, Copy, Sparkles, Send, Settings } from 'lucide-react';
import { COUNTRY_CODES, parsePhoneNumber } from '@/lib/countries';
import { bulkImportContacts } from './importActions';
import Portal from '@/app/components/Portal';
import { generateCareCardLink, getCareCardByContactId, savePrivacySettings, refreshAiInsights } from './careCardActions';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeCareCard, setActiveCareCard] = useState<any>(null);
  const [loadingCareCard, setLoadingCareCard] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'withEvents' | 'familyTree' | 'passedAway'>('all');

  // Multi-Select States
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [bulkOperationType, setBulkOperationType] = useState<'add' | 'remove'>('add');
  const [bulkSelectedGroupIds, setBulkSelectedGroupIds] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [bulkMessageText, setBulkMessageText] = useState('Assalamu Alaikum {name}, sending you my warmest thoughts and prayers.');

  // Voice Speech-to-Text States
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recognitionObj, setRecognitionObj] = useState<any>(null);
  const [voiceError, setVoiceError] = useState('');

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

  // Initialize SpeechRecognition for Speak to Me
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setVoiceTranscript(currentTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event);
        if (event.error !== 'no-speech') {
          setVoiceError(`Error: ${event.error}. Please try again.`);
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognitionObj(rec);
    }
  }, []);

  const handleOpenSpeakToMe = () => {
    setVoiceTranscript('');
    setVoiceError('');
    setIsListening(false);
    setShowVoiceModal(true);
  };

  const handleStartListening = () => {
    if (!recognitionObj) {
      alert("Speech recognition is not supported or not initialized in this browser.");
      return;
    }
    setVoiceError('');
    setIsListening(true);
    try {
      recognitionObj.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  };

  const handleStopListening = () => {
    if (recognitionObj) {
      try {
        recognitionObj.stop();
      } catch (err) {
        console.error('Failed to stop recognition:', err);
      }
      setIsListening(false);
    }
  };

  const handleProcessSpeech = async () => {
    if (!voiceTranscript.trim()) {
      setVoiceError("Please say something first.");
      return;
    }

    if (isListening) {
      handleStopListening();
    }

    setIsProcessingSpeech(true);
    setVoiceError('');

    try {
      const res = await parseVoiceContact(voiceTranscript);
      if (res.success && res.data) {
        // Reset and pre-fill form fields
        setEditingContactId(null);
        setFirstName(res.data.firstName || '');
        setMiddleName(res.data.middleName || '');
        setLastName(res.data.lastName || '');

        if (res.data.phoneNumber) {
          const { code, local } = parsePhoneNumber(res.data.phoneNumber);
          setCountryCode(code);
          setLocalNumber(local);
        } else {
          setCountryCode('+91');
          setLocalNumber('');
        }

        setEmail(res.data.email || '');
        setNotes(res.data.notes || '');
        setBornAfterMaghrib(res.data.bornAfterMaghrib || false);

        // Reset all dates
        setGBirthday('');
        setHBDate('');
        setHBMonth('');
        setHBYear('');
        setGDeath('');
        setHDDate('');
        setHDMonth('');
        setHDYear('');
        setGAnniversary('');
        setIsDeceased(false);

        // Process events parsed by LLM
        res.data.events.forEach((ev) => {
          if (ev.eventType === 'birthday_gregorian' && ev.gDay && ev.gMonth && ev.gYear) {
            const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
            setGBirthday(formatted);
          } else if (ev.eventType === 'birthday_hijri' && ev.hDay && ev.hMonth && ev.hYear) {
            setHBDate(ev.hDay.toString());
            setHBMonth(ev.hMonth.toString());
            setHBYear(ev.hYear.toString());
          } else if (ev.eventType === 'anniversary' && ev.gDay && ev.gMonth && ev.gYear) {
            const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
            setGAnniversary(formatted);
          } else if (ev.eventType === 'death_gregorian' && ev.gDay && ev.gMonth && ev.gYear) {
            const formatted = `${ev.gYear}-${String(ev.gMonth).padStart(2, '0')}-${String(ev.gDay).padStart(2, '0')}`;
            setGDeath(formatted);
            setIsDeceased(true);
          } else if (ev.eventType === 'death_hijri' && ev.hDay && ev.hMonth && ev.hYear) {
            setHDDate(ev.hDay.toString());
            setHDMonth(ev.hMonth.toString());
            setHDYear(ev.hYear.toString());
            setIsDeceased(true);
          }
        });

        // Hide voice modal and open standard form
        setShowVoiceModal(false);
        setFormStep(1);
        setShowForm(true);
      } else {
        setVoiceError(res.error || 'Failed to parse speech details.');
      }
    } catch (err: any) {
      console.error(err);
      setVoiceError(err.message || 'An error occurred during processing.');
    } finally {
      setIsProcessingSpeech(false);
    }
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
  const [bornAfterMaghrib, setBornAfterMaghrib] = useState(false);
  const [gender, setGender] = useState('');
  const [isDeceased, setIsDeceased] = useState(false);

  // Grouping & Share Links States
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMappings, setGroupMappings] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedFilterGroupId, setSelectedFilterGroupId] = useState<string | null>(null);
  const [shareLinkActive, setShareLinkActive] = useState(false);
  const [shareLinkId, setShareLinkId] = useState<string | null>(null);
  const [loadingShare, setLoadingShare] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#C4953A');

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

  const calculateAge = (contactId: string) => {
    const today = new Date();
    const currentGregorianYear = today.getFullYear();
    const currentHijriYear = HijriDate.fromGregorian(today).year;

    const cEvents = events.filter((e) => e.contact_id === contactId);
    const birthGreg = cEvents.find((e) => e.event_type === 'birthday_gregorian');
    const birthHijri = cEvents.find((e) => e.event_type === 'birthday_hijri');
    const deathGreg = cEvents.find((e) => e.event_type === 'death_gregorian');
    const deathHijri = cEvents.find((e) => e.event_type === 'death_hijri');

    let gregAge: number | null = null;
    let hijriAge: number | null = null;

    if (birthGreg && birthGreg.g_year) {
      const endYear = (deathGreg && deathGreg.g_year) ? deathGreg.g_year : currentGregorianYear;
      gregAge = endYear - birthGreg.g_year;
    }

    if (birthHijri && birthHijri.h_year) {
      const endYear = (deathHijri && deathHijri.h_year) ? deathHijri.h_year : currentHijriYear;
      hijriAge = endYear - birthHijri.h_year;
    }

    return { gregAge, hijriAge };
  };

  const getAgeDisplay = (contactId: string) => {
    const { gregAge, hijriAge } = calculateAge(contactId);
    const isContactDeceased = events.some((e) => e.contact_id === contactId && (e.event_type === 'death_gregorian' || e.event_type === 'death_hijri'));
    
    if (gregAge === null && hijriAge === null) return null;
    
    let text = '';
    if (gregAge !== null && hijriAge !== null) {
      text = `${gregAge}G / ${hijriAge}H`;
    } else if (gregAge !== null) {
      text = `${gregAge}`;
    } else if (hijriAge !== null) {
      text = `${hijriAge}H`;
    }
    
    return isContactDeceased ? `Age: ${text} at death` : `Age: ${text}`;
  };

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

  const handleSelectFilterGroup = async (groupId: string | null) => {
    setSelectedFilterGroupId(groupId);
    if (groupId) {
      setLoadingShare(true);
      try {
        const link = await getGroupShareLink(groupId);
        if (link) {
          setShareLinkActive(link.is_active);
          setShareLinkId(link.id);
        } else {
          setShareLinkActive(false);
          setShareLinkId(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingShare(false);
      }
    } else {
      setShareLinkActive(false);
      setShareLinkId(null);
    }
  };

  const handleToggleShareLink = async (active: boolean) => {
    if (!selectedFilterGroupId) return;
    setLoadingShare(true);
    try {
      const res = await toggleGroupShareLink(selectedFilterGroupId, active);
      setShareLinkActive(res.is_active);
      setShareLinkId(res.id);
    } catch (err) {
      alert('Failed to update sharing link.');
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await createGroup(newGroupName, newGroupColor);
      setNewGroupName('');
      setNewGroupColor('#C4953A');
      const dbData = await getDashboardData();
      setGroups(dbData.groups || []);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? All contact tags and public sharing links will be removed.')) return;
    try {
      await deleteGroup(groupId);
      if (selectedFilterGroupId === groupId) {
        setSelectedFilterGroupId(null);
      }
      const dbData = await getDashboardData();
      setGroups(dbData.groups || []);
      setGroupMappings(dbData.groupMappings || []);
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const contactIdParam = params.get('id');
      if (contactIdParam) {
        setActiveContactId(contactIdParam);
      }
    }
  }, []);

  useEffect(() => {
    if (!activeContactId) {
      setActiveCareCard(null);
      return;
    }
    setLoadingCareCard(true);
    getCareCardByContactId(activeContactId)
      .then((cc) => {
        setActiveCareCard(cc);
      })
      .catch((err) => {
        console.error("Error fetching care card:", err);
      })
      .finally(() => {
        setLoadingCareCard(false);
      });
  }, [activeContactId]);

  useEffect(() => {
    if (activeContactId && !loading) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`contact-card-${activeContactId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeContactId, loading]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const dbData = await getDashboardData();
      const rels = await getRelationships();
      setContacts(dbData.contacts);
      setEvents(dbData.events);
      setRelationships(rels);
      setGroups(dbData.groups || []);
      setGroupMappings(dbData.groupMappings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic Bidirectional Conversions ---

  // Gregorian Birthday -> Hijri Birthday
  const handleGBirthdayChange = (val: string, isAfterMaghrib = bornAfterMaghrib) => {
    setGBirthday(val);
    if (!val) return;
    const dateObj = new Date(val + 'T12:00:00');
    if (!isNaN(dateObj.getTime())) {
      let calcDate = dateObj;
      if (isAfterMaghrib) {
        calcDate = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
      }
      const h = HijriDate.fromGregorian(calcDate);
      setHBDate(h.day.toString());
      setHBMonth(h.month.toString());
      setHBYear(h.year.toString());
    }
  };

  const handleBornAfterMaghribToggle = (checked: boolean) => {
    setBornAfterMaghrib(checked);
    if (gBirthday) {
      handleGBirthdayChange(gBirthday, checked);
    }
  };

  // Hijri Birthday -> Gregorian Birthday
  const syncHBirthdayToGregorian = (d: string, m: string, y: string, isAfterMaghrib = bornAfterMaghrib) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        let gDateObj = h.toGregorian();
        if (isAfterMaghrib) {
          gDateObj = new Date(gDateObj.getTime() - 24 * 60 * 60 * 1000);
        }
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
    setBornAfterMaghrib(false);
    setGender('');
    setSelectedGroupIds([]);
    setIsDeceased(false);
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
    setBornAfterMaghrib(contact.born_after_maghrib || false);
    setGender(contact.gender || '');

    const mapped = groupMappings.filter(m => m.contact_id === contact.id).map(m => m.group_id);
    setSelectedGroupIds(mapped);

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
 
    const hasDeathEvent = cEvents.some((ev: any) => ev.event_type === 'death_gregorian' || ev.event_type === 'death_hijri');
    setIsDeceased(hasDeathEvent);

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
      email: (isDeceased && !email.trim()) ? undefined : email,
      notes,
      bornAfterMaghrib,
      gender: gender || undefined,
      groupIds: selectedGroupIds,
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
    
    if (selectedFilterGroupId) {
      const isTagged = groupMappings.some(
        (m) => m.contact_id === c.id && m.group_id === selectedFilterGroupId
      );
      if (!isTagged) return false;
    }

    if (filterTab === 'withEvents') {
      return events.some((e) => e.contact_id === c.id);
    }
    if (filterTab === 'familyTree') {
      return relationships.some((r) => r.contact_a_id === c.id || r.contact_b_id === c.id);
    }
    if (filterTab === 'passedAway') {
      return events.some((e) => e.contact_id === c.id && (e.event_type === 'death_gregorian' || e.event_type === 'death_hijri'));
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
            style={{ 
              width: 'auto', 
              padding: '8px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px',
              border: '1px solid rgba(196, 149, 58, 0.4)',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--color-gold-light) 100%)',
              color: 'var(--color-gold)'
            }} 
            onClick={handleOpenSpeakToMe}
          >
            <Sparkles size={14} style={{ color: 'var(--color-gold)' }} /> Speak to Me
          </button>
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

      {/* Groups Filter Carousel */}
      <div style={{ padding: '0 16px 12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: '6px', paddingBottom: '4px' }} className="hide-scrollbar">
          <button
            type="button"
            onClick={() => handleSelectFilterGroup(null)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '500',
              border: '1px solid',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              backgroundColor: selectedFilterGroupId === null ? 'var(--color-gold)' : 'transparent',
              borderColor: selectedFilterGroupId === null ? 'var(--color-gold)' : 'var(--border-card)',
              color: selectedFilterGroupId === null ? '#FFFFFF' : 'var(--text-secondary)'
            }}
          >
            All Groups
          </button>
          {groups.map((g) => {
            const isSelected = selectedFilterGroupId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelectFilterGroup(isSelected ? null : g.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: '1px solid',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  backgroundColor: isSelected ? g.color : 'var(--bg-card)',
                  borderColor: isSelected ? g.color : 'rgba(197, 160, 89, 0.15)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-primary)'
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setShowGroupManager(true)}
          style={{
            flexShrink: 0,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-gold-light)',
            border: '1px solid rgba(197, 160, 89, 0.2)',
            color: 'var(--color-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
          title="Manage Tags / Groups"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Group Share Link Settings Banner */}
      {selectedFilterGroupId && (() => {
        const activeGroup = groups.find((g) => g.id === selectedFilterGroupId);
        if (!activeGroup) return null;
        
        const sharingUrl = shareLinkId ? `${window.location.origin}/shared-group/${shareLinkId}` : '';

        return (
          <div className="card page-transition" style={{
            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(197, 160, 89, 0.05) 100%)',
            border: '1px solid rgba(197, 160, 89, 0.2)',
            padding: '16px',
            margin: '0 16px 16px 16px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: 'var(--shadow-soft)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-gold)', display: 'block' }}>Sharing Settings</span>
                <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Share {activeGroup.name} Contacts
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {loadingShare ? 'Updating...' : shareLinkActive ? 'Sharing Active' : 'Sharing Inactive'}
                </span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={shareLinkActive}
                    disabled={loadingShare}
                    onChange={(e) => handleToggleShareLink(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            {shareLinkActive && shareLinkId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: 'var(--border-light)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', wordBreak: 'break-all' }}>
                  Public Link: <a href={sharingUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>{sharingUrl}</a>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', height: '30px', width: 'auto', fontSize: '11px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(sharingUrl);
                      alert('Share link copied to clipboard!');
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', height: '30px', width: 'auto', fontSize: '11px', backgroundColor: '#25D366', color: '#FFFFFF', boxShadow: 'none' }}
                    onClick={() => {
                      const waUrl = `https://wa.me/?text=${encodeURIComponent(`Here is the shared event timeline calendar for the ${activeGroup.name} family group: ${sharingUrl}`)}`;
                      window.open(waUrl, '_blank');
                    }}
                  >
                    Share via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
        <button 
          type="button"
          onClick={() => setFilterTab('passedAway')} 
          className={`segmented-control-item ${filterTab === 'passedAway' ? 'active' : ''}`}
        >
          Passed Away
        </button>
      </div>

      {filteredContacts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: '8px', marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input 
              type="checkbox" 
              checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedContactIds(filteredContacts.map(c => c.id));
                } else {
                  setSelectedContactIds([]);
                }
              }}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--color-gold)' }}
            />
            <span style={{ fontWeight: '500' }}>Select All ({filteredContacts.length})</span>
          </label>
          {selectedContactIds.length > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-gold)', fontWeight: '600' }}>
              {selectedContactIds.length} Selected
            </span>
          )}
        </div>
      )}

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
            const isContactDeceased = events.some((e) => e.contact_id === c.id && (e.event_type === 'death_gregorian' || e.event_type === 'death_hijri'));

            return (
              <div 
                key={c.id} 
                id={`contact-card-${c.id}`}
                className="card contact-card"
                style={{
                  margin: '0 16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '16px',
                  alignItems: 'flex-start',
                  backgroundColor: isActive ? 'var(--bg-card-active)' : 'var(--bg-card)',
                  borderColor: isActive ? 'var(--color-gold)' : 'rgba(197, 160, 89, 0.15)'
                }}
              >
                <input 
                  type="checkbox"
                  checked={selectedContactIds.includes(c.id)}
                  onChange={(e) => {
                    if (selectedContactIds.includes(c.id)) {
                      setSelectedContactIds(selectedContactIds.filter(id => id !== c.id));
                    } else {
                      setSelectedContactIds([...selectedContactIds, c.id]);
                    }
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '6px', accentColor: 'var(--color-gold)' }}
                />
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div 
                    onClick={() => setActiveContactId(isActive ? null : c.id)} 
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <h3 className="serif-font contact-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
                      {isContactDeceased && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'normal',
                          backgroundColor: 'rgba(140, 137, 132, 0.1)',
                          color: 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(140, 137, 132, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🤍 Passed Away
                        </span>
                      )}
                      {c.born_after_maghrib && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'normal',
                          backgroundColor: 'var(--color-blue-light)',
                          color: 'var(--color-blue)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(74, 107, 138, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }} title="Born after sunset (Hijri date is next day)">
                          🌙 Born after Maghrib
                        </span>
                      )}
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
                      {c.gender && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'normal',
                          backgroundColor: c.gender === 'male' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(236, 72, 153, 0.08)',
                          color: c.gender === 'male' ? '#3b82f6' : '#ec4899',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: c.gender === 'male' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(236, 72, 153, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {c.gender === 'male' ? '♂ Male' : '♀ Female'}
                        </span>
                      )}
                      {getAgeDisplay(c.id) && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'normal',
                          backgroundColor: 'rgba(196, 149, 58, 0.08)',
                          color: 'var(--color-gold)',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid rgba(196, 149, 58, 0.2)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🎂 {getAgeDisplay(c.id)}
                        </span>
                      )}
                    </h3>
                    
                    {/* Render Group Tags */}
                    {(() => {
                      const cGroups = groupMappings
                        .filter((m) => m.contact_id === c.id)
                        .map((m) => groups.find((g) => g.id === m.group_id))
                        .filter(Boolean);
                      if (cGroups.length === 0) return null;
                      return (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '4px 0' }}>
                          {cGroups.map((g) => (
                            <span
                              key={g.id}
                              style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: `${g.color}15`,
                                color: g.color,
                                padding: '1px 8px',
                                borderRadius: '10px',
                                border: `1px solid ${g.color}30`
                              }}
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

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

                    {/* Care Card & Relationship Intelligence Section */}
                    <div style={{ borderTop: 'var(--border-light)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ❤️ Care Card & Relationship Intelligence
                      </h4>
                      
                      {loadingCareCard ? (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading relationship details...</span>
                      ) : !activeCareCard ? (
                        isOwn ? (
                          <div style={{ padding: '8px 0' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                              Ask this person to fill out their preferences (likes, support styles, reachability) so you can remember what matters to them.
                            </p>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', height: '30px' }}
                              onClick={async () => {
                                try {
                                  const res = await generateCareCardLink(c.id);
                                  if (res.success) {
                                    const cc = await getCareCardByContactId(c.id);
                                    setActiveCareCard(cc);
                                  }
                                } catch (err: any) {
                                  alert(err.message || "Failed to generate link");
                                }
                              }}
                            >
                              Request Care Card
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No Care Card created for this contact yet.
                          </p>
                        )
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          
                          {/* Link and Share section (only for owner) */}
                          {isOwn && (
                            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: 'var(--border-light)', fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span>
                                  <strong>Status:</strong>{' '}
                                  <span style={{ color: activeCareCard.status === 'complete' ? 'var(--color-sage)' : 'var(--text-muted)', fontWeight: '600' }}>
                                    {activeCareCard.status === 'complete' 
                                      ? activeCareCard.know_me_better_status === 'complete' 
                                        ? 'Care Card & Profile Complete' 
                                        : 'Care Card Complete'
                                      : 'Not Started'}
                                  </span>
                                </span>
                                {activeCareCard.updated_at && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    Updated: {new Date(activeCareCard.updated_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                  Public Link: <a href={`${window.location.origin}/profile/${activeCareCard.token}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>{`${window.location.origin}/profile/${activeCareCard.token}`}</a>
                                </span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', height: '24px', width: 'auto', fontSize: '10px' }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${window.location.origin}/profile/${activeCareCard.token}`);
                                      alert('Care Card link copied!');
                                    }}
                                  >
                                    Copy Link
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 8px', height: '24px', width: 'auto', fontSize: '10px', backgroundColor: '#25D366', color: '#FFFFFF', boxShadow: 'none' }}
                                    onClick={() => {
                                      const shareText = `Help me remember what matters to you! I'm using Yaadi to stay connected with people I care about. Please take 2 minutes to fill out your Care Card: ${window.location.origin}/profile/${activeCareCard.token}`;
                                      const waUrl = `https://wa.me/${(c.phone_number || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(shareText)}`;
                                      window.open(waUrl, '_blank');
                                    }}
                                  >
                                    WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 8px', height: '24px', width: 'auto', fontSize: '10px', backgroundColor: '#007AFF', color: '#FFFFFF', boxShadow: 'none' }}
                                    onClick={() => {
                                      const shareText = `Help me remember what matters to you! Please fill out your Yaadi Care Card: ${window.location.origin}/profile/${activeCareCard.token}`;
                                      window.open(`sms:${c.phone_number || ''}?&body=${encodeURIComponent(shareText)}`, '_blank');
                                    }}
                                  >
                                    SMS
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 8px', height: '24px', width: 'auto', fontSize: '10px', backgroundColor: '#E2E8F0', color: 'var(--text-primary)', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)' }}
                                    onClick={() => {
                                      const subject = `Help me remember what matters to you!`;
                                      const body = `Hi,\n\nI'm using Yaadi to remember important dates and stay connected. Please fill out your Care Card: ${window.location.origin}/profile/${activeCareCard.token}`;
                                      window.open(`mailto:${c.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                                    }}
                                  >
                                    Email
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Snapshot and AI Insights (show if complete) */}
                          {activeCareCard.status === 'complete' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              
                              {/* Snapshot Section */}
                              <div style={{ backgroundColor: 'var(--bg-card-active)', border: 'var(--border-thin)', padding: '12px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '750', textTransform: 'uppercase', color: 'var(--color-gold)', display: 'block', marginBottom: '8px' }}>
                                  👤 Preferences Snapshot
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '12.5px' }}>
                                  {activeCareCard.communication_preference && (
                                    <div>📱 <strong>Prefers:</strong> {activeCareCard.communication_preference}</div>
                                  )}
                                  {activeCareCard.gift_preference && (
                                    <div>🎁 <strong>Likes:</strong> {activeCareCard.gift_preference} gifts</div>
                                  )}
                                  {activeCareCard.appreciation_style && (
                                    <div>❤️ <strong>Appreciates:</strong> {activeCareCard.appreciation_style}</div>
                                  )}
                                  {activeCareCard.support_style && (
                                    <div>💪 <strong>Stressed support:</strong> {activeCareCard.support_style}</div>
                                  )}
                                  {activeCareCard.dua_requests && activeCareCard.dua_requests.length > 0 && (
                                    <div>🤲 <strong>Duas for:</strong> {activeCareCard.dua_requests.join(', ')}</div>
                                  )}
                                  {activeCareCard.current_focus && activeCareCard.current_focus.length > 0 && (
                                    <div>🎯 <strong>Focused on:</strong> {activeCareCard.current_focus.join(', ')}</div>
                                  )}
                                  {activeCareCard.interests && activeCareCard.interests.length > 0 && (
                                    <div>🌱 <strong>Interests:</strong> {activeCareCard.interests.join(', ')}</div>
                                  )}
                                  {activeCareCard.small_joy && (
                                    <div>😊 <strong>Small joy:</strong> "{activeCareCard.small_joy}"</div>
                                  )}
                                  {activeCareCard.care_expression && activeCareCard.care_expression.length > 0 && (
                                    <div>❤️ <strong>Expresses care:</strong> {activeCareCard.care_expression.join(', ')}</div>
                                  )}
                                  {activeCareCard.shared_moments && activeCareCard.shared_moments.length > 0 && (
                                    <div>☕ <strong>Shared moments:</strong> {activeCareCard.shared_moments.join(', ')}</div>
                                  )}
                                  {activeCareCard.connection_rhythm && (
                                    <div>⚡ <strong>Connection Pace:</strong> {activeCareCard.connection_rhythm}</div>
                                  )}
                                  {activeCareCard.relational_role && (
                                    <div>👥 <strong>Role:</strong> {activeCareCard.relational_role}</div>
                                  )}
                                  {activeCareCard.resolving_tension && (
                                    <div>🕊️ <strong>Resolving Tension:</strong> {activeCareCard.resolving_tension}</div>
                                  )}
                                  {activeCareCard.relational_validation && (
                                    <div>🌟 <strong>Feels Appreciated:</strong> {activeCareCard.relational_validation}</div>
                                  )}
                                  {activeCareCard.confidence_boost && (
                                    <div>🚀 <strong>Lifting Spirits:</strong> {activeCareCard.confidence_boost}</div>
                                  )}
                                  
                                  {/* Optional Favourites */}
                                  {activeCareCard.favourites && Object.values(activeCareCard.favourites).some(Boolean) && (
                                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '6px', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      {activeCareCard.favourites.food && <span>🍕 {activeCareCard.favourites.food}</span>}
                                      {activeCareCard.favourites.dessert && <span>🍰 {activeCareCard.favourites.dessert}</span>}
                                      {activeCareCard.favourites.drink && <span>🥤 {activeCareCard.favourites.drink}</span>}
                                      {activeCareCard.favourites.colour && <span>🎨 {activeCareCard.favourites.colour}</span>}
                                      {activeCareCard.favourites.hobby && <span>⚽ {activeCareCard.favourites.hobby}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* AI Insights Section */}
                              <div style={{ background: 'linear-gradient(135deg, rgba(197, 160, 89, 0.03) 0%, rgba(107, 142, 110, 0.03) 100%)', border: '1px solid rgba(197, 160, 89, 0.15)', padding: '12px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: '750', textTransform: 'uppercase', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ✨ AI Relationship Insights
                                  </span>
                                  {isOwn && (
                                    <button
                                      type="button"
                                      style={{ border: 'none', background: 'none', color: 'var(--color-gold)', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                                      onClick={async () => {
                                        setLoadingCareCard(true);
                                        try {
                                          await refreshAiInsights(c.id);
                                          const cc = await getCareCardByContactId(c.id);
                                          setActiveCareCard(cc);
                                        } catch (e) {
                                          alert("Error generating insights");
                                        } finally {
                                          setLoadingCareCard(false);
                                        }
                                      }}
                                    >
                                      Refresh
                                    </button>
                                  )}
                                </div>
                                
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                  {activeCareCard.ai_insights ? (
                                    activeCareCard.ai_insights.split('\n').map((line: string, i: number) => {
                                      const clean = line.replace(/^-\s*/, '');
                                      if (!clean.trim()) return null;
                                      return <div key={i} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                        <span style={{ color: 'var(--color-sage)' }}>•</span>
                                        <span>{clean}</span>
                                      </div>;
                                    })
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>AI is analyzing profile... Click Refresh to update.</span>
                                  )}
                                </div>
                              </div>

                              {/* Privacy Visibility settings (only for owner) */}
                              {isOwn && (
                                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    🔒 Privacy & Sharing
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                                    <span>Who can view this profile data?</span>
                                    <select
                                      value={activeCareCard.privacy_settings?.visibility || 'owner'}
                                      onChange={async (e) => {
                                        const nextVal = e.target.value;
                                        const nextPrivacy = { ...activeCareCard.privacy_settings, visibility: nextVal };
                                        try {
                                          await savePrivacySettings(c.id, nextPrivacy);
                                          setActiveCareCard({ ...activeCareCard, privacy_settings: nextPrivacy });
                                        } catch (err: any) {
                                          alert(err.message || "Failed to save privacy settings");
                                        }
                                      }}
                                      className="form-select"
                                      style={{ width: 'auto', padding: '2px 8px', height: '26px', fontSize: '11px', margin: 0 }}
                                    >
                                      <option value="owner">Workspace Owner Only</option>
                                      <option value="shared">Shared Connections</option>
                                      <option value="private">Strictly Private</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      )}
                    </div>

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
              </div>
            );
          })
        )}
      </div>

      {/* Contact Form Modal Drawer */}
      {showForm && (
        <Portal>
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
                        required={!isDeceased} 
                        className="form-input" 
                        placeholder="murtaza@zakavi.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ width: '120px', flexGrow: 0, minWidth: '120px' }}>
                      <label className="form-label">Gender</label>
                      <select 
                        className="form-select" 
                        style={{ width: '100%' }}
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>

                  {/* Deceased Switch */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', borderTop: 'var(--border-light)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="is-deceased-check"
                        checked={isDeceased}
                        onChange={(e) => setIsDeceased(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="is-deceased-check" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                        Passed Away / Deceased Contact 🤍
                      </label>
                    </div>
                    {isDeceased && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '24px' }}>
                        * This contact will be marked as passed away. Email and phone number are optional.
                      </span>
                    )}
                  </div>

                  {/* Groups Selection */}
                  <div style={{ marginTop: '12px', borderTop: 'var(--border-light)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Workspace Groups / Tags</label>
                      <button
                        type="button"
                        onClick={() => setShowGroupManager(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-gold)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Settings size={12} /> Manage Tags
                      </button>
                    </div>
                    {groups.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0' }}>
                        No groups created yet. Click "Manage Tags" above to create some.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                        {groups.map((g) => {
                          const isSelected = selectedGroupIds.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                                } else {
                                  setSelectedGroupIds([...selectedGroupIds, g.id]);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 12px',
                                borderRadius: '16px',
                                fontSize: '12px',
                                border: '1px solid',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)',
                                backgroundColor: isSelected ? g.color : 'transparent',
                                borderColor: g.color,
                                color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                                opacity: isSelected ? 1 : 0.75
                              }}
                            >
                              {g.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
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

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <input 
                        type="checkbox" 
                        id="born-after-maghrib-check"
                        checked={bornAfterMaghrib}
                        onChange={(e) => handleBornAfterMaghribToggle(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor="born-after-maghrib-check" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                        Born after Maghrib (Sunset)
                      </label>
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
        </Portal>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <Portal>
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
        </Portal>
      )}

      {/* Custom Group Manager Modal */}
      {showGroupManager && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowGroupManager(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h3 className="serif-font" style={{ fontSize: '20px' }}>Manage Custom Groups</h3>
                <button className="modal-close" onClick={() => setShowGroupManager(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Create Group Inline Form */}
              <form onSubmit={handleCreateGroup} style={{ borderBottom: 'var(--border-light)', paddingBottom: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>Create New Group</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Qasre Juzer (QJ)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label className="form-label" style={{ margin: 0, textTransform: 'none' }}>Tag Color:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['#C4953A', '#6B8E6E', '#4A6B8A', '#C45B7A', '#8A6BC4', '#E67E22', '#16A085'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewGroupColor(color)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: newGroupColor === color ? '2px solid var(--text-primary)' : 'none',
                            cursor: 'pointer',
                            transform: newGroupColor === color ? 'scale(1.1)' : 'none',
                            transition: 'var(--transition-smooth)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '36px', marginTop: '4px' }}>
                    Create Group
                  </button>
                </div>
              </form>

              {/* Existing Groups List */}
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>Existing Groups</h4>
                {groups.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No groups created yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {groups.map((g) => (
                      <div
                        key={g.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '8px',
                          border: 'var(--border-light)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: g.color }} />
                          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{g.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(g.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-rose)' }}
                          title="Delete Group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Speak to Me Voice Modal */}
      {showVoiceModal && (
        <Portal>
          <div className="modal-overlay" onClick={handleStopListening}>
            <div className="modal-content glassmorphic-voice-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="modal-header" style={{ marginBottom: '12px' }}>
                <h3 className="serif-font" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '22px' }}>
                  <Sparkles size={20} style={{ color: 'var(--color-gold)' }} />
                  Speak to Me
                </h3>
                <button className="modal-close" onClick={() => { handleStopListening(); setShowVoiceModal(false); }}>
                  <X size={20} />
                </button>
              </div>

              {isProcessingSpeech ? (
                <div className="voice-processing-loader">
                  <div className="voice-spinner"></div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Parsing speech with AI...</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Converting your dates and details into a contact record.</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.5' }}>
                    Speak naturally to add a contact. For example:<br />
                    <span style={{ fontStyle: 'italic', color: 'var(--color-gold)', fontWeight: '500' }}>
                      "Add Ali Raza, phone 9876543210, birthdate 15th Ramadan 1410"
                    </span>
                  </p>

                  <div className="voice-mic-container">
                    <button
                      type="button"
                      className={`voice-mic-button ${isListening ? 'listening' : ''}`}
                      onClick={isListening ? handleStopListening : handleStartListening}
                    >
                      <Mic size={36} />
                    </button>
                    {isListening && (
                      <>
                        <div className="voice-ripple voice-ripple-1"></div>
                        <div className="voice-ripple voice-ripple-2"></div>
                        <div className="voice-ripple voice-ripple-3"></div>
                      </>
                    )}
                  </div>

                  <div className="voice-wave-container">
                    <div className="voice-wave-bar"></div>
                    <div className="voice-wave-bar"></div>
                    <div className="voice-wave-bar"></div>
                    <div className="voice-wave-bar"></div>
                    <div className="voice-wave-bar"></div>
                    <div className="voice-wave-bar"></div>
                  </div>

                  <p className="voice-hint-text">
                    {isListening ? 'Listening... click microphone to pause.' : 'Click the microphone to start speaking.'}
                  </p>

                  <div style={{ marginTop: '20px' }}>
                    <label className="form-label">Real-time Transcript</label>
                    <div className="voice-transcript-card">
                      {voiceTranscript || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Your spoken words will appear here...</span>}
                    </div>
                  </div>

                  {voiceError && (
                    <div style={{ color: 'var(--color-rose)', fontSize: '12px', marginBottom: '15px', fontWeight: '500' }}>
                      {voiceError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => { handleStopListening(); setShowVoiceModal(false); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 2, background: 'linear-gradient(135deg, var(--color-sage) 0%, var(--color-accent-hover) 100%)' }}
                      disabled={!voiceTranscript.trim()}
                      onClick={handleProcessSpeech}
                    >
                      Process Speech
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
      {/* Floating Bottom Actions Bar */}
      {selectedContactIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '76px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--color-gold)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 999,
          width: 'calc(100% - 32px)',
          maxWidth: '500px',
          justifyContent: 'space-between'
        }} className="page-slide-up">
          <span style={{ fontSize: '13px', fontWeight: '600' }}>
            {selectedContactIds.length} Selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => {
                setBulkOperationType('add');
                setBulkSelectedGroupIds([]);
                setShowBulkCategoryModal(true);
              }}
              className="btn btn-secondary btn-press"
              style={{ width: 'auto', padding: '0 12px', height: '34px', fontSize: '12px' }}
            >
              🏷️ Tag Group
            </button>
            <button 
              onClick={() => {
                setShowBulkMessageModal(true);
              }}
              className="btn btn-primary btn-press"
              style={{ width: 'auto', padding: '0 12px', height: '34px', fontSize: '12px', backgroundColor: 'var(--color-gold)', borderColor: 'var(--color-gold)' }}
            >
              💬 Send Dua
            </button>
            <button
              onClick={() => setSelectedContactIds([])}
              className="btn btn-ghost"
              style={{ width: 'auto', padding: '0 8px', height: '34px', color: 'var(--text-muted)' }}
              title="Clear Selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Categorization Modal */}
      {showBulkCategoryModal && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowBulkCategoryModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="serif-font" style={{ fontSize: '18px' }}>Bulk Categorize Tagging</h3>
                <button className="modal-close" onClick={() => setShowBulkCategoryModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Applying to {selectedContactIds.length} selected contacts
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Operation Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setBulkOperationType('add')}
                    className={`btn ${bulkOperationType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, height: '34px', fontSize: '12px' }}
                  >
                    Add Tags
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkOperationType('remove')}
                    className={`btn ${bulkOperationType === 'remove' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, height: '34px', fontSize: '12px' }}
                  >
                    Remove Tags
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Select Groups</label>
                {groups.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '6px' }}>
                    {groups.map((g: any) => {
                      const checked = bulkSelectedGroupIds.includes(g.id);
                      return (
                        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setBulkSelectedGroupIds(bulkSelectedGroupIds.filter(id => id !== g.id));
                              } else {
                                setBulkSelectedGroupIds([...bulkSelectedGroupIds, g.id]);
                              }
                            }}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: g.color || '#C4953A' }} />
                          <span>{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No groups defined. Create groups in the tag manager.
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-press"
                onClick={async () => {
                  if (bulkSelectedGroupIds.length === 0) {
                    alert('Please select at least one group.');
                    return;
                  }
                  setProcessingBulk(true);
                  try {
                    await bulkCategorizeContacts(selectedContactIds, bulkSelectedGroupIds, bulkOperationType);
                    setShowBulkCategoryModal(false);
                    setSelectedContactIds([]);
                    loadAllData();
                  } catch (err: any) {
                    alert(err.message || 'Bulk tagging failed.');
                  } finally {
                    setProcessingBulk(false);
                  }
                }}
                disabled={processingBulk || bulkSelectedGroupIds.length === 0}
              >
                {processingBulk ? 'Applying Changes...' : `Apply to ${selectedContactIds.length} Contacts`}
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Bulk Messaging Modal */}
      {showBulkMessageModal && (
        <Portal>
          <div className="modal-overlay" onClick={() => setShowBulkMessageModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
              <div className="modal-header">
                <h3 className="serif-font" style={{ fontSize: '18px' }}>Bulk WhatsApp Messages</h3>
                <button className="modal-close" onClick={() => setShowBulkMessageModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Message Draft</label>
                <textarea
                  className="form-input"
                  style={{ height: '90px', resize: 'none', fontSize: '13px', fontFamily: 'inherit' }}
                  value={bulkMessageText}
                  onChange={(e) => setBulkMessageText(e.target.value)}
                  placeholder="Type a greeting or prayers to share... Use {name} as a placeholder for their name!"
                />
              </div>

              <label className="form-label" style={{ marginBottom: '8px' }}>Send Queue ({selectedContactIds.length})</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                {contacts
                  .filter(c => selectedContactIds.includes(c.id))
                  .map(c => {
                    const phone = c.phone_number || '';
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    const name = `${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''} ${c.last_name}`;
                    
                    const customizedMessage = bulkMessageText.replace(/{name}/g, name);
                    const waUrl = cleanPhone 
                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customizedMessage)}`
                      : null;

                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: 'var(--border-light)', gap: '8px' }}>
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', display: 'block', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {phone || 'No phone number'}
                          </span>
                        </div>
                        
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-press"
                            style={{ width: 'auto', padding: '4px 10px', height: '28px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            <Send size={10} style={{ color: 'var(--color-sage)' }} /> Send
                          </a>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--color-rose)', fontWeight: '500' }}>
                            Missing Number
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div style={{ marginTop: '20px', borderTop: 'var(--border-light)', paddingTop: '12px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', height: '34px', fontSize: '12px' }}
                  onClick={() => setShowBulkMessageModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
