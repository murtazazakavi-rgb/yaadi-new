'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Network, MessageSquare, CheckSquare, ShieldAlert, LogOut, Share2, MoreHorizontal, X, Calendar, Sun, Moon, FileText, Settings, Compass } from 'lucide-react';
import { saveUIPreferences } from '@/app/settings/actions';

interface NavWrapperProps {
  children: React.ReactNode;
  user: {
    email: string;
    display_name: string;
    isAdmin: boolean;
    theme?: string;
    uiStyle?: string;
  } | null;
}

export default function NavWrapper({ children, user }: NavWrapperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [uiStyle, setUiStyle] = useState('classic');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);

  useEffect(() => {
    try {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
      let savedStyle = 'classic';
      try {
        savedStyle = localStorage.getItem('yaadi-ui-style') || 'classic';
      } catch (e) {}
      setUiStyle(savedStyle);
    } catch (e) {}
    
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('Service Worker registered with scope:', reg.scope),
        (err) => console.error('Service Worker registration failed:', err)
      );
    }

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    let isDismissed = false;
    try {
      isDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
    } catch (e) {}

    if (!isDismissed && !isStandalone) {
      if (ios) {
        setShowInstallPrompt(true);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          setPendingApprovals(data.pendingApprovalsCount || 0);
          setPendingConnections(data.pendingConnectionsCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      }
    };
    
    fetchAlerts();
  }, [pathname, user]);

  const handleDismissPrompt = () => {
    try {
      localStorage.setItem('pwa-prompt-dismissed', 'true');
    } catch (e) {}
    setShowInstallPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      try {
        localStorage.setItem('theme', 'light');
      } catch (e) {}
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (e) {}
      setIsDarkMode(true);
    }
    if (user) {
      saveUIPreferences(newTheme, uiStyle).catch(err => {
        console.error('Failed to sync theme to DB:', err);
      });
    }
  };

  const selectUIStyle = (styleName: string) => {
    setUiStyle(styleName);
    document.documentElement.setAttribute('data-ui-style', styleName);
    try {
      localStorage.setItem('yaadi-ui-style', styleName);
    } catch (e) {}
    if (user) {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      saveUIPreferences(currentTheme, styleName).catch(err => {
        console.error('Failed to sync UI style to DB:', err);
      });
    }
  };

  // If path is root, register or public forms, don't wrap with navigation bars
  const noNavPaths = ['/', '/register', '/share'];
  const isNoNav = noNavPaths.includes(pathname) || pathname.startsWith('/share/') || pathname.startsWith('/profile/');

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (isNoNav) {
    return <>{children}</>;
  }

  const isMoreActive = ['/connections', '/templates', '/approvals', '/admin', '/documents', '/settings', '/ibaadat'].includes(pathname);

  return (
    <div className="app-container">
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
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
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
      <main className="page-transition" style={{ flex: 1, paddingBottom: '16px' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/dashboard" prefetch={false} className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
          <Home />
          <span>Dashboard</span>
        </Link>

        <Link href="/calendar" prefetch={false} className={`nav-item ${pathname === '/calendar' ? 'active' : ''}`}>
          <Calendar />
          <span>Calendar</span>
        </Link>
        
        <Link href="/ibaadat" prefetch={false} className={`nav-item desktop-only ${pathname === '/ibaadat' ? 'active' : ''}`}>
          <Compass />
          <span>Ibaadat</span>
        </Link>
        
        <Link href="/contacts" prefetch={false} className={`nav-item ${pathname === '/contacts' ? 'active' : ''}`}>
          <Users />
          <span>Contacts</span>
        </Link>
        
        <Link href="/tree" prefetch={false} className={`nav-item ${pathname === '/tree' ? 'active' : ''}`}>
          <Network />
          <span>Family Tree</span>
        </Link>

        <Link href="/documents" prefetch={false} className={`nav-item desktop-only ${pathname === '/documents' ? 'active' : ''}`}>
          <FileText />
          <span>Documents</span>
        </Link>
        
        <Link href="/connections" prefetch={false} className={`nav-item desktop-only ${pathname === '/connections' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Share2 />
            <span>Connections</span>
          </div>
          {pendingConnections > 0 && (
            <span style={{
              backgroundColor: 'var(--color-rose)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '10px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              {pendingConnections}
            </span>
          )}
        </Link>
        
        <Link href="/templates" prefetch={false} className={`nav-item desktop-only ${pathname === '/templates' ? 'active' : ''}`}>
          <MessageSquare />
          <span>Templates</span>
        </Link>

        <Link href="/approvals" prefetch={false} className={`nav-item desktop-only ${pathname === '/approvals' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckSquare />
            <span>Approvals</span>
          </div>
          {pendingApprovals > 0 && (
            <span style={{
              backgroundColor: 'var(--color-rose)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 'bold',
              borderRadius: '10px',
              padding: '2px 6px',
              minWidth: '18px',
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              {pendingApprovals}
            </span>
          )}
        </Link>

        <Link href="/settings" prefetch={false} className={`nav-item desktop-only ${pathname === '/settings' ? 'active' : ''}`}>
          <Settings />
          <span>Settings</span>
        </Link>

        {user?.isAdmin && (
          <Link href="/admin" prefetch={false} className={`nav-item desktop-only ${pathname === '/admin' ? 'active' : ''}`}>
            <ShieldAlert />
            <span>Admin</span>
          </Link>
        )}

        <button 
          onClick={() => setShowMoreMenu(true)} 
          className={`nav-item mobile-only ${isMoreActive ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
        >
          <MoreHorizontal />
          <span>More</span>
          {(pendingApprovals > 0 || pendingConnections > 0) && (
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '24px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rose)'
            }} />
          )}
        </button>

        {/* UI Style Toggle for Desktop Sidebar */}
        <div className="desktop-only" style={{ width: '100%', borderTop: 'var(--border-light)', padding: '12px 24px 0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: '600' }}>UI Style</span>
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '3px', borderRadius: '10px', gap: '2px', width: '100%' }}>
              <button 
                type="button"
                onClick={() => selectUIStyle('classic')} 
                style={{ flex: 1, border: 'none', background: uiStyle === 'classic' ? 'var(--bg-card)' : 'none', color: uiStyle === 'classic' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '6px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              >
                Classic
              </button>
              <button 
                type="button"
                onClick={() => selectUIStyle('cyber')} 
                style={{ flex: 1, border: 'none', background: uiStyle === 'cyber' ? 'var(--bg-card)' : 'none', color: uiStyle === 'cyber' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '6px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              >
                Cyber
              </button>
              <button 
                type="button"
                onClick={() => selectUIStyle('pastel')} 
                style={{ flex: 1, border: 'none', background: uiStyle === 'pastel' ? 'var(--bg-card)' : 'none', color: uiStyle === 'pastel' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '6px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              >
                Pastel
              </button>
            </div>
          </div>
        </div>

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
            <div className="mobile-drawer-links" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link 
                href="/ibaadat" 
                prefetch={false}
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/ibaadat' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/ibaadat' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Compass size={18} style={{ color: pathname === '/ibaadat' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Ibaadat Tracker</span>
              </Link>

              <Link 
                href="/documents" 
                prefetch={false}
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/documents' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/documents' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <FileText size={18} style={{ color: pathname === '/documents' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Documents</span>
              </Link>

              <Link 
                href="/connections" 
                prefetch={false}
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Share2 size={18} style={{ color: pathname === '/connections' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                  <span>Connections</span>
                </div>
                {pendingConnections > 0 && (
                  <span style={{
                    backgroundColor: 'var(--color-rose)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {pendingConnections}
                  </span>
                )}
              </Link>
              
              <Link 
                href="/templates" 
                prefetch={false}
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
                prefetch={false}
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckSquare size={18} style={{ color: pathname === '/approvals' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                  <span>Approvals</span>
                </div>
                {pendingApprovals > 0 && (
                  <span style={{
                    backgroundColor: 'var(--color-rose)',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {pendingApprovals}
                  </span>
                )}
              </Link>

              <Link 
                href="/settings" 
                prefetch={false}
                onClick={() => setShowMoreMenu(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: pathname === '/settings' ? 'var(--color-gold-light)' : 'rgba(0,0,0,0.02)',
                  color: pathname === '/settings' ? 'var(--color-gold)' : 'var(--text-primary)',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Settings size={18} style={{ color: pathname === '/settings' ? 'var(--color-gold)' : 'var(--text-muted)' }} />
                <span>Settings</span>
              </Link>

              {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  prefetch={false}
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

              {/* PWA Install Button */}
              <div 
                onClick={() => {
                  setShowInstallPrompt(true);
                  setShowMoreMenu(false);
                }} 
                className="btn-press"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  backgroundColor: 'var(--color-gold-light)',
                  color: 'var(--color-gold)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginTop: '8px'
                }}
              >
                <img 
                  src="/logo.png" 
                  alt="Yaadi Logo" 
                  style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain' }} 
                />
                <span>Install Yaadi App</span>
              </div>

              {/* UI Style Toggle for Mobile Drawer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px', width: '100%' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: '600', paddingLeft: '4px' }}>UI Style</span>
                <div style={{ display: 'flex', backgroundColor: 'var(--bg-input)', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                  <button 
                    onClick={() => selectUIStyle('classic')} 
                    style={{ flex: 1, border: 'none', background: uiStyle === 'classic' ? 'var(--bg-card)' : 'none', color: uiStyle === 'classic' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  >
                    Classic
                  </button>
                  <button 
                    onClick={() => selectUIStyle('cyber')} 
                    style={{ flex: 1, border: 'none', background: uiStyle === 'cyber' ? 'var(--bg-card)' : 'none', color: uiStyle === 'cyber' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  >
                    Cyber
                  </button>
                  <button 
                    onClick={() => selectUIStyle('pastel')} 
                    style={{ flex: 1, border: 'none', background: uiStyle === 'pastel' ? 'var(--bg-card)' : 'none', color: uiStyle === 'pastel' ? 'var(--color-gold)' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  >
                    Pastel
                  </button>
                </div>
              </div>

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

      {/* PWA Installer Banner */}
      {showInstallPrompt && (
        <div className="pwa-banner-overlay">
          <div className="pwa-banner-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <img 
                  src="/logo.png" 
                  alt="Yaadi App Icon" 
                  style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-light)' }} 
                />
                <div>
                  <h4 className="serif-font" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Install Yaadi</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Add Yaadi to your home screen for quick, premium access.</p>
                </div>
              </div>
              <button 
                onClick={handleDismissPrompt} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            {isIOS ? (
              <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', borderTop: '1px solid var(--border-light)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '10px', flexShrink: 0 }}>1</span>
                  <span style={{ lineHeight: '1.4' }}>
                    Tap the Share button 
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px', color: '#007AFF' }}>
                      <rect x="5" y="9" width="14" height="11" rx="2" ry="2" />
                      <path d="M12 3v13M9 6l3-3 3 3" />
                    </svg>
                    in Safari's toolbar.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '10px', flexShrink: 0 }}>2</span>
                  <span style={{ lineHeight: '1.4' }}>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
              </div>
            ) : deferredPrompt ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button 
                  onClick={handleDismissPrompt} 
                  className="btn btn-ghost btn-press" 
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', color: 'var(--text-muted)' }}
                >
                  Maybe Later
                </button>
                <button 
                  onClick={handleInstallClick} 
                  className="btn btn-press" 
                  style={{ 
                    backgroundColor: 'var(--color-gold)', 
                    color: '#FFFFFF', 
                    padding: '6px 14px', 
                    fontSize: '11px', 
                    borderRadius: '8px', 
                    border: 'none', 
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(196, 149, 58, 0.2)' 
                  }}
                >
                  Install Now
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', borderTop: '1px solid var(--border-light)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '10px', flexShrink: 0 }}>1</span>
                  <span style={{ lineHeight: '1.4' }}>Tap the browser's menu button (usually three vertical dots <MoreHorizontal size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />).</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--color-gold-light)', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '10px', flexShrink: 0 }}>2</span>
                  <span style={{ lineHeight: '1.4' }}>Select <strong>Add to Home Screen</strong> or <strong>Install App</strong>.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
