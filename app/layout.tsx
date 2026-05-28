import './globals.css';
import React from 'react';
import { getSession } from '@/lib/session';
import NavWrapper from '@/app/components/NavWrapper';

export const metadata = {
  title: 'Yaadi - Premium Family Reminders',
  description: 'Track birthdays, waras, anniversaries, wafaat, and family connections in a classy British pastel dashboard.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body>
        <NavWrapper user={session}>
          {children}
        </NavWrapper>
      </body>
    </html>
  );
}
