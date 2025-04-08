// src/app/layout.tsx
import React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { getThemeClass } from '@tokens/theme';
import Analytics from '@components/PageAnalytics/PageAnalytics';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Land Estimator',
  description:
    'Estimate landscaping costs with map-based precision and transparency.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/apple-touch-icon-180x180.png', sizes: '180x180' }
    ],
    shortcut: [{ url: '/favicon.ico' }]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const clientTheme = 'default';
  if (typeof window === 'undefined') {
    return (
      <html lang="en" className={getThemeClass(clientTheme)}>
        <head></head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Analytics />
          {children}
        </body>
      </html>
    );
  }
  return (
    <html lang="en" className={getThemeClass(clientTheme)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
