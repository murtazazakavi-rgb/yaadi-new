'use client';

import React, { useState, useEffect, use } from 'react';
import { getCareCardByToken, saveCareCardResponses, updateContactPublicDetails } from '@/app/contacts/careCardActions';
import { ArrowLeft, ArrowRight, Heart, Sparkles, Check, ChevronUp, ChevronDown, Calendar, User, Phone, Mail, Edit } from 'lucide-react';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';

export default function PublicCareCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  // Load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactName, setContactName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Flow State
  // 'landing' | 'level1' | 'completion1' | 'level2' | 'completion2' | 'edit_details'
  const [flowStage, setFlowStage] = useState<'landing' | 'level1' | 'completion1' | 'level2' | 'completion2' | 'edit_details'>('landing');
  const [level1Step, setLevel1Step] = useState(0); // 0 to 10 (11 steps now)
  const [level2Step, setLevel2Step] = useState(0); // 0 to 9 (10 steps now)
  const [status, setStatus] = useState('not_started');
  const [knowMeBetterStatus, setKnowMeBetterStatus] = useState('not_started');

  // Basic Details & Dates State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bornAfterMaghrib, setBornAfterMaghrib] = useState(false);
  const [gBirthday, setGBirthday] = useState('');
  const [hBDate, setHBDate] = useState('');
  const [hBMonth, setHBMonth] = useState('');
  const [hBYear, setHBYear] = useState('');
  const [gAnniversary, setGAnniversary] = useState('');

  // Level 1 Form State
  const [appreciationStyle, setAppreciationStyle] = useState('');
  const [supportStyle, setSupportStyle] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState('');
  const [giftPreference, setGiftPreference] = useState('');
  const [socialStyle, setSocialStyle] = useState('');
  const [memoryPriorities, setMemoryPriorities] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [favFood, setFavFood] = useState('');
  const [favDessert, setFavDessert] = useState('');
  const [favDrink, setFavDrink] = useState('');
  const [favColour, setFavColour] = useState('');
  const [favHobby, setFavHobby] = useState('');
  const [currentFocus, setCurrentFocus] = useState<string[]>([]);
  const [duaRequests, setDuaRequests] = useState<string[]>([]);
  const [smallJoy, setSmallJoy] = useState('');

  // Level 2 Form State
  const [mattersMost, setMattersMost] = useState<string[]>([
    'Family', 'Faith', 'Health', 'Marriage', 'Career', 'Community', 'Financial Stability', 'Learning'
  ]);
  const [energySources, setEnergySources] = useState<string[]>([]);
  const [energyDrains, setEnergyDrains] = useState<string[]>([]);
  const [supportPreferences, setSupportPreferences] = useState<string[]>([]);
  const [hiddenTraits, setHiddenTraits] = useState<string[]>([]);
  const [friendshipManual, setFriendshipManual] = useState<string[]>([]);
  const [lifeSeason, setLifeSeason] = useState<string[]>([]);
  const [dreams, setDreams] = useState<string[]>([]);
  const [careExpression, setCareExpression] = useState<string[]>([]);
  const [sharedMoments, setSharedMoments] = useState<string[]>([]);
  const [connectionRhythm, setConnectionRhythm] = useState('');
  const [relationalRole, setRelationalRole] = useState('');
  const [resolvingTension, setResolvingTension] = useState('');
  const [relationalValidation, setRelationalValidation] = useState('');
  const [confidenceBoost, setConfidenceBoost] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [customInputText, setCustomInputText] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCareCardByToken(token);
        if (!data) {
          setError('This Care Card link is invalid or has expired.');
          setLoading(false);
          return;
        }

        setFirstName(data.first_name || '');
        setMiddleName(data.middle_name || '');
        setLastName(data.last_name || '');
        setContactName(`${data.first_name}${data.middle_name ? ' ' + data.middle_name : ''} ${data.last_name}`);
        setOwnerName(data.owner_name || 'Someone');
        setPhoneNumber(data.phone_number || '');
        setEmail(data.email || '');
        setBornAfterMaghrib(data.born_after_maghrib || false);

        // Parse events
        if (data.events && data.events.length > 0) {
          const gregBirth = data.events.find((e: any) => e.event_type === 'birthday_gregorian');
          if (gregBirth) {
            setGBirthday(`${gregBirth.g_year}-${String(gregBirth.g_month).padStart(2, '0')}-${String(gregBirth.g_day).padStart(2, '0')}`);
          }
          const hijriBirth = data.events.find((e: any) => e.event_type === 'birthday_hijri');
          if (hijriBirth) {
            setHBDate(hijriBirth.h_day?.toString() || '');
            setHBMonth(hijriBirth.h_month?.toString() || '');
            setHBYear(hijriBirth.h_year?.toString() || '');
          }
          const anniv = data.events.find((e: any) => e.event_type === 'anniversary');
          if (anniv) {
            setGAnniversary(`${anniv.g_year}-${String(anniv.g_month).padStart(2, '0')}-${String(anniv.g_day).padStart(2, '0')}`);
          }
        }

        setStatus(data.status || 'not_started');
        setKnowMeBetterStatus(data.know_me_better_status || 'not_started');

        // Pre-fill existing data if they are editing
        if (data.status === 'complete') {
          setAppreciationStyle(data.appreciation_style || '');
          setSupportStyle(data.support_style || '');
          setCommunicationPreference(data.communication_preference || '');
          setGiftPreference(data.gift_preference || '');
          setSocialStyle(data.social_style || '');
          setMemoryPriorities(data.memory_priorities || []);
          setInterests(data.interests || []);
          setFavFood(data.favourites?.food || '');
          setFavDessert(data.favourites?.dessert || '');
          setFavDrink(data.favourites?.drink || '');
          setFavColour(data.favourites?.colour || '');
          setFavHobby(data.favourites?.hobby || '');
          setCurrentFocus(data.current_focus || []);
          setDuaRequests(data.dua_requests || []);
          setSmallJoy(data.small_joy || '');
        }

        if (data.know_me_better_status === 'complete') {
          if (data.matters_most && data.matters_most.length > 0) setMattersMost(data.matters_most);
          setEnergySources(data.energy_sources || []);
          setEnergyDrains(data.energy_drains || []);
          setSupportPreferences(data.support_preferences || []);
          setHiddenTraits(data.hidden_traits || []);
          setFriendshipManual(data.friendship_manual || []);
          setLifeSeason(data.life_season || []);
          setDreams(data.dreams || []);
          setCareExpression(data.care_expression || []);
          setSharedMoments(data.shared_moments || []);
          setConnectionRhythm(data.connection_rhythm || '');
          setRelationalRole(data.relational_role || '');
          setResolvingTension(data.resolving_tension || '');
          setRelationalValidation(data.relational_validation || '');
          setConfidenceBoost(data.confidence_boost || '');
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('An error occurred while loading this page.');
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const handleLevel1Submit = async () => {
    setSubmitting(true);
    try {
      const responses = {
        appreciation_style: appreciationStyle,
        support_style: supportStyle,
        communication_preference: communicationPreference,
        gift_preference: giftPreference,
        social_style: socialStyle,
        memory_priorities: memoryPriorities,
        interests: interests,
        favourites: {
          food: favFood,
          dessert: favDessert,
          drink: favDrink,
          colour: favColour,
          hobby: favHobby
        },
        current_focus: currentFocus,
        dua_requests: duaRequests,
        small_joy: smallJoy
      };

      await saveCareCardResponses(token, {
        level: 1,
        responses
      });

      setStatus('complete');
      setFlowStage('completion1');
    } catch (err: any) {
      alert(err.message || 'Failed to save Care Card.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLevel2Submit = async () => {
    setSubmitting(true);
    try {
      const responses = {
        matters_most: mattersMost,
        energy_sources: energySources,
        energy_drains: energyDrains,
        support_preferences: supportPreferences,
        hidden_traits: hiddenTraits,
        friendship_manual: friendshipManual,
        life_season: lifeSeason,
        dreams: dreams,
        care_expression: careExpression,
        shared_moments: sharedMoments,
        connection_rhythm: connectionRhythm,
        relational_role: relationalRole,
        resolving_tension: resolvingTension,
        relational_validation: relationalValidation,
        confidence_boost: confidenceBoost
      };

      await saveCareCardResponses(token, {
        level: 2,
        responses
      });

      setKnowMeBetterStatus('complete');
      setFlowStage('completion2');
    } catch (err: any) {
      alert(err.message || 'Failed to save details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for single select questions
  const renderSingleSelect = (
    currentValue: string,
    setValue: (val: string) => void,
    options: string[]
  ) => {
    const isCustom = currentValue && !options.includes(currentValue);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        {options.map((opt) => {
          const isSelected = currentValue === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setValue(opt)}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: isSelected ? '2px solid var(--color-gold)' : '1px solid var(--border-light)',
                backgroundColor: isSelected ? 'var(--color-gold-light)' : 'var(--bg-card)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: isSelected ? '600' : '500',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-soft)'
              }}
            >
              {opt}
            </button>
          );
        })}
        
        {/* Custom Write-in Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Or write your own:
          </label>
          <input
            type="text"
            placeholder="Type your own answer..."
            value={isCustom ? currentValue : ''}
            onChange={(e) => setValue(e.target.value)}
            maxLength={100}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: isCustom ? '2px solid var(--color-gold)' : '1px solid var(--border-light)',
              backgroundColor: isCustom ? 'var(--color-gold-light)' : 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              boxShadow: isCustom ? 'var(--shadow-hover)' : 'var(--shadow-soft)'
            }}
          />
        </div>
      </div>
    );
  };

  // Helper for multi select questions
  const renderMultiSelect = (
    currentValues: string[],
    setValues: (val: string[]) => void,
    options: string[],
    maxSelection?: number
  ) => {
    const handleToggle = (opt: string) => {
      if (currentValues.includes(opt)) {
        setValues(currentValues.filter((v) => v !== opt));
      } else {
        if (maxSelection && currentValues.length >= maxSelection) {
          alert(`You can select a maximum of ${maxSelection} choices.`);
          return;
        }
        setValues([...currentValues, opt]);
      }
    };

    const handleAddCustom = () => {
      const trimmed = customInputText.trim();
      if (!trimmed) return;
      if (currentValues.includes(trimmed)) {
        setCustomInputText('');
        return;
      }
      if (maxSelection && currentValues.length >= maxSelection) {
        alert(`You can select a maximum of ${maxSelection} choices.`);
        return;
      }
      setValues([...currentValues, trimmed]);
      setCustomInputText('');
    };

    // Combine predefined options with any custom options already selected
    const allOptions = [...options];
    currentValues.forEach((val) => {
      if (!allOptions.includes(val)) {
        allOptions.push(val);
      }
    });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '16px' }}>
        {allOptions.map((opt) => {
          const isSelected = currentValues.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleToggle(opt)}
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: isSelected ? '2px solid var(--color-gold)' : '1px solid var(--border-light)',
                backgroundColor: isSelected ? 'var(--color-gold-light)' : 'var(--bg-card)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: isSelected ? '600' : '500',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-soft)'
              }}
            >
              <span>{opt}</span>
              {isSelected && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}

        {/* Add Custom Option Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Or add your own:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Type a custom option..."
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              maxLength={100}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                boxShadow: 'var(--shadow-soft)'
              }}
            />
            <button
              type="button"
              onClick={handleAddCustom}
              style={{
                padding: '0 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-gold)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-soft)'
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Reorder rankings helper
  const moveMattersMostItem = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= mattersMost.length) return;

    const updated = [...mattersMost];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setMattersMost(updated);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F4', padding: '20px' }}>
        <div style={{ textAlign: 'center', color: '#C4953A' }}>
          <Sparkles className="page-pulse" size={36} style={{ marginBottom: '12px' }} />
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'italic' }}>Loading card invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F4', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 20px', borderRadius: '20px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>⚠️</span>
          <h3 className="serif-font" style={{ fontSize: '22px', marginBottom: '12px' }}>Oops!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>{error}</p>
        </div>
      </div>
    );
  }

  // --- Gregorian to Hijri Date conversion logic ---
  const handleGBirthdayChange = (val: string, isAfterMaghrib = bornAfterMaghrib) => {
    setGBirthday(val);
    if (!val) return;
    const d = new Date(val + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      let calcDate = d;
      if (isAfterMaghrib) {
        calcDate = new Date(d.getTime() + 24 * 60 * 60 * 1000);
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

  const syncHBirthdayToGregorian = (d: string, m: string, y: string, isAfterMaghrib = bornAfterMaghrib) => {
    if (d && m && y) {
      try {
        const h = new HijriDate(parseInt(y), parseInt(m), parseInt(d));
        let gDateObj = h.toGregorian();
        if (isAfterMaghrib) {
          gDateObj = new Date(gDateObj.getTime() - 24 * 60 * 60 * 1000);
        }
        const year = gDateObj.getFullYear();
        const month = String(gDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(gDateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setGBirthday(formatted);
      } catch (err) {}
    }
  };

  return (
    <div style={{ height: '100dvh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        boxShadow: '0 0 40px rgba(0,0,0,0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Landing Page */}
        {flowStage === 'landing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '12px' }}>
              <div style={{
                display: 'inline-flex',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-light)',
                color: 'var(--color-gold)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <Heart size={28} fill="var(--color-gold)" style={{ opacity: 0.8 }} />
              </div>
              <h1 className="serif-font" style={{ fontSize: '26px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '6px' }}>
                Welcome, {firstName || 'Friend'}! 👋
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 auto', maxWidth: '300px' }}>
                This is your personal connection card with <strong>{ownerName}</strong>. Keep your details and preferences up to date.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* CARD A: Personal Details */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-gold)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} /> Personal Details & Dates
                  </span>
                  <button
                    onClick={() => setFlowStage('edit_details')}
                    style={{ border: 'none', background: 'none', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <Edit size={13} /> Edit
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Full Name:</strong> {firstName} {middleName ? middleName + ' ' : ''}{lastName}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Phone:</strong> {phoneNumber || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Email:</strong> {email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      📅 <strong style={{ color: 'var(--text-primary)' }}>Birthday:</strong> {(() => {
                        if (!gBirthday) return 'Not set';
                        try {
                          const d = new Date(gBirthday + 'T00:00:00');
                          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        } catch (e) {
                          return gBirthday;
                        }
                      })()}
                      {bornAfterMaghrib && <span style={{ fontSize: '11px', color: 'var(--color-gold)', marginLeft: '6px' }}>(Born after Maghrib)</span>}
                    </div>
                    <div>
                      🌙 <strong style={{ color: 'var(--text-primary)' }}>Waras (Hijri):</strong> {(() => {
                        if (!hBDate || !hBMonth) return 'Not set';
                        const monthName = HIJRI_MONTH_NAMES[parseInt(hBMonth)] || hBMonth;
                        return `${hBDate} ${monthName} ${hBYear || ''}`.trim();
                      })()}
                    </div>
                    <div>
                      💍 <strong style={{ color: 'var(--text-primary)' }}>Anniversary:</strong> {(() => {
                        if (!gAnniversary) return 'Not set';
                        try {
                          const d = new Date(gAnniversary + 'T00:00:00');
                          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        } catch (e) {
                          return gAnniversary;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD B: Care Preferences */}
              <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-sage)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> Care Preferences
                  </span>
                  {status === 'complete' && (
                    <button
                      onClick={() => setFlowStage('level1')}
                      style={{ border: 'none', background: 'none', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <Edit size={13} /> Update
                    </button>
                  )}
                </div>

                {status === 'complete' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                    {/* Core style items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {appreciationStyle && (
                        <div>
                          ❤️ <strong style={{ color: 'var(--text-primary)' }}>Appreciates:</strong> {appreciationStyle}
                        </div>
                      )}
                      {supportStyle && (
                        <div>
                          💪 <strong style={{ color: 'var(--text-primary)' }}>When Stressed:</strong> {supportStyle}
                        </div>
                      )}
                      {communicationPreference && (
                        <div>
                          📱 <strong style={{ color: 'var(--text-primary)' }}>Best Way to Reach:</strong> {communicationPreference}
                        </div>
                      )}
                      {giftPreference && (
                        <div>
                          🎁 <strong style={{ color: 'var(--text-primary)' }}>Gift Cheat Code:</strong> {giftPreference}
                        </div>
                      )}
                      {socialStyle && (
                        <div>
                          🔋 <strong style={{ color: 'var(--text-primary)' }}>Social Battery:</strong> {socialStyle}
                        </div>
                      )}
                      {smallJoy && (
                        <div>
                          😊 <strong style={{ color: 'var(--text-primary)' }}>Small Joy:</strong> "{smallJoy}"
                        </div>
                      )}
                    </div>

                    {/* Favourites Section */}
                    {(favFood || favDessert || favDrink || favColour || favHobby) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>My Favourites</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', fontSize: '12.5px' }}>
                          {favFood && <div>🍽️ <strong style={{ color: 'var(--text-primary)' }}>Food:</strong> {favFood}</div>}
                          {favDessert && <div>🍰 <strong style={{ color: 'var(--text-primary)' }}>Dessert:</strong> {favDessert}</div>}
                          {favDrink && <div>🥤 <strong style={{ color: 'var(--text-primary)' }}>Drink:</strong> {favDrink}</div>}
                          {favColour && <div>🎨 <strong style={{ color: 'var(--text-primary)' }}>Colour:</strong> {favColour}</div>}
                          {favHobby && <div>🎸 <strong style={{ color: 'var(--text-primary)' }}>Hobby:</strong> {favHobby}</div>}
                        </div>
                      </div>
                    )}

                    {/* Tag Lists: Memory Priorities, Interests, Focus, Dua */}
                    {memoryPriorities && memoryPriorities.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Remember About Me</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {memoryPriorities.map((item) => (
                            <span key={item} style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-primary)' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {interests && interests.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Interests</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {interests.map((item) => (
                            <span key={item} style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'rgba(107, 142, 110, 0.08)', border: '1px solid rgba(107, 142, 110, 0.15)', fontSize: '11px', color: 'var(--color-sage)' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentFocus && currentFocus.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Focus Areas</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {currentFocus.map((item) => (
                            <span key={item} style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'rgba(196, 149, 58, 0.08)', border: '1px solid rgba(196, 149, 58, 0.15)', fontSize: '11px', color: 'var(--color-gold)' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {duaRequests && duaRequests.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Dua Requests</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {duaRequests.map((item) => (
                            <span key={item} style={{ padding: '4px 8px', borderRadius: '8px', backgroundColor: 'rgba(74, 119, 122, 0.08)', border: '1px solid rgba(74, 119, 122, 0.15)', fontSize: '11px', color: '#4A777A' }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--border-light)', paddingTop: '8px', marginTop: '2px' }}>
                      Preferences are active and visible in {ownerName}'s directory.
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                      You haven't shared your care preferences yet. Share them to help {ownerName} remember what matters to you.
                    </p>
                    <button
                      onClick={() => setFlowStage('level1')}
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600', height: 'auto', borderRadius: '10px', backgroundColor: 'var(--color-sage)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      Fill Preferences <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* CARD C: Know Me Better */}
              {status === 'complete' && (
                <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--border-light)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-sage)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> Know Me Better 🌱
                    </span>
                    {knowMeBetterStatus === 'complete' && (
                      <button
                        onClick={() => setFlowStage('level2')}
                        style={{ border: 'none', background: 'none', color: 'var(--color-sage)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <Edit size={13} /> Update
                      </button>
                    )}
                  </div>

                  {knowMeBetterStatus === 'complete' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      {/* Matters Most ranking */}
                      {mattersMost && mattersMost.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Top Priorities (Ranked)</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {mattersMost.map((item, idx) => (
                              <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '8px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px', color: 'var(--text-primary)' }}>
                                <span style={{ fontWeight: '750', color: 'var(--color-gold)', fontSize: '10px' }}>{idx + 1}</span> {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Social/Relational Dynamics */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                        {connectionRhythm && (
                          <div>
                            🔄 <strong style={{ color: 'var(--text-primary)' }}>Check-in Rhythm:</strong> {connectionRhythm}
                          </div>
                        )}
                        {relationalRole && (
                          <div>
                            🎭 <strong style={{ color: 'var(--text-primary)' }}>Relational Role:</strong> {relationalRole}
                          </div>
                        )}
                        {resolvingTension && (
                          <div>
                            ⚡ <strong style={{ color: 'var(--text-primary)' }}>Resolving Tension:</strong> {resolvingTension}
                          </div>
                        )}
                        {relationalValidation && (
                          <div>
                            🎖️ <strong style={{ color: 'var(--text-primary)' }}>Validation Needed:</strong> {relationalValidation}
                          </div>
                        )}
                        {confidenceBoost && (
                          <div>
                            🚀 <strong style={{ color: 'var(--text-primary)' }}>Confidence Booster:</strong> {confidenceBoost}
                          </div>
                        )}
                      </div>

                      {/* Energy Dynamics */}
                      {((energySources && energySources.length > 0) || (energyDrains && energyDrains.length > 0)) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                          {energySources && energySources.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Energy Givers ⚡</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {energySources.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(107, 142, 110, 0.06)', border: '1px solid rgba(107, 142, 110, 0.12)', fontSize: '11px', color: 'var(--color-sage)' }}>
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {energyDrains && energyDrains.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Energy Drains 📉</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {energyDrains.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'rgba(196, 70, 70, 0.06)', border: '1px solid rgba(196, 70, 70, 0.12)', fontSize: '11px', color: '#C44646' }}>
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Support & Relationship Details */}
                      {((supportPreferences && supportPreferences.length > 0) || 
                        (friendshipManual && friendshipManual.length > 0) || 
                        (hiddenTraits && hiddenTraits.length > 0) || 
                        (lifeSeason && lifeSeason.length > 0) ||
                        (dreams && dreams.length > 0) ||
                        (careExpression && careExpression.length > 0) ||
                        (sharedMoments && sharedMoments.length > 0)) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px dashed var(--border-light)', paddingTop: '10px' }}>
                          
                          {lifeSeason && lifeSeason.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Current Season 🍂</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {lifeSeason.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {supportPreferences && supportPreferences.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Support Needs 🤝</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {supportPreferences.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {friendshipManual && friendshipManual.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Friendship Guidelines 📖</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {friendshipManual.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {hiddenTraits && hiddenTraits.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Hidden Traits 🧩</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {hiddenTraits.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {dreams && dreams.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Dreams & Goals 💭</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {dreams.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {careExpression && careExpression.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Expressing Care 💌</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {careExpression.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {sharedMoments && sharedMoments.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Favoured Moments 🫂</strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {sharedMoments.map((item) => (
                                  <span key={item} style={{ padding: '3px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-card-active)', border: '1px solid var(--border-light)', fontSize: '11px' }}>{item}</span>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                        Go deeper. Share your priorities, energy dynamics, connection rhythms, and how you deal with tension.
                      </p>
                      <button
                        onClick={() => setFlowStage('level2')}
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '600', height: 'auto', borderRadius: '10px', backgroundColor: 'var(--color-sage)', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        Share More Details <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Details Page */}
        {flowStage === 'edit_details' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <button 
                onClick={() => setFlowStage('landing')} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="serif-font" style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                Edit Personal Details
              </h2>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                try {
                  const finalEvents: any[] = [];
                  
                  // Gregorian Birthday
                  if (gBirthday) {
                    const parts = gBirthday.split('-');
                    finalEvents.push({
                      eventType: 'birthday_gregorian',
                      gYear: parseInt(parts[0]),
                      gMonth: parseInt(parts[1]),
                      gDay: parseInt(parts[2])
                    });
                  }

                  // Hijri Birthday / Waras
                  if (hBDate && hBMonth && hBYear) {
                    finalEvents.push({
                      eventType: 'birthday_hijri',
                      hDay: parseInt(hBDate),
                      hMonth: parseInt(hBMonth),
                      hYear: parseInt(hBYear)
                    });
                  }

                  // Wedding Anniversary
                  if (gAnniversary) {
                    const parts = gAnniversary.split('-');
                    finalEvents.push({
                      eventType: 'anniversary',
                      gYear: parseInt(parts[0]),
                      gMonth: parseInt(parts[1]),
                      gDay: parseInt(parts[2])
                    });
                  }

                  await updateContactPublicDetails(token, {
                    firstName,
                    middleName,
                    lastName,
                    phoneNumber,
                    email,
                    bornAfterMaghrib,
                    events: finalEvents
                  });

                  setContactName(`${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`);
                  setFlowStage('landing');
                } catch (err: any) {
                  alert(err.message || 'Failed to save details.');
                } finally {
                  setSubmitting(false);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Names row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="form-group" style={{ flex: 1, minWidth: '80px', margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>First Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '80px', margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Middle Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: '80px', margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +919825535907"
                  style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ahmed@example.com"
                  style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                />
              </div>

              {/* Solar Birthday & Maghrib & Hijri Converter */}
              <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-card-active)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '750', textTransform: 'uppercase', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} /> Birthday & Hijri Waras
                </span>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'none' }}>Gregorian Birthday (Solar)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={gBirthday}
                    onChange={(e) => handleGBirthdayChange(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="born-maghrib"
                    checked={bornAfterMaghrib}
                    onChange={(e) => handleBornAfterMaghribToggle(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="born-maghrib" style={{ fontSize: '12.5px', color: 'var(--text-primary)', cursor: 'pointer', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
                    Born after Maghrib (Islamic date shifts +1 day)
                  </label>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '10px', marginTop: '4px' }}>
                  <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'none', marginBottom: '8px', display: 'block' }}>Hijri Birthday (Waras) - Calculated automatically</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div className="form-group" style={{ width: '60px', margin: 0 }}>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        placeholder="Day"
                        className="form-input"
                        value={hBDate}
                        onChange={(e) => {
                          setHBDate(e.target.value);
                          syncHBirthdayToGregorian(e.target.value, hBMonth, hBYear);
                        }}
                        style={{ padding: '8px 6px', fontSize: '13px', borderRadius: '8px', textAlign: 'center' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <select
                        className="form-select"
                        value={hBMonth}
                        onChange={(e) => {
                          setHBMonth(e.target.value);
                          syncHBirthdayToGregorian(hBDate, e.target.value, hBYear);
                        }}
                        style={{ padding: '8px 6px', fontSize: '13px', borderRadius: '8px' }}
                      >
                        <option value="">Select Hijri Month...</option>
                        {HIJRI_MONTH_NAMES.map((name, idx) => (
                          <option key={idx} value={idx}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ width: '70px', margin: 0 }}>
                      <input
                        type="number"
                        min="1300"
                        max="1600"
                        placeholder="Year"
                        className="form-input"
                        value={hBYear}
                        onChange={(e) => {
                          setHBYear(e.target.value);
                          syncHBirthdayToGregorian(hBDate, hBMonth, e.target.value);
                        }}
                        style={{ padding: '8px 6px', fontSize: '13px', borderRadius: '8px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Wedding Anniversary */}
              <div style={{ border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bg-card-active)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '750', textTransform: 'uppercase', color: 'var(--color-anniversary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={13} /> Wedding Anniversary
                </span>
                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="date"
                    className="form-input"
                    value={gAnniversary}
                    onChange={(e) => setGAnniversary(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '10px' }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: 'var(--border-light)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setFlowStage('landing')}
                  className="btn btn-secondary"
                  disabled={submitting}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', backgroundColor: 'var(--color-gold)' }}
                >
                  {submitting ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LEVEL 1: Care Card */}
        {flowStage === 'level1' && (() => {
          const steps = [
            {
              title: "Make My Day",
              question: "To make my day, I'd love...",
              render: () => renderSingleSelect(appreciationStyle, setAppreciationStyle, [
                "A thoughtful message",
                "A phone call",
                "Some food or dessert",
                "A heartfelt dua",
                "Peaceful alone time"
              ])
            },
            {
              title: "When Life Gets Stressful",
              question: "When I'm stressed, I usually appreciate...",
              render: () => renderSingleSelect(supportStyle, setSupportStyle, [
                "Advice",
                "Someone who listens",
                "Practical help",
                "Space",
                "Humour and distraction"
              ])
            },
            {
              title: "Best Way To Reach Me",
              question: "The best way to reach me is...",
              render: () => renderSingleSelect(communicationPreference, setCommunicationPreference, [
                "A WhatsApp message",
                "A voice note",
                "A phone call",
                "In person",
                "Only if it's important 😄"
              ])
            },
            {
              title: "Gift Cheat Code",
              question: "The best gift for me is usually...",
              render: () => renderSingleSelect(giftPreference, setGiftPreference, [
                "Something useful",
                "Something sentimental",
                "Food",
                "An experience",
                "Cash 😄"
              ])
            },
            {
              title: "My Social Battery",
              question: "At gatherings I'm usually...",
              render: () => renderSingleSelect(socialStyle, setSocialStyle, [
                "Talking to everyone",
                "With a small group",
                "Helping organise",
                "Enjoying food quietly",
                "Looking for the exit 😄"
              ])
            },
            {
              title: "Remember These Things",
              question: "What would you most like people to remember about you?",
              subtitle: "Select up to 5 options",
              render: () => renderMultiSelect(memoryPriorities, setMemoryPriorities, [
                "My birthday",
                "My Hijri Birthday (Waras)",
                "My favourite food",
                "My hobbies",
                "My family",
                "My goals",
                "My dua requests",
                "My achievements",
                "My business/work",
                "My health journey"
              ], 5)
            },
            {
              title: "Interests",
              question: "Things I enjoy:",
              render: () => renderMultiSelect(interests, setInterests, [
                "Reading", "Travel", "Fitness", "Entrepreneurship", "Technology",
                "Investing", "Cricket", "Football", "Islamic Studies", "Cooking",
                "Gardening", "Photography", "Home Decor", "Sewing", "Arts & Crafts",
                "Parenting", "Volunteering"
              ])
            },
            {
              title: "Favourites",
              question: "A few of my favorite things...",
              subtitle: "Feel free to leave these empty or skip",
              render: () => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {[
                    { label: "Favourite Food", value: favFood, setter: setFavFood, placeholder: "e.g. Biryani" },
                    { label: "Favourite Dessert", value: favDessert, setter: setFavDessert, placeholder: "e.g. Chocolate Cake" },
                    { label: "Favourite Drink", value: favDrink, setter: setFavDrink, placeholder: "e.g. Mango Lassi" },
                    { label: "Favourite Colour", value: favColour, setter: setFavColour, placeholder: "e.g. Emerald Green" },
                    { label: "Favourite Hobby", value: favHobby, setter: setFavHobby, placeholder: "e.g. Photography" }
                  ].map((field) => (
                    <div key={field.label} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">{field.label}</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        style={{ padding: '12px 16px', fontSize: '14px', borderRadius: '12px' }}
                      />
                    </div>
                  ))}
                </div>
              )
            },
            {
              title: "Right Now",
              question: "What are you most focused on these days?",
              render: () => renderMultiSelect(currentFocus, setCurrentFocus, [
                "Career", "Business", "Family", "Marriage", "Health", "Learning",
                "Spiritual Growth", "Travel", "Financial Goals"
              ])
            },
            {
              title: "Dua Requests",
              question: "What would you appreciate duas for?",
              render: () => renderMultiSelect(duaRequests, setDuaRequests, [
                "Health", "Parents", "Marriage", "Children", "Studies", "Rizq",
                "Business", "Spiritual Growth", "Peace of Mind"
              ])
            },
            {
              title: "A Small Joy",
              question: "A simple thing that always brings a smile to my face is...",
              render: () => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <textarea
                    placeholder="e.g. A hot cup of tea in the morning, hearing rain on the window, or a message from an old friend..."
                    value={smallJoy}
                    onChange={(e) => setSmallJoy(e.target.value)}
                    rows={4}
                    style={{
                      padding: '16px',
                      fontSize: '15px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      resize: 'none',
                      lineHeight: '1.5',
                      boxShadow: 'var(--shadow-soft)',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                </div>
              )
            }
          ];

          const currentStep = steps[level1Step];

          const handleNext = () => {
            setCustomInputText('');
            if (level1Step < steps.length - 1) {
              setLevel1Step(level1Step + 1);
            } else {
              handleLevel1Submit();
            }
          };

          const handleBack = () => {
            setCustomInputText('');
            if (level1Step > 0) {
              setLevel1Step(level1Step - 1);
            } else {
              setFlowStage('landing');
            }
          };

          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', minHeight: 0, overflow: 'hidden' }}>
              {/* Header Navigation & Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button onClick={handleBack} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${((level1Step + 1) / steps.length) * 100}%`,
                    backgroundColor: 'var(--color-gold)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', width: '36px', textAlign: 'right' }}>
                  {level1Step + 1}/{steps.length}
                </span>
              </div>

              {/* Card Question content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 0, overflow: 'hidden' }} className="page-transition">
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-gold)', letterSpacing: '0.5px' }}>
                  Care Card • {currentStep.title}
                </span>
                <h2 className="serif-font" style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '4px', lineHeight: '1.4' }}>
                  {currentStep.question}
                </h2>
                {'subtitle' in currentStep && currentStep.subtitle && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentStep.subtitle}</span>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                  {currentStep.render()}
                </div>
              </div>

              {/* Bottom Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: 'var(--border-light)' }}>
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ flex: 1, padding: '14px', fontSize: '14px', fontWeight: '600', borderRadius: '12px', height: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? 'Saving...' : level1Step === steps.length - 1 ? 'Finish Care Card' : 'Continue'}
                  {!submitting && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Completion Level 1 */}
        {flowStage === 'completion1' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(107, 142, 110, 0.1)',
                color: 'var(--color-sage)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Check size={32} strokeWidth={3} />
              </div>
              <h1 className="serif-font" style={{ fontSize: '26px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '12px' }}>
                ❤️ Thank You
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 auto 24px auto', maxWidth: '300px' }}>
                Your Care Card is complete. You've helped {ownerName} remember what matters to you.
              </p>
              
              <div className="card" style={{
                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(107, 142, 110, 0.05) 100%)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(107, 142, 110, 0.2)',
                textAlign: 'left',
                margin: '0 0 24px 0'
              }}>
                <h4 className="serif-font" style={{ fontSize: '16px', fontWeight: '650', color: 'var(--text-primary)' }}>Know Me Better 🌱</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                  If you are close friends or family, would you like to answer a few more questions to share a little deeper about yourself?
                </p>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  ⏱ Takes about 3 minutes • Optional
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setFlowStage('level2')}
                className="btn btn-primary"
                style={{ padding: '16px', fontSize: '14px', fontWeight: '600', borderRadius: '14px', height: 'auto' }}
              >
                Continue To Know Me Better 🌱
              </button>
              <button
                onClick={() => setFlowStage('landing')}
                className="btn btn-ghost"
                style={{ padding: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                Finish & View Dashboard
              </button>
            </div>
          </div>
        )}

        {/* LEVEL 2: Know Me Better */}
        {flowStage === 'level2' && (() => {
          const steps = [
            {
              title: "What Matters Most",
              question: "Rank the following in order of importance:",
              subtitle: "Tap arrows to move items up/down",
              render: () => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  {mattersMost.map((item, idx) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-soft)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-gold-light)',
                          color: 'var(--color-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{item}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => moveMattersMostItem(idx, 'up')}
                          disabled={idx === 0}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            color: idx === 0 ? 'rgba(0,0,0,0.1)' : 'var(--text-secondary)'
                          }}
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMattersMostItem(idx, 'down')}
                          disabled={idx === mattersMost.length - 1}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: '6px',
                            cursor: 'pointer',
                            color: idx === mattersMost.length - 1 ? 'rgba(0,0,0,0.1)' : 'var(--text-secondary)'
                          }}
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            },
            {
              title: "What Gives Me Energy",
              question: "What energizes me:",
              subtitle: "Select up to 5 options",
              render: () => renderMultiSelect(energySources, setEnergySources, [
                "Family time",
                "Deep conversations",
                "Travel",
                "Learning",
                "Helping others",
                "Building a business",
                "Solving problems",
                "Spiritual activities",
                "Creating things",
                "Quiet time"
              ], 5)
            },
            {
              title: "What Drains Me",
              question: "Things that drain me:",
              subtitle: "Select up to 5 options",
              render: () => renderMultiSelect(energyDrains, setEnergyDrains, [
                "Conflict",
                "Crowds",
                "Financial pressure",
                "Health issues",
                "Uncertainty",
                "Loneliness",
                "Time pressure",
                "Negative people",
                "Lack of purpose",
                "Being misunderstood"
              ], 5)
            },
            {
              title: "How Can People Support Me",
              question: "When I'm struggling, I appreciate:",
              render: () => renderMultiSelect(supportPreferences, setSupportPreferences, [
                "Practical help",
                "Advice",
                "Listening",
                "Encouragement",
                "Dua",
                "Space"
              ])
            },
            {
              title: "I Wish People Knew",
              question: "I wish people knew...",
              render: () => renderMultiSelect(hiddenTraits, setHiddenTraits, [
                "I'm more sensitive than I appear",
                "I need alone time",
                "I struggle asking for help",
                "I worry more than people realise",
                "I care deeply about family",
                "I hide stress well",
                "I value loyalty highly",
                "I appreciate small gestures"
              ])
            },
            {
              title: "Friendship Manual",
              question: "In friendship, remember that...",
              render: () => renderMultiSelect(friendshipManual, setFriendshipManual, [
                "I reply slowly but still care",
                "I prefer calls over texting",
                "I dislike last-minute plans",
                "I love spontaneous plans",
                "I appreciate honesty",
                "I appreciate consistency",
                "I need reminders",
                "I enjoy deep conversations"
              ])
            },
            {
              title: "Current Season Of Life",
              question: "My current season of life involves...",
              render: () => renderMultiSelect(lifeSeason, setLifeSeason, [
                "Building a business",
                "Raising children",
                "Preparing for marriage",
                "Improving health",
                "Learning something new",
                "Growing spiritually",
                "Career growth",
                "Supporting parents",
                "Seeking balance"
              ])
            },
            {
              title: "My Dreams",
              question: "My dreams for the future include:",
              subtitle: "Select up to 5 options",
              render: () => renderMultiSelect(dreams, setDreams, [
                "Financial Freedom",
                "Happy Family",
                "Strong Faith",
                "Successful Business",
                "Travel The World",
                "Community Impact",
                "Learning & Knowledge",
                "Good Health",
                "Peaceful Life"
              ], 5)
            },
            {
              title: "How I Show Care",
              question: "I naturally express my care for others by...",
              subtitle: "Select all that apply",
              render: () => renderMultiSelect(careExpression, setCareExpression, [
                "Sending check-in messages",
                "Giving small, unexpected gifts",
                "Planning quality time together",
                "Helping out with chores or tasks",
                "Offering sincere prayers/duas",
                "Listening without trying to fix things",
                "Sharing food or cooking for them"
              ])
            },
            {
              title: "Shared Moments",
              question: "If we had a free afternoon together, I'd love to...",
              subtitle: "Select all that apply",
              render: () => renderMultiSelect(sharedMoments, setSharedMoments, [
                "Go for a walk in nature",
                "Grab a warm drink and chat",
                "Explore a new bookstore or museum",
                "Watch a good movie or show",
                "Cook or share a meal together",
                "Sit in comfortable silence",
                "Work on side-by-side projects"
              ])
            },
            {
              title: "Connection Rhythm",
              question: "When it comes to staying in touch, I usually prefer...",
              render: () => renderSingleSelect(connectionRhythm, setConnectionRhythm, [
                "Catching up frequently over quick, casual messages",
                "Having a long, deep phone call once in a while",
                "Meeting up in person for face-to-face catch-ups",
                "Picking up right where we left off, even after months of silence"
              ])
            },
            {
              title: "Relational Role",
              question: "In our relationship, I value you most as...",
              render: () => renderSingleSelect(relationalRole, setRelationalRole, [
                "Someone I can vent to and feel heard by",
                "Someone who offers wise advice and perspective when I'm stuck",
                "Someone to laugh, have fun, and share good times with",
                "A quiet, steady presence in my corner who is always there"
              ])
            },
            {
              title: "Resolving Tension",
              question: "If we ever have a misunderstanding or hurt feelings, my preferred way to clear the air is...",
              render: () => renderSingleSelect(resolvingTension, setResolvingTension, [
                "A quick text to sort things out immediately",
                "A phone call so we can hear each other's voice",
                "A face-to-face chat over a warm drink",
                "Giving it a day or two of space before we talk it through"
              ])
            },
            {
              title: "Relational Validation",
              question: "I feel most seen and appreciated when you notice...",
              render: () => renderSingleSelect(relationalValidation, setRelationalValidation, [
                "My appearance or style (e.g. telling me I look nice, beautiful, or handsome)",
                "My intellect (e.g. asking for my advice, opinion, or thoughts)",
                "My heart (e.g. recognizing my kindness, empathy, or loyalty)",
                "My hard work (e.g. acknowledging my projects, career, or personal goals)",
                "My energy (e.g. saying I bring good vibes or make you laugh)"
              ])
            },
            {
              title: "Confidence Boost",
              question: "When I'm feeling a bit low or insecure, a simple way you can lift my spirits is to...",
              render: () => renderSingleSelect(confidenceBoost, setConfidenceBoost, [
                "Send a text sharing what you value about our relationship",
                "Call me up just to chat and hear about my day",
                "Ask for my input on something, showing you trust my judgment",
                "Remind me of a strength or quality of mine that I might be forgetting",
                "Plan a relaxed, low-pressure hang-out to help get my mind off things"
              ])
            }
          ];

          const currentStep = steps[level2Step];

          const handleNext = () => {
            setCustomInputText('');
            if (level2Step < steps.length - 1) {
              setLevel2Step(level2Step + 1);
            } else {
              handleLevel2Submit();
            }
          };

          const handleBack = () => {
            setCustomInputText('');
            if (level2Step > 0) {
              setLevel2Step(level2Step - 1);
            } else {
              setFlowStage('completion1');
            }
          };

          return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', minHeight: 0, overflow: 'hidden' }}>
              {/* Header Navigation & Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button onClick={handleBack} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${((level2Step + 1) / steps.length) * 100}%`,
                    backgroundColor: 'var(--color-sage)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', width: '36px', textAlign: 'right' }}>
                  {level2Step + 1}/{steps.length}
                </span>
              </div>

              {/* Card Question content */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 0, overflow: 'hidden' }} className="page-transition">
                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-sage)', letterSpacing: '0.5px' }}>
                  Know Me Better • {currentStep.title}
                </span>
                <h2 className="serif-font" style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '4px', lineHeight: '1.4' }}>
                  {currentStep.question}
                </h2>
                {'subtitle' in currentStep && currentStep.subtitle && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currentStep.subtitle}</span>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                  {currentStep.render()}
                </div>
              </div>

              {/* Bottom Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: 'var(--border-light)' }}>
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ flex: 1, padding: '14px', fontSize: '14px', fontWeight: '600', borderRadius: '12px', height: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-sage)' }}
                >
                  {submitting ? 'Saving...' : level2Step === steps.length - 1 ? 'Finish Profile' : 'Continue'}
                  {!submitting && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Completion Level 2 */}
        {flowStage === 'completion2' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 24px', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(196, 149, 58, 0.1)',
                color: 'var(--color-gold)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <Check size={32} strokeWidth={3} />
              </div>
              <h1 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '12px' }}>
                🌱 Thank You
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 auto 24px auto', maxWidth: '300px' }}>
                You've shared a little more about yourself. Your profile has been updated.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setFlowStage('landing')}
                className="btn btn-primary"
                style={{ padding: '14px 28px', fontSize: '14px', fontWeight: '600', borderRadius: '12px', height: 'auto', backgroundColor: 'var(--color-sage)', color: '#FFFFFF', border: 'none', cursor: 'pointer', width: '200px' }}
              >
                View Profile Card
              </button>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                Or you can close this window now.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
