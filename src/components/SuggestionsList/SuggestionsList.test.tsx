import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SuggestionsList from './SuggestionsList';
import { GeocodeResult } from '@typez/addressMatchTypes';

const mockSuggestions: GeocodeResult[] = [
  { displayName: 'Suggestion 1', value: 'suggestion-1', lat: '0', lon: '0' },
  { displayName: 'Suggestion 2', value: 'suggestion-2', lat: '1', lon: '1' }
];

const mockRefs: React.RefObject<HTMLLIElement>[] = mockSuggestions.map(
  () => React.createRef<HTMLLIElement>() as React.RefObject<HTMLLIElement>
);

describe('SuggestionsList Component', () => {
  it('renders suggestions correctly', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
    const listItems = screen.getAllByRole('option');
    expect(listItems).toHaveLength(mockSuggestions.length);
  });

  it('assigns refs to list items correctly', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    mockRefs.forEach((ref, index) => {
      expect(ref.current).toBe(screen.getAllByRole('option')[index]);
    });
  });

  it('handles click events', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    fireEvent.click(screen.getByText('Suggestion 1'));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('calls onSuggestionKeyDown on key down', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={mockSuggestions}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    const firstItem = screen.getByText('Suggestion 1');
    fireEvent.keyDown(firstItem, { key: 'Enter', code: 'Enter' });

    expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
    expect(mockOnKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' }),
      mockSuggestions[0],
      0
    );
  });
});
