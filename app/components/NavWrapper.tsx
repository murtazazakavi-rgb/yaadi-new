'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Network, MessageSquare, CheckSquare, ShieldAlert, LogOut, Share2, MoreHorizontal, X, Calendar, Sun, Moon } from 'lucide-react';

interface NavWrapperProps {
  children: React.ReactNode;
  user: {
    email: string;
    display_name: string;
    isAdmin: boolean;
  } | null;
}

export default function NavWrapper({ children, user }: NavWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('Service Worker registered with scope:', reg.scope),
        (err) => console.error('Service Worker registration failed:', err)
      );
    }
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // If path is root or register, don't wrap with navigation bars
  const noNavPaths = ['/', '/register', '/share'];
  const isNoNav = noNavPaths.includes(pathname) || pathname.startsWith('/share/');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (isNoNav) {
    return <>{children}</>;
  }

  const isMoreActive = ['/connections', '/templates', '/approvals', '/admin'].includes(pathname);

  return (
    <div className="app-container page-transition">
      {/* Top Header */}
      <header className="app-header" style={{ padding: '6px 20px', height: '60px' }}>
        <div className="brand-wrapper" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <img 
            src="/logo.png" 
            alt="Yaadi Logo" 
            style={{ 
              height: '36px', 
              width: 'auto',
              objectFit: 'contain'
            }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {user.display_name}
            </span>
          )}
          <button 
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '16px' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
          <Home />
          <span>Dashboard</span>
        </Link>

        <Link href="/calendar" className={`nav-item ${pathname === '/calendar' ? 'active' : ''}`}>
          <Calendar />
          <span>Calendar</span>
        </Link>
        
        <Link href="/contacts" className={`nav-item ${pathname === '/contacts' ? 'active' : ''}`}>
          <Users />
          <span>Contacts</span>
        </Link>
        
        <Link href="/tree" className={`nav-item ${pathname === '/tree' ? 'active' : ''}`}>
          <Network />
          <span>Family Tree</span>
        </Link>
        
        <Link href="/connections" className={`nav-item desktop-only ${pathname === '/connections' ? 'active' : ''}`}>
          <Share2 />
          <span>Connections</span>
        </Link>
        
        <Link href="/templates" className={`nav-item desktop-only ${pathname === '/templates' ? 'active' : ''}`}>
          <MessageSquare />
          <span>Templates</span>
        </Link>

        <Link href="/approvals" className={`nav-item desktop-only ${pathname === '/approvals' ? 'active' : ''}`}>
          <CheckSquare />
          <span>Approvals</span>
        </Link>

        {user?.isAdmin && (
          <Link href="/admin" className={`nav-item desktop-only ${pathname === '/admin' ? 'active' : ''}`}>
            <ShieldAlert />
            <span>Admin</span>
          </Link>
        )}

        <button 
          onClick={() => setShowMoreMenu(true)} 
          className={`nav-item mobile-only ${isMoreActive ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <MoreHorizontal />
          <span>More</span>
        </button>

        {/* Theme Toggle for Desktop Sidebar */}
        <div className="desktop-only" style={{ marginTop: 'auto', width: '100%', borderTop: 'var(--border-light)', paddingTop: '12px' }}>
          <button 
            type="button"
            onClick={toggleTheme} 
            className="btn btn-ghost btn-press" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              width: '100%', 
              padding: '12px 24px',
              borderRadius: 0,
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </div>
            <div className={`switch-track ${isDarkMode ? 'active' : ''}`} style={{ flexShrink: 0 }}>
              <div className="switch-thumb" />
            </div>
          </button>
        </div>
      </nav>

      {/* More Menu Drawer (Mobile Bottom Sheet) */}
      {showMoreMenu && (
        <div className="modal-overlay" onClick={() => setShowMoreMenu(false)} style={{ zIndex: 10000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h3 className="serif-font" style={{ fontSize: '20px', fontWeight: '600' }}>More Options</h3>
              <button onClick={() => setShowMoreMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link 
                href="/connections" 
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/connections' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/connections' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Share2 size={18} style={{ color: pathname === '/connections' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Connections</span>
              </Link>
              
              <Link 
                href="/templates" 
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/templates' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/templates' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <MessageSquare size={18} style={{ color: pathname === '/templates' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Templates</span>
              </Link>
              
              <Link 
                href="/approvals" 
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/approvals' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/approvals' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <CheckSquare size={18} style={{ color: pathname === '/approvals' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Approvals</span>
              </Link>

              {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  onClick={() => setShowMoreMenu(false)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '14px 18px', 
                    borderRadius: '12px', 
                    backgroundColor: pathname === '/admin' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                    color: pathname === '/admin' ? 'var(--color-gold)' : 'var(--text-primary)',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <ShieldAlert size={18} style={{ color: pathname === '/admin' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                  <span>Admin</span>
                </Link>
              )}

              {/* Theme Toggle for Mobile Drawer */}
              <div 
                onClick={toggleTheme} 
                className="btn-press"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginTop: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isDarkMode ? <Sun size={18} style={{ color: 'var(--text-muted)' }} /> : <Moon size={18} style={{ color: 'var(--text-muted)' }} />}
                  <span>Dark Mode</span>
                </div>
                <div className={`switch-track ${isDarkMode ? 'active' : ''}`}>
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
