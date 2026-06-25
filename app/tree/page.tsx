'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { getRelationships, createContact, addRelationship, removeRelationship } from '@/app/contacts/actions';
import { HijriDate } from '@/lib/hijri';
import { Network, User, Heart, ChevronDown, X, Plus } from 'lucide-react';

export default function FamilyTreePage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rootId, setRootId] = useState<string>('');

  // Details Drawer State
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Add Family Member Modal States
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberRole, setAddMemberRole] = useState<'spouse' | 'child'>('spouse');
  const [addMemberSourceContactId, setAddMemberSourceContactId] = useState<string>('');
  const [hoveredCoupleId, setHoveredCoupleId] = useState<string | null>(null);

  // Add Family Member Form States
  const [modalTab, setModalTab] = useState<'link' | 'create'>('link');
  const [selectedLinkContactId, setSelectedLinkContactId] = useState<string>('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    loadTreeData();
  }, []);

  const loadTreeData = async () => {
    try {
      const dbData = await getDashboardData();
      const rels = await getRelationships();
      setContacts(dbData.contacts);
      setRelationships(rels);
      setEvents(dbData.events || []);

      // Auto-select first contact who is a parent as the default root
      if (!rootId) {
        const parentRel = rels.find((r) => r.relation_type === 'parent');
        if (parentRel) {
          setRootId(parentRel.contact_a_id);
        } else if (dbData.contacts.length > 0) {
          setRootId(dbData.contacts[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to find spouse
  const getSpouse = (personId: string) => {
    const rel = relationships.find(
      (r) => r.relation_type === 'spouse' && (r.contact_a_id === personId || r.contact_b_id === personId)
    );
    if (!rel) return null;
    const spouseId = rel.contact_a_id === personId ? rel.contact_b_id : rel.contact_a_id;
    return contacts.find((c) => c.id === spouseId);
  };

  // Helper to find children
  const getChildren = (personId: string) => {
    const spouse = getSpouse(personId);
    const parentIds = [personId];
    if (spouse) parentIds.push(spouse.id);

    // Find relationships where type is parent and contact_a is either parent
    const childRels = relationships.filter(
      (r) => r.relation_type === 'parent' && parentIds.includes(r.contact_a_id)
    );
    
    // De-duplicate child IDs
    const childIds = Array.from(new Set(childRels.map((r) => r.contact_b_id)));
    return contacts.filter((c) => childIds.includes(c.id));
  };

  // Age calculations consistent with contacts page
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

  const getAgeText = (contactId: string) => {
    const { gregAge, hijriAge } = calculateAge(contactId);
    const isContactDeceased = events.some((e) => e.contact_id === contactId && (e.event_type === 'death_gregorian' || e.event_type === 'death_hijri'));
    
    if (gregAge === null && hijriAge === null) return '';
    
    let ageText = '';
    if (gregAge !== null && hijriAge !== null) {
      ageText = `${gregAge}G / ${hijriAge}H`;
    } else if (gregAge !== null) {
      ageText = `${gregAge}`;
    } else if (hijriAge !== null) {
      ageText = `${hijriAge}H`;
    }
    
    return isContactDeceased ? `Age: ${ageText} at death` : `Age: ${ageText}`;
  };

  // Build generation levels starting from selected root person
  const buildTree = (rootPersonId: string) => {
    if (!rootPersonId) return [];

    const root = contacts.find((c) => c.id === rootPersonId);
    if (!root) return [];

    const treeData: any[] = [];
    
    // Gen 0: Root + Spouse
    const gen0 = {
      level: 0,
      couples: [
        {
          partnerA: root,
          partnerB: getSpouse(root.id),
          children: getChildren(root.id)
        }
      ]
    };
    treeData.push(gen0);

    // Gen 1: Children + their spouses
    const gen0Children = gen0.couples[0].children;
    if (gen0Children.length > 0) {
      const gen1Couples = gen0Children.map((child) => ({
        partnerA: child,
        partnerB: getSpouse(child.id),
        children: getChildren(child.id)
      }));

      treeData.push({
        level: 1,
        couples: gen1Couples
      });

      // Gen 2: Grandchildren
      const gen2Children: any[] = [];
      gen1Couples.forEach((c) => {
        gen2Children.push(...c.children);
      });

      if (gen2Children.length > 0) {
        treeData.push({
          level: 2,
          couples: gen2Children.map((grandchild) => ({
            partnerA: grandchild,
            partnerB: getSpouse(grandchild.id),
            children: []
          }))
        });
      }
    }

    return treeData;
  };

  const treeGenerations = buildTree(rootId);
  const selectedRootContact = contacts.find((c) => c.id === rootId);

  // Add Family Member Modal Setup
  const openAddMemberModal = (role: 'spouse' | 'child', sourceId: string) => {
    const source = contacts.find(c => c.id === sourceId);
    if (!source) return;

    setAddMemberRole(role);
    setAddMemberSourceContactId(sourceId);
    setModalTab('link');
    setSelectedLinkContactId('');

    // Pre-fills
    setNewFirstName('');
    setNewEmail('');
    setNewPhone('');
    
    if (role === 'child') {
      setNewLastName(source.last_name || '');
      setNewGender('');
    } else {
      setNewLastName('');
      if (source.gender === 'male') {
        setNewGender('female');
      } else if (source.gender === 'female') {
        setNewGender('male');
      } else {
        setNewGender('');
      }
    }

    setShowAddMemberModal(true);
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLinkContactId || !addMemberSourceContactId) return;

    try {
      if (addMemberRole === 'spouse') {
        await addRelationship(addMemberSourceContactId, selectedLinkContactId, 'spouse');
      } else {
        // Child: link parent relationship to source contact
        await addRelationship(addMemberSourceContactId, selectedLinkContactId, 'parent');
        // If source has a spouse, also link to spouse
        const spouse = getSpouse(addMemberSourceContactId);
        if (spouse) {
          await addRelationship(spouse.id, selectedLinkContactId, 'parent');
        }
      }
      setShowAddMemberModal(false);
      setSelectedLinkContactId('');
      loadTreeData();
    } catch (err) {
      console.error(err);
      alert('Error linking contact.');
    }
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !addMemberSourceContactId) return;

    try {
      const res = await createContact({
        firstName: newFirstName,
        lastName: newLastName,
        gender: newGender || undefined,
        email: newEmail || undefined,
        phoneNumber: newPhone || undefined,
        events: []
      });

      if (res.success && res.contactId) {
        if (addMemberRole === 'spouse') {
          await addRelationship(addMemberSourceContactId, res.contactId, 'spouse');
        } else {
          await addRelationship(addMemberSourceContactId, res.contactId, 'parent');
          const spouse = getSpouse(addMemberSourceContactId);
          if (spouse) {
            await addRelationship(spouse.id, res.contactId, 'parent');
          }
        }
      }
      setShowAddMemberModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewGender('');
      setNewEmail('');
      setNewPhone('');
      loadTreeData();
    } catch (err) {
      console.error(err);
      alert('Error creating and linking contact.');
    }
  };

  // Calculate statistics
  let coupleCount = 0;
  const uniqueMembers = new Set<string>();
  treeGenerations.forEach(gen => {
    gen.couples.forEach((c: any) => {
      if (c.partnerB) coupleCount++;
      if (c.partnerA) uniqueMembers.add(c.partnerA.id);
      if (c.partnerB) uniqueMembers.add(c.partnerB.id);
    });
  });
  const memberCount = uniqueMembers.size;

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Building family tree...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0', minHeight: '100vh', position: 'relative' }} className="page-transition">
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network style={{ color: 'var(--color-gold)' }} /> Family Trees
        </h2>
        <p className="page-subtitle">
          Visualize lineages, marriages, and generational lines.
        </p>
      </div>

      {/* Select Root Dropdown */}
      <div style={{ padding: '0 16px 20px 16px' }}>
        <div className="card" style={{ margin: 0, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Select Tree Root</span>
            <h4 className="serif-font" style={{ fontSize: '16px', color: 'var(--text-primary)' }}>
              {selectedRootContact ? `${selectedRootContact.first_name}${selectedRootContact.middle_name ? ' ' + selectedRootContact.middle_name : ''} ${selectedRootContact.last_name}'s Tree` : 'No contact selected'}
            </h4>
          </div>
          <select 
            className="form-select" 
            style={{ width: 'auto', minWidth: '160px', height: '36px', fontSize: '12px' }}
            value={rootId}
            onChange={(e) => setRootId(e.target.value)}
          >
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree Visualization Workspace */}
      <div style={{
        overflowX: 'auto',
        padding: '20px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0px',
        position: 'relative'
      }}>
        {treeGenerations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Select a tree root above to generate the pedigree chart.
          </div>
        ) : (
          treeGenerations.map((gen, gIdx) => (
            <div 
              key={gen.level}
              style={{
                display: 'flex',
                gap: '50px',
                justifyContent: 'center',
                width: '100%',
                position: 'relative'
              }}
            >
              {gen.couples.map((couple: any, cIdx: number) => {
                const partnerA = couple.partnerA;
                const partnerB = couple.partnerB;

                return (
                  <div 
                    key={partnerA.id}
                    onMouseEnter={() => setHoveredCoupleId(partnerA.id)}
                    onMouseLeave={() => setHoveredCoupleId(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    {/* Incoming vertical and horizontal lines for children */}
                    {gIdx > 0 && (
                      <div style={{ display: 'flex', width: '100%', height: '24px', position: 'relative' }}>
                        <div style={{
                          flex: 1,
                          borderTop: (cIdx === 0) ? 'none' : '2px solid var(--color-gold)',
                          marginTop: '0'
                        }} />
                        <div style={{
                          width: '2px',
                          backgroundColor: 'var(--color-gold)',
                          height: '24px'
                        }} />
                        <div style={{
                          flex: 1,
                          borderTop: (cIdx === gen.couples.length - 1) ? 'none' : '2px solid var(--color-gold)',
                          marginTop: '0'
                        }} />
                      </div>
                    )}

                    {/* Couple Box */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      backgroundColor: 'var(--bg-card)',
                      border: 'var(--border-thin)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      gap: '12px',
                      boxShadow: 'var(--shadow-soft)',
                      position: 'relative',
                      zIndex: 2,
                      transition: 'border-color 0.2s',
                      borderColor: hoveredCoupleId === partnerA.id ? 'var(--color-gold)' : 'rgba(196, 149, 58, 0.15)'
                    }}>
                      {/* Partner A */}
                      <div 
                        onClick={() => setSelectedContact(partnerA)}
                        style={{ textAlign: 'center', minWidth: '95px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                        title="Click to view details"
                      >
                        <span className="tree-node-name" style={{ display: 'block', fontWeight: '600', color: 'var(--color-gold)' }}>
                          {partnerA.first_name}{partnerA.middle_name ? ' ' + partnerA.middle_name : ''}
                        </span>
                        <span className="tree-node-sub" style={{ display: 'block' }}>
                          {partnerA.last_name}
                        </span>
                        {getAgeText(partnerA.id) && (
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                            {getAgeText(partnerA.id).replace('Age: ', '')}
                          </span>
                        )}
                      </div>

                      {/* Spouse Heart / dashed connector */}
                      {partnerB ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Heart size={14} className="heart-pulse" style={{ color: 'var(--color-rose)', fill: 'var(--color-rose-light)' }} />
                          </div>
                          
                          {/* Partner B */}
                          <div 
                            onClick={() => setSelectedContact(partnerB)}
                            style={{ textAlign: 'center', minWidth: '95px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                            title="Click to view details"
                          >
                            <span className="tree-node-name" style={{ display: 'block', fontWeight: '600', color: 'var(--color-gold)' }}>
                              {partnerB.first_name}{partnerB.middle_name ? ' ' + partnerB.middle_name : ''}
                            </span>
                            <span className="tree-node-sub" style={{ display: 'block' }}>
                              {partnerB.last_name}
                            </span>
                            {getAgeText(partnerB.id) && (
                              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                {getAgeText(partnerB.id).replace('Age: ', '')}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div 
                          onClick={() => openAddMemberModal('spouse', partnerA.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px dashed rgba(196, 149, 58, 0.3)',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            minWidth: '85px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: 'rgba(196, 149, 58, 0.02)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-gold)'; e.currentTarget.style.backgroundColor = 'rgba(196, 149, 58, 0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(196, 149, 58, 0.3)'; e.currentTarget.style.backgroundColor = 'rgba(196, 149, 58, 0.02)'; }}
                          title="Add Spouse"
                        >
                          + Add Spouse
                        </div>
                      )}
                    </div>

                    {/* Add Child Button (appears below the couple card on hover) */}
                    {hoveredCoupleId === partnerA.id && (
                      <button
                        onClick={() => openAddMemberModal('child', partnerA.id)}
                        style={{
                          position: 'absolute',
                          bottom: '-12px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-gold)',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(196, 149, 58, 0.4)',
                          zIndex: 10,
                          fontSize: '14px',
                          fontWeight: 'bold',
                          transition: 'transform 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.0)'}
                        title="Add Child"
                      >
                        +
                      </button>
                    )}

                    {/* Outgoing vertical line going down to children */}
                    {gIdx < treeGenerations.length - 1 && couple.children?.length > 0 && (
                      <div style={{
                        width: '2px',
                        height: '26px',
                        backgroundColor: 'var(--color-gold)',
                        position: 'relative',
                        zIndex: 1
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Tree Statistics Card */}
      {treeGenerations.length > 0 && (
        <div className="card" style={{ margin: '20px 16px', padding: '20px' }}>
          <h3 className="serif-font" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', borderBottom: 'var(--border-light)', paddingBottom: '8px', marginBottom: '16px' }}>
            Tree Statistics
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: 'var(--border-card)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Generations</span>
              <span className="serif-font" style={{ fontSize: '24px', color: 'var(--color-sage)', fontWeight: '700' }}>{treeGenerations.length}</span>
            </div>
            <div style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: 'var(--border-card)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Marriages</span>
              <span className="serif-font" style={{ fontSize: '24px', color: 'var(--color-gold)', fontWeight: '700' }}>{coupleCount}</span>
            </div>
            <div style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: 'var(--border-card)', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Total Family</span>
              <span className="serif-font" style={{ fontSize: '24px', color: 'var(--color-blue)', fontWeight: '700' }}>{memberCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Side Details Drawer */}
      {selectedContact && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '380px',
          maxWidth: '100%',
          height: '100vh',
          backgroundColor: 'var(--bg-card)',
          borderLeft: 'var(--border-thin)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 100,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-light)', paddingBottom: '12px' }}>
            <h3 className="serif-font" style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Contact Details</h3>
            <button 
              onClick={() => setSelectedContact(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {selectedContact.first_name} {selectedContact.middle_name} {selectedContact.last_name}
            </h4>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {selectedContact.gender && (
                <span style={{
                  fontSize: '10px',
                  backgroundColor: selectedContact.gender === 'male' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(236, 72, 153, 0.08)',
                  color: selectedContact.gender === 'male' ? '#3b82f6' : '#ec4899',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: selectedContact.gender === 'male' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(236, 72, 153, 0.2)'
                }}>
                  {selectedContact.gender === 'male' ? '♂ Male' : '♀ Female'}
                </span>
              )}
              {getAgeText(selectedContact.id) && (
                <span style={{
                  fontSize: '10px',
                  backgroundColor: 'rgba(196, 149, 58, 0.08)',
                  color: 'var(--color-gold)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(196, 149, 58, 0.2)'
                }}>
                  🎂 {getAgeText(selectedContact.id)}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            {selectedContact.email && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Email</span>
                <a href={`mailto:${selectedContact.email}`} style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>{selectedContact.email}</a>
              </div>
            )}
            {selectedContact.phone_number && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Phone</span>
                <a href={`tel:${selectedContact.phone_number}`} style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>{selectedContact.phone_number}</a>
              </div>
            )}
            {selectedContact.notes && (
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '600' }}>Notes</span>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedContact.notes}</p>
              </div>
            )}
          </div>

          <div style={{ borderTop: 'var(--border-light)', paddingTop: '16px' }}>
            <h4 className="serif-font" style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Relationships & Connections</h4>
            {relationships.filter(r => r.contact_a_id === selectedContact.id || r.contact_b_id === selectedContact.id).length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No direct connections found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relationships.filter(r => r.contact_a_id === selectedContact.id || r.contact_b_id === selectedContact.id).map(r => {
                  const otherId = r.contact_a_id === selectedContact.id ? r.contact_b_id : r.contact_a_id;
                  const other = contacts.find(c => c.id === otherId);
                  if (!other) return null;
                  
                  let label = '';
                  if (r.relation_type === 'spouse') {
                    label = 'Spouse';
                  } else {
                    label = r.contact_a_id === selectedContact.id ? 'Parent of' : 'Child of';
                  }

                  return (
                    <div 
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-primary)',
                        border: 'var(--border-thin)'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{other.first_name} {other.last_name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove connection with ${other.first_name}?`)) {
                            await removeRelationship(r.id);
                            loadTreeData();
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Add Family Member Modal */}
      {showAddMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110
        }}>
          <div className="card" style={{
            width: '450px',
            maxWidth: '90%',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--bg-card)',
            border: 'var(--border-thin)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-light)', paddingBottom: '12px' }}>
              <h3 className="serif-font" style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text-primary)' }}>
                Add {addMemberRole === 'spouse' ? 'Spouse' : 'Child'}
              </h3>
              <button 
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setModalTab('link')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: modalTab === 'link' ? 'rgba(196, 149, 58, 0.1)' : 'transparent',
                  color: modalTab === 'link' ? 'var(--color-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                Link Existing Contact
              </button>
              <button
                type="button"
                onClick={() => setModalTab('create')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: modalTab === 'create' ? 'rgba(196, 149, 58, 0.1)' : 'transparent',
                  color: modalTab === 'create' ? 'var(--color-gold)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                Create New Contact
              </button>
            </div>

            {modalTab === 'link' ? (
              <form onSubmit={handleLinkExisting} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Select Contact</label>
                  <select
                    className="form-select"
                    required
                    value={selectedLinkContactId}
                    onChange={(e) => setSelectedLinkContactId(e.target.value)}
                  >
                    <option value="">-- Choose Contact --</option>
                    {contacts
                      .filter(c => c.id !== addMemberSourceContactId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.first_name}{c.middle_name ? ' ' + c.middle_name : ''} {c.last_name} ({c.gender || 'unspecified'})
                        </option>
                      ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                  Link Family Member
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateAndLink} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">First Name</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={newFirstName} 
                      onChange={(e) => setNewFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Last Name</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={newLastName} 
                      onChange={(e) => setNewLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    required
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                  Create and Link Member
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
