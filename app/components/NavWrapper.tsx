'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Network, MessageSquare, CheckSquare, ShieldAlert, LogOut, Share2, MoreHorizontal, X, Calendar, Sun, Moon, FileText } from 'lucide-react';

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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    
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
    const isDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';

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

  const handleDismissPrompt = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
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

  const isMoreActive = ['/connections', '/templates', '/approvals', '/admin', '/documents'].includes(pathname);

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

        <Link href="/documents" className={`nav-item desktop-only ${pathname === '/documents' ? 'active' : ''}`}>
          <FileText />
          <span>Documents</span>
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
            <div className="mobile-drawer-links" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link 
                href="/documents" 
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
