import React from 'react';
import { getSharedAnnouncements } from '../../actions';
import SharedAnnouncementsClient from './SharedAnnouncementsClient';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function SharedAnnouncementsPage({ params }: PageProps) {
  const { tenantId } = await params;
  const data = await getSharedAnnouncements(tenantId);

  if (!data) {
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
          <img src="/logo.png" alt="Yaadi Logo" style={{ width: '130px', height: 'auto', objectFit: 'contain', marginBottom: '16px' }} />
          <h2 className="serif-font" style={{ fontSize: '24px', color: 'var(--color-rose)', marginBottom: '8px' }}>
            Link Disabled
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
            This announcement link is invalid, has expired, or has been disabled by the workspace administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SharedAnnouncementsClient 
      tenantId={tenantId}
      initialData={data} 
    />
  );
}
