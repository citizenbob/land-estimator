import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SuggestionsList from './SuggestionsList';
import { MOCK_SUGGESTIONS } from '@lib/testData';
import { setupConsoleMocks } from '@lib/testUtils';

// Create refs for all suggestions
const mockRefs: React.RefObject<HTMLLIElement>[] = MOCK_SUGGESTIONS.map(() =>
  React.createRef<HTMLLIElement>()
) as React.RefObject<HTMLLIElement>[];

describe('SuggestionsList Component', () => {
  beforeEach(() => {
    setupConsoleMocks();
  });

  it('renders suggestions correctly', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={MOCK_SUGGESTIONS}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    expect(
      screen.getByText(MOCK_SUGGESTIONS[0].display_name)
    ).toBeInTheDocument();
    expect(
      screen.getByText(MOCK_SUGGESTIONS[1].display_name)
    ).toBeInTheDocument();
    const listItems = screen.getAllByRole('option');
    expect(listItems).toHaveLength(MOCK_SUGGESTIONS.length);
  });

  it('assigns refs to list items correctly', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={MOCK_SUGGESTIONS}
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
        suggestions={MOCK_SUGGESTIONS}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    fireEvent.click(screen.getByText(MOCK_SUGGESTIONS[0].display_name));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(MOCK_SUGGESTIONS[0]);
  });

  it('calls onSuggestionKeyDown on key down', () => {
    const mockOnSelect = vi.fn();
    const mockOnKeyDown = vi.fn();

    render(
      <SuggestionsList
        suggestions={MOCK_SUGGESTIONS}
        onSelect={mockOnSelect}
        suggestionRefs={mockRefs}
        onSuggestionKeyDown={mockOnKeyDown}
      />
    );

    const firstItem = screen.getByText(MOCK_SUGGESTIONS[0].display_name);
    fireEvent.keyDown(firstItem, { key: 'Enter', code: 'Enter' });

    expect(mockOnKeyDown).toHaveBeenCalledTimes(1);
    expect(mockOnKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' }),
      MOCK_SUGGESTIONS[0],
      0
    );
  });
});
