import './globals.css';
import React from 'react';
import { getSession } from '@/lib/session';
import NavWrapper from '@/app/components/NavWrapper';

export const metadata = {
  title: 'Yaadi - Premium Family Reminders',
  description: 'A secure family workspace to track birthdays, waras, wedding anniversaries, wafaat, and manage important family documents.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const initialTheme = session?.theme || null;
  const initialUiStyle = session?.uiStyle || null;

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var sessionTheme = ${initialTheme ? JSON.stringify(initialTheme) : 'null'};
              var sessionUiStyle = ${initialUiStyle ? JSON.stringify(initialUiStyle) : 'null'};
              
              var theme = localStorage.getItem('theme') || sessionTheme;
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
              }
              
              var uiStyle = localStorage.getItem('yaadi-ui-style') || sessionUiStyle || 'classic';
              document.documentElement.setAttribute('data-ui-style', uiStyle);

              if (sessionTheme && !localStorage.getItem('theme')) {
                localStorage.setItem('theme', sessionTheme);
              }
              if (sessionUiStyle && !localStorage.getItem('yaadi-ui-style')) {
                localStorage.setItem('yaadi-ui-style', sessionUiStyle);
              }
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body>
        <NavWrapper user={session}>
          {children}
        </NavWrapper>
      </body>
    </html>
  );
}
