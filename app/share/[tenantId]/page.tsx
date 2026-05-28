import React from 'react';
import { getTenantName } from '../actions';
import ShareFormClient from './ShareFormClient';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { tenantId } = await params;
  const tenantName = await getTenantName(tenantId);

  if (!tenantName) {
    return (
      <div style={{ 
        padding: '80px 20px', 
        textAlign: 'center', 
        backgroundColor: 'var(--bg-primary)', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '360px' }}>
          <img src="/logo.png" alt="Yaadi Logo" style={{ height: '60px', marginBottom: '16px' }} />
          <h2 className="serif-font" style={{ fontSize: '26px', color: 'var(--color-rose)', marginBottom: '8px' }}>
            Invitation Expired
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            This invitation link is invalid or has expired. Please contact the administrator to get a valid share link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShareFormClient tenantId={tenantId} tenantName={tenantName} />
  );
}
