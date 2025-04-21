import React from 'react';
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as matchers from '@testing-library/jest-dom/matchers';

import SuggestionsList from './SuggestionsList';
import { mockSuggestions } from '@lib/testData';

expect.extend(matchers);

describe('SuggestionsList Component', () => {
  it('renders suggestions correctly', () => {
    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={vi.fn()}
        onKeyDown={vi.fn()}
      />
    );
    expect(screen.getByText('Google HQ')).toBeInTheDocument();
    expect(screen.getByText('Apple HQ')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleSelect = vi.fn();
    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={handleSelect}
        onKeyDown={vi.fn()}
      />
    );

    const item = screen.getByText('Google HQ');
    await userEvent.click(item);
    expect(handleSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });
});
