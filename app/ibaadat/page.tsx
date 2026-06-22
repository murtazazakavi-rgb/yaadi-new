'use client';

import React, { useState, useEffect } from 'react';
import { getIbaadatRecords, updateIbaadatRecord } from './actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { ChevronLeft, ChevronRight, Calendar, Compass, Check, X, Clock, BookOpen, Bookmark, Sparkles, Award } from 'lucide-react';

interface DayLog {
  fajar?: string;
  zohar_asr?: string;
  maghrib_isha?: string;
  bihori?: string;
  dua_kaamil?: string;
  tilawat_quran?: string;
  hifz_quran?: string;
  tasbih?: string;
}

export default function IbaadatPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<{ [dateStr: string]: DayLog }>({});
  const [stats, setStats] = useState({ prayedCount: 0, qazaCount: 0, devotionsCompleted: 0 });

  // Format date as local YYYY-MM-DD
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const startDayOfWeek = getFirstDayOfMonth(year, month);

  // Calculate start/end date for fetching
  const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await getIbaadatRecords(startDateStr, endDateStr);
      if (res.success && res.records) {
        const formatted: { [dateStr: string]: DayLog } = {};
        res.records.forEach((row: any) => {
          // row.date is returned as YYYY-MM-DD
          // Ensure we strip any timezone offset from postgres DATE output
          const dStr = row.date.split('T')[0];
          formatted[dStr] = row.logs || {};
        });
        setRecords(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [year, month]);

  // Calculate monthly stats
  useEffect(() => {
    let prayed = 0;
    let qaza = 0;
    let devotions = 0;

    Object.values(records).forEach((log) => {
      // Prayers counts
      ['fajar', 'zohar_asr', 'maghrib_isha', 'bihori'].forEach((key) => {
        const val = log[key as keyof DayLog];
        if (val === 'prayed') prayed++;
        else if (val === 'qaza') qaza++;
      });
      // Devotions counts
      ['dua_kaamil', 'tilawat_quran', 'hifz_quran', 'tasbih'].forEach((key) => {
        if (log[key as keyof DayLog] === 'completed') devotions++;
      });
    });

    setStats({ prayedCount: prayed, qazaCount: qaza, devotionsCompleted: devotions });
  }, [records]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Habit toggle handler
  const handleToggle = async (key: keyof DayLog, status: string | null) => {
    if (!selectedDate) return;
    const dateStr = getLocalDateString(selectedDate);
    const currentLog = records[dateStr] || {};
    
    // Determine new status (toggle off if clicked again)
    const newStatus = currentLog[key] === status ? null : status;

    // Optimistic state update
    const updatedLog = { ...currentLog };
    if (newStatus === null) {
      delete updatedLog[key];
    } else {
      updatedLog[key] = newStatus;
    }

    setRecords((prev) => ({
      ...prev,
      [dateStr]: updatedLog,
    }));

    // Perform db mutation in background
    try {
      const res = await updateIbaadatRecord(dateStr, key, newStatus);
      if (!res.success) {
        // Revert on error
        setRecords((prev) => ({
          ...prev,
          [dateStr]: currentLog,
        }));
      }
    } catch (err) {
      console.error(err);
      // Revert on error
      setRecords((prev) => ({
        ...prev,
        [dateStr]: currentLog,
      }));
    }
  };

  // Render indicators for day cells
  const renderDayIndicators = (dateStr: string) => {
    const log = records[dateStr];
    if (!log) return null;

    const indicators: React.ReactNode[] = [];

    // 1. Fajar dot
    if (log.fajar) {
      const color = log.fajar === 'prayed' ? 'var(--color-sage)' : log.fajar === 'qaza' ? 'var(--color-gold)' : 'var(--color-rose)';
      indicators.push(<span key="fajar" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />);
    }
    // 2. Zohar/Asr dot
    if (log.zohar_asr) {
      const color = log.zohar_asr === 'prayed' ? 'var(--color-sage)' : log.zohar_asr === 'qaza' ? 'var(--color-gold)' : 'var(--color-rose)';
      indicators.push(<span key="zohar_asr" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />);
    }
    // 3. Maghrib/Isha dot
    if (log.maghrib_isha) {
      const color = log.maghrib_isha === 'prayed' ? 'var(--color-sage)' : log.maghrib_isha === 'qaza' ? 'var(--color-gold)' : 'var(--color-rose)';
      indicators.push(<span key="maghrib_isha" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />);
    }
    // 4. Devotions dot
    const hasDevotion = log.dua_kaamil === 'completed' || log.tilawat_quran === 'completed' || log.hifz_quran === 'completed' || log.tasbih === 'completed';
    const hasDevotionMissed = log.dua_kaamil === 'missed' || log.tilawat_quran === 'missed' || log.hifz_quran === 'missed' || log.tasbih === 'missed';
    if (hasDevotion) {
      indicators.push(<span key="devotion" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-blue)' }} />);
    } else if (hasDevotionMissed) {
      indicators.push(<span key="devotion-missed" style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-rose)' }} />);
    }

    if (indicators.length === 0) return null;

    return (
      <div style={{ display: 'flex', gap: '3px', marginTop: '4px', justifyContent: 'center' }}>
        {indicators}
      </div>
    );
  };

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected date formatting
  const selectedDateStr = selectedDate ? getLocalDateString(selectedDate) : '';
  const selectedLog = selectedDate ? records[selectedDateStr] || {} : {};
  const selectedHijri = selectedDate ? HijriDate.fromGregorian(selectedDate) : null;

  // Generate days grid
  const daysGrid = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    daysGrid.push(<div key={`empty-${i}`} style={{ height: '54px' }} />);
  }
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const thisDate = new Date(year, month, dayNum);
    const thisDateStr = getLocalDateString(thisDate);
    const isSelected = selectedDate && selectedDateStr === thisDateStr;
    const isToday = new Date().toDateString() === thisDate.toDateString();

    daysGrid.push(
      <button
        key={`day-${dayNum}`}
        onClick={() => setSelectedDate(thisDate)}
        style={{
          height: '54px',
          background: isSelected ? 'var(--color-gold)' : isToday ? 'var(--color-sage-light)' : 'transparent',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: isSelected ? '#FFFFFF' : isToday ? 'var(--color-sage)' : 'var(--text-primary)',
          fontWeight: isSelected || isToday ? '600' : '400',
          transition: 'var(--transition-smooth)',
          outline: 'none',
          padding: '4px 0'
        }}
        className="btn-press"
      >
        <span style={{ fontSize: '14px', lineHeight: '1' }}>{dayNum}</span>
        {renderDayIndicators(thisDateStr)}
      </button>
    );
  }

  // Helper for rendering prayer state buttons
  const renderPrayerButtons = (key: keyof DayLog, label: string) => {
    const currentVal = selectedLog[key];

    const states = [
      { value: 'prayed', label: 'Prayed', color: 'var(--color-sage)', activeBg: 'var(--color-sage-light)', activeTextColor: 'var(--color-sage)', icon: <Check size={14} /> },
      { value: 'not_prayed', label: 'Not Prayed', color: 'var(--color-rose)', activeBg: 'var(--color-rose-light)', activeTextColor: 'var(--color-rose)', icon: <X size={14} /> },
      { value: 'qaza', label: 'Qaza', color: 'var(--color-gold)', activeBg: 'var(--color-gold-light)', activeTextColor: 'var(--color-gold)', icon: <Clock size={14} /> }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderBottom: 'var(--border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {currentVal ? currentVal.replace('_', ' ') : 'unmarked'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
          {states.map((state) => {
            const isActive = currentVal === state.value;
            return (
              <button
                key={state.value}
                onClick={() => handleToggle(key, state.value)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: isActive ? `1px solid ${state.color}` : '1px solid var(--border-light)',
                  background: isActive ? state.activeBg : 'transparent',
                  color: isActive ? state.activeTextColor : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                className="btn-press"
              >
                {state.icon}
                <span>{state.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper for rendering devotions check buttons
  const renderDevotionRow = (key: keyof DayLog, label: string) => {
    const currentVal = selectedLog[key];

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: 'var(--border-light)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {currentVal === 'completed' ? 'Completed' : currentVal === 'missed' ? 'Missed' : 'Unmarked'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {/* Completed Button */}
          <button
            onClick={() => handleToggle(key, 'completed')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              border: currentVal === 'completed' ? '1px solid var(--color-sage)' : '1px solid var(--border-light)',
              background: currentVal === 'completed' ? 'var(--color-sage-light)' : 'transparent',
              color: currentVal === 'completed' ? 'var(--color-sage)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition-smooth)'
            }}
            className="btn-press"
          >
            <Check size={14} />
            <span>Done</span>
          </button>

          {/* Missed Button */}
          <button
            onClick={() => handleToggle(key, 'missed')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              border: currentVal === 'missed' ? '1px solid var(--color-rose)' : '1px solid var(--border-light)',
              background: currentVal === 'missed' ? 'var(--color-rose-light)' : 'transparent',
              color: currentVal === 'missed' ? 'var(--color-rose)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'var(--transition-smooth)'
            }}
            className="btn-press"
          >
            <X size={14} />
            <span>Missed</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Title Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass style={{ color: 'var(--color-gold)' }} /> Ibaadat Tracker
        </h2>
        <p className="page-subtitle">
          Track daily prayers, Tilawat, Hifz, and specific family devotions.
        </p>
      </div>

      {/* Stats Summary Grid */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 16px', marginBottom: '16px' }}>
        <div className="card" style={{ flex: 1, padding: '12px', margin: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Prayed</span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-sage)' }}>{stats.prayedCount}</span>
        </div>
        <div className="card" style={{ flex: 1, padding: '12px', margin: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Qaza</span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-gold)' }}>{stats.qazaCount}</span>
        </div>
        <div className="card" style={{ flex: 1, padding: '12px', margin: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.5px' }}>Devotions</span>
          <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-blue)' }}>{stats.devotionsCompleted}</span>
        </div>
      </div>

      {/* Monthly Calendar Card */}
      <div className="card" style={{ padding: '16px', margin: '0 16px 20px 16px' }}>
        {/* Month Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={prevMonth}
            className="btn btn-secondary btn-press"
            style={{ width: 'auto', padding: '6px', height: '32px', borderRadius: '8px' }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <h3 className="serif-font calendar-month-title">
            {monthsList[month]} {year}
          </h3>

          <button
            onClick={nextMonth}
            className="btn btn-secondary btn-press"
            style={{ width: 'auto', padding: '6px', height: '32px', borderRadius: '8px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Days of week header */}
        <div className="calendar-week-header" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          textAlign: 'center', 
          marginBottom: '8px' 
        }}>
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>

        {/* Days grid */}
        {loading ? (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Updating calendar logs...
          </div>
        ) : (
          <div 
            key={`${year}-${month}`}
            className="calendar-fade"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: '4px'
            }}
          >
            {daysGrid}
          </div>
        )}
      </div>

      {/* Day details section */}
      {selectedDate && (
        <div style={{ padding: '0 16px' }}>
          <div className="card" style={{ margin: 0, padding: '20px' }}>
            {/* selected day dates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--color-gold-light)', paddingBottom: '12px', marginBottom: '8px' }}>
              <h3 className="serif-font" style={{ fontSize: '18px', fontWeight: '600' }}>
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              {selectedHijri && (
                <span className="selected-day-hijri" style={{ fontSize: '13px', color: 'var(--color-gold)', fontWeight: '600' }}>
                  {selectedHijri.day} {HIJRI_MONTH_NAMES[selectedHijri.month]} {selectedHijri.year}
                </span>
              )}
            </div>

            {/* Prayers Group */}
            <div style={{ marginTop: '16px' }}>
              <h4 className="serif-font" style={{ fontSize: '15px', color: 'var(--color-gold)', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.3px' }}>
                Prayers (Namaaz)
              </h4>
              {renderPrayerButtons('fajar', 'Fajar')}
              {renderPrayerButtons('zohar_asr', 'Zohar / Asr')}
              {renderPrayerButtons('maghrib_isha', 'Maghrib / Isha')}
              {renderPrayerButtons('bihori', 'Bihori (Tahajjud)')}
            </div>

            {/* Devotions Group */}
            <div style={{ marginTop: '24px' }}>
              <h4 className="serif-font" style={{ fontSize: '15px', color: 'var(--color-gold)', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.3px' }}>
                Daily Devotions
              </h4>
              {renderDevotionRow('dua_kaamil', 'al Dua al Kaamil')}
              {renderDevotionRow('tilawat_quran', 'Tilawat al Quran')}
              {renderDevotionRow('hifz_quran', 'Hifz al Quran')}
              {renderDevotionRow('tasbih', 'Tasbih / Wazifa')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
