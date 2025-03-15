// File: src/app/page.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from 'styled-components';
import defaultTheme from '../app/default_theme';

expect.extend(toHaveNoViolations);

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={defaultTheme}>{ui}</ThemeProvider>);

describe('Landing Page', () => {
  it('displays the Address Input component', () => {
    renderWithTheme(<Home />);
    expect(screen.getByPlaceholderText(/Enter address/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithTheme(<Home />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
