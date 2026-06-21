'use client';

import React, { useState, useEffect, use } from 'react';
import { getCareCardByToken, saveCareCardResponses } from '@/app/contacts/careCardActions';
import { ArrowLeft, ArrowRight, Heart, Sparkles, Check, ChevronUp, ChevronDown } from 'lucide-react';

export default function PublicCareCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  // Load state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactName, setContactName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Flow State
  // 'landing' | 'level1' | 'completion1' | 'level2' | 'completion2'
  const [flowStage, setFlowStage] = useState<'landing' | 'level1' | 'completion1' | 'level2' | 'completion2'>('landing');
  const [level1Step, setLevel1Step] = useState(0); // 0 to 10 (11 steps now)
  const [level2Step, setLevel2Step] = useState(0); // 0 to 9 (10 steps now)

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

  // Submit states
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getCareCardByToken(token);
        if (!data) {
          setError('This Care Card link is invalid or has expired.');
          setLoading(false);
          return;
        }

        setContactName(`${data.first_name}${data.middle_name ? ' ' + data.middle_name : ''} ${data.last_name}`);
        setOwnerName(data.owner_name || 'Someone');

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
        shared_moments: sharedMoments
      };

      await saveCareCardResponses(token, {
        level: 2,
        responses
      });

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

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '16px' }}>
        {options.map((opt) => {
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '24px' }}>
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
                <Heart size={32} fill="var(--color-gold)" style={{ opacity: 0.8 }} />
              </div>
              <h1 className="serif-font" style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '12px' }}>
                Help Me Remember You ❤️
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: '0 auto 24px auto', maxWidth: '320px' }}>
                I'm using Yaadi to remember important dates and stay connected with people I care about.
              </p>
              <div className="card" style={{
                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(197, 160, 89, 0.05) 100%)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(197, 160, 89, 0.2)',
                textAlign: 'left',
                margin: '0 0 24px 0'
              }}>
                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-gold)', marginBottom: '8px' }}>Invitation from</span>
                <h4 className="serif-font" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>{ownerName}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Answer a few fun questions so I can better remember what matters to you.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>⏱ Takes about 2 minutes</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setFlowStage('level1')}
              className="btn btn-accent"
              style={{ padding: '16px', fontSize: '15px', fontWeight: '600', height: 'auto', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              Start Care Card <ArrowRight size={18} />
            </button>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
              You can skip any question.
            </span>
          </div>
        )}

        {/* LEVEL 1: Care Card */}
        {flowStage === 'level1' && (() => {
          const steps = [
            {
              title: "Make My Day",
              question: `If I wanted to make your day, I'd probably...`,
              render: () => renderSingleSelect(appreciationStyle, setAppreciationStyle, [
                "Love a thoughtful message",
                "Enjoy a phone call",
                "Appreciate food or dessert",
                "Value a heartfelt dua",
                "Prefer peaceful alone time"
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
              question: "What's usually the best way to reach you?",
              render: () => renderSingleSelect(communicationPreference, setCommunicationPreference, [
                "WhatsApp message",
                "Voice note",
                "Phone call",
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
            if (level1Step < steps.length - 1) {
              setLevel1Step(level1Step + 1);
            } else {
              handleLevel1Submit();
            }
          };

          const handleBack = () => {
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
                onClick={() => setFlowStage('completion2')}
                className="btn btn-ghost"
                style={{ padding: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                Finish & Exit
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
              question: "Things that give me energy:",
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
              question: "My dreams for the future:",
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
            }
          ];

          const currentStep = steps[level2Step];

          const handleNext = () => {
            if (level2Step < steps.length - 1) {
              setLevel2Step(level2Step + 1);
            } else {
              handleLevel2Submit();
            }
          };

          const handleBack = () => {
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
            
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '32px' }}>
              You can close this browser window now.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
