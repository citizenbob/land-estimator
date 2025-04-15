import React from 'react';
import { vi, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as matchers from '@testing-library/jest-dom/matchers';

import SuggestionsList from './SuggestionsList';
expect.extend(matchers);

describe('SuggestionsList Component', () => {
  const suggestions = [
    {
      displayName: '1600 Amphitheatre Parkway',
      label: 'Google HQ',
      latitude: '37.422',
      longitude: '-122.084',
      value: '1600 Amphitheatre Parkway'
    },
    {
      displayName: '1 Infinite Loop',
      label: 'Apple HQ',
      latitude: '37.331',
      longitude: '-122.031',
      value: '1 Infinite Loop'
    }
  ];

  it('renders suggestions correctly', () => {
    render(
      <SuggestionsList
        suggestions={suggestions}
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
        suggestions={suggestions}
        onSelect={handleSelect}
        onKeyDown={vi.fn()}
      />
    );

    const item = screen.getByText('Google HQ');
    await userEvent.click(item);
    expect(handleSelect).toHaveBeenCalledWith({
      displayName: '1600 Amphitheatre Parkway',
      label: 'Google HQ',
      latitude: '37.422',
      longitude: '-122.084',
      value: '1600 Amphitheatre Parkway'
    });
  });
});
