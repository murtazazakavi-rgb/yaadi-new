'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Network, MessageSquare, CheckSquare, ShieldAlert, LogOut, Share2 } from 'lucide-react';

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

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header" style={{ padding: '6px 20px', height: '60px' }}>
        <div className="brand-wrapper" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <img 
            src="/logo.png" 
            alt="Yaadi Logo" 
            style={{ 
              height: '48px', 
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
        
        <Link href="/contacts" className={`nav-item ${pathname === '/contacts' ? 'active' : ''}`}>
          <Users />
          <span>Contacts</span>
        </Link>
        
        <Link href="/tree" className={`nav-item ${pathname === '/tree' ? 'active' : ''}`}>
          <Network />
          <span>Family Tree</span>
        </Link>
        
        <Link href="/connections" className={`nav-item ${pathname === '/connections' ? 'active' : ''}`}>
          <Share2 />
          <span>Connections</span>
        </Link>
        
        <Link href="/templates" className={`nav-item ${pathname === '/templates' ? 'active' : ''}`}>
          <MessageSquare />
          <span>Templates</span>
        </Link>

        <Link href="/approvals" className={`nav-item ${pathname === '/approvals' ? 'active' : ''}`}>
          <CheckSquare />
          <span>Approvals</span>
        </Link>

        {user?.isAdmin && (
          <>
            <Link href="/admin" className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}>
              <ShieldAlert />
              <span>Admin</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
