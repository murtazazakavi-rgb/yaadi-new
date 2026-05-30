'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/app/dashboard/actions';
import { HijriDate, HIJRI_MONTH_NAMES } from '@/lib/hijri';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function CalendarPage() {
  const [data, setData] = useState<any>({ contacts: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getDashboardData();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalDays = getDaysInMonth(year, month);
  const startDayOfWeek = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Check if a day has any events and return them
  const getEventsForDate = (date: Date) => {
    if (!data.events || data.events.length === 0) return [];
    
    const dMonth = date.getMonth() + 1; // 1-indexed
    const dDay = date.getDate();
    const hDate = HijriDate.fromGregorian(date);

    return data.events.map((event: any) => {
      const contact = data.contacts.find((c: any) => c.id === event.contact_id);
      if (!contact) return null;

      let isMatch = false;
      if (event.event_type === 'birthday_gregorian' || event.event_type === 'death_gregorian' || event.event_type === 'anniversary') {
        isMatch = event.g_month === dMonth && event.g_day === dDay;
      } else if (event.event_type === 'birthday_hijri' || event.event_type === 'death_hijri') {
        isMatch = event.h_month === hDate.month && event.h_day === hDate.day;
      }

      if (isMatch) {
        return { ...event, contact };
      }
      return null;
    }).filter(Boolean);
  };

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'birthday_gregorian': return 'badge-birthday';
      case 'birthday_hijri': return 'badge-waras';
      case 'anniversary': return 'badge-anniversary';
      default: return 'badge-death';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'birthday_gregorian': return 'var(--color-rose)';
      case 'birthday_hijri': return 'var(--color-blue)';
      case 'anniversary': return 'var(--color-anniversary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getEventLabel = (type: string): string => {
    switch (type) {
      case 'birthday_gregorian': return 'Birthday';
      case 'birthday_hijri': return 'Waras (Hijri Birthday)';
      case 'anniversary': return 'Wedding Anniversary';
      case 'death_gregorian': return 'Death Anniversary';
      case 'death_hijri': return 'Wafaat Anniversary';
      default: return 'Event';
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedHijriDate = selectedDate ? HijriDate.fromGregorian(selectedDate) : null;

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading calendar...
      </div>
    );
  }

  // Generate day items for grid
  const daysGrid = [];
  // Empty slots at the start
  for (let i = 0; i < startDayOfWeek; i++) {
    daysGrid.push(<div key={`empty-${i}`} style={{ height: '50px' }} />);
  }
  // Days of month
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const thisDate = new Date(year, month, dayNum);
    const dayEvents = getEventsForDate(thisDate);
    const isSelected = selectedDate && 
                      selectedDate.getFullYear() === year && 
                      selectedDate.getMonth() === month && 
                      selectedDate.getDate() === dayNum;
                      
    const isToday = new Date().toDateString() === thisDate.toDateString();

    daysGrid.push(
      <button
        key={`day-${dayNum}`}
        onClick={() => setSelectedDate(thisDate)}
        style={{
          height: '50px',
          background: isSelected ? 'var(--color-gold)' : isToday ? 'var(--color-sage-light)' : 'transparent',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          color: isSelected ? '#FFFFFF' : isToday ? 'var(--color-sage)' : 'var(--text-primary)',
          fontWeight: isSelected || isToday ? '600' : '400',
          transition: 'var(--transition-smooth)',
          outline: 'none'
        }}
        className="btn-press"
      >
        <span style={{ fontSize: '14px' }}>{dayNum}</span>
        {dayEvents.length > 0 && (
          <div style={{ display: 'flex', gap: '3px', position: 'absolute', bottom: '6px' }}>
            {dayEvents.slice(0, 3).map((e: any, idx: number) => (
              <span 
                key={idx} 
                style={{ 
                  height: '4px', 
                  width: '4px', 
                  borderRadius: '50%', 
                  backgroundColor: isSelected ? '#FFFFFF' : getEventColor(e.event_type) 
                }} 
              />
            ))}
          </div>
        )}
      </button>
    );
  }

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{ padding: '20px 0' }} className="page-transition">
      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px', borderBottom: 'var(--border-light)', marginBottom: '20px' }}>
        <h2 className="serif-font page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ color: 'var(--color-gold)' }} /> Family Calendar
        </h2>
        <p className="page-subtitle">
          Browse birthdates, wafaat days, and wedding anniversaries by month.
        </p>
      </div>

      {/* Calendar Grid Card */}
      <div className="card" style={{ padding: '16px', margin: '0 16px 20px 16px' }}>
        {/* Month Header Nav */}
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
      </div>

      {/* Selected Day Details Section */}
      {selectedDate && (
        <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: 'var(--border-light)', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 className="serif-font selected-day-title">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              {selectedHijriDate && (
                <span className="selected-day-hijri">
                  {selectedHijriDate.day} {HIJRI_MONTH_NAMES[selectedHijriDate.month]} {selectedHijriDate.year}
                </span>
              )}
            </div>
          {selectedDateEvents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: 'var(--border-card)' }}>
              No celebrations or wafaat events today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDateEvents.map((e: any) => {
                const getInitials = (c: any) => `${c.first_name[0] || ''}${c.last_name[0] || ''}`.toUpperCase();
                
                return (
                  <div 
                    key={e.id}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      margin: 0,
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-gradient" style={{ flexShrink: 0 }}>
                        {getInitials(e.contact)}
                      </div>
                      <div>
                        <h4 className="reminder-name">
                          {e.contact.first_name} {e.contact.last_name}
                        </h4>
                        <span className={`badge ${getEventBadgeClass(e.event_type)}`} style={{ marginTop: '2px' }}>
                          {getEventLabel(e.event_type)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
