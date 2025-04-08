import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';
import { axe } from 'vitest-axe';
import { describe, it, expect } from 'vitest';

const renderWithTheme = (ui: React.ReactElement) => render(<>{ui}</>);

describe('Landing Page', () => {
  it('displays the Address Input component', () => {
    renderWithTheme(<Home />);
    expect(screen.queryByPlaceholderText(/Enter address/i)).not.toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithTheme(<Home />);
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });
});
