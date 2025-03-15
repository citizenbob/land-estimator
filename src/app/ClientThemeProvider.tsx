'use client';

import React from 'react';
import { ThemeProvider } from 'styled-components';
import defaultTheme from './default_theme';

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export default function ClientThemeProvider({
  children,
}: ClientThemeProviderProps) {
  return <ThemeProvider theme={defaultTheme}>{children}</ThemeProvider>;
}
