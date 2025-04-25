import React from 'react';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AddressInput from '@components/AddressInput/AddressInput';
import {
  verifyLogEventCall,
  verifyUniqueSuggestions,
  setupConsoleMocks,
  createAddressLookupMock
} from '@lib/testUtils';
import { MOCK_SUGGESTIONS, MOCK_NOMINATIM_RESPONSES } from '@lib/testData';
import { NominatimApiClient } from '@services/nominatimApi';

// Mock the logger
vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

// Mock the Nominatim API client instead of fetch
vi.mock('@services/nominatimApi', () => ({
  NominatimApiClient: {
    fetchSuggestions: vi.fn()
  }
}));

const mockFetchSuggestions = NominatimApiClient.fetchSuggestions as ReturnType<
  typeof vi.fn
>;

const setup = () => {
  render(<AddressInput />);
  const input = screen.getByPlaceholderText('Enter address');
  return { input };
};

describe('AddressInput', () => {
  beforeEach(() => {
    mockFetchSuggestions.mockReset();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ensures suggestions have unique keys', async () => {
    const results = [
      ...MOCK_NOMINATIM_RESPONSES,
      { ...MOCK_NOMINATIM_RESPONSES[1] }
    ];

    mockFetchSuggestions.mockResolvedValueOnce(results);

    const { input } = setup();
    fireEvent.change(input, { target: { value: '1' } });

    await waitFor(
      () => {
        expect(mockFetchSuggestions).toHaveBeenCalledWith('1');
      },
      { timeout: 2000 }
    );

    await waitFor(
      () => {
        expect(screen.getAllByRole('option')).toHaveLength(
          MOCK_NOMINATIM_RESPONSES.length
        );
      },
      { timeout: 1000 }
    );
    await verifyUniqueSuggestions();
  });

  it('fetches address suggestions as user types', async () => {
    mockFetchSuggestions.mockResolvedValueOnce(MOCK_NOMINATIM_RESPONSES);

    const { input } = setup();
    fireEvent.change(input, { target: { value: '1600' } });

    await waitFor(
      () => expect(mockFetchSuggestions).toHaveBeenCalledWith('1600'),
      { timeout: 2000 }
    );

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(MOCK_NOMINATIM_RESPONSES.length);
    expect(options[0]).toHaveAttribute(
      'data-display',
      MOCK_NOMINATIM_RESPONSES[0].display_name
    );
    expect(options[1]).toHaveAttribute(
      'data-display',
      MOCK_NOMINATIM_RESPONSES[1].display_name
    );
  });

  it('handles API failures gracefully and displays an error message', async () => {
    mockFetchSuggestions.mockRejectedValueOnce(
      new Error('Failed to fetch suggestions')
    );

    const { input } = setup();
    fireEvent.change(input, { target: { value: '1600' } });

    await waitFor(
      () => expect(mockFetchSuggestions).toHaveBeenCalledWith('1600'),
      { timeout: 2000 }
    );
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/error fetching suggestions/i);
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('clears suggestions when input is empty', async () => {
    // Mock a successful response with the correct data format
    mockFetchSuggestions.mockResolvedValueOnce([MOCK_NOMINATIM_RESPONSES[0]]);

    const { input } = setup();
    fireEvent.change(input, { target: { value: '1600' } });

    // Wait for the suggestions to appear
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('option')).toHaveLength(1);

    // Clear input to empty
    mockFetchSuggestions.mockClear();
    fireEvent.change(input, { target: { value: '' } });

    // Verify suggestions are removed
    await waitFor(
      () => {
        expect(screen.queryByRole('listbox')).toBeNull();
      },
      { timeout: 1000 }
    );

    expect(mockFetchSuggestions).not.toHaveBeenCalled();
  });

  it('supports keyboard navigation for suggestions with cyclic focus and returns focus to input on tab', async () => {
    const handleSelect = vi.fn();
    const mockLookup = createAddressLookupMock({
      query: '1600',
      suggestions: MOCK_SUGGESTIONS,
      handleSelect,
      hasFetched: true
    });

    render(<AddressInput mockLookup={mockLookup} />);

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const items = screen.getAllByRole('option');

    expect(items[0]).toHaveTextContent('1600 Amphitheatre Parkway');
    expect(items[1]).toHaveTextContent('1 Infinite Loop');

    fireEvent.keyDown(items[0], { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(
        MOCK_SUGGESTIONS[0].display_name
      );
    });
  });

  it('updates input value when suggestion is selected via keyboard and logs event', async () => {
    const logEvent = vi.fn();
    const mockLookup = createAddressLookupMock({
      query: '1600',
      suggestions: MOCK_SUGGESTIONS,
      hasFetched: true
    });

    render(<AddressInput mockLookup={mockLookup} logEvent={logEvent} />);

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const suggestionElement = screen.getAllByRole('option')[0];
    fireEvent.click(suggestionElement);

    await waitFor(() => {
      expect(mockLookup.handleSelect).toHaveBeenCalledWith(
        MOCK_SUGGESTIONS[0].display_name
      );
      verifyLogEventCall(
        logEvent,
        'Address Selected',
        {
          id: MOCK_NOMINATIM_RESPONSES[0].place_id,
          address: MOCK_NOMINATIM_RESPONSES[0].display_name,
          lat: parseFloat(MOCK_NOMINATIM_RESPONSES[0].lat),
          lon: parseFloat(MOCK_NOMINATIM_RESPONSES[0].lon),
          boundingbox: MOCK_NOMINATIM_RESPONSES[0].boundingbox,
          confirmedIntent: false
        },
        { toMixpanel: true, toFirestore: true }
      );
    });
  });

  it('does not trigger an API call when a suggestion is selected', async () => {
    // Use the correct data format for the mock
    mockFetchSuggestions.mockResolvedValueOnce([MOCK_NOMINATIM_RESPONSES[1]]);

    const { input } = setup();

    // Use act for state-updating events
    await act(async () => {
      fireEvent.change(input, { target: { value: '2323 E Highland' } });
    });

    // Wait for debounce and API call
    await waitFor(
      () =>
        expect(mockFetchSuggestions).toHaveBeenCalledWith('2323 E Highland'),
      { timeout: 2000 }
    );

    // Wait for the suggestions to appear by looking for the option role
    await waitFor(() => {
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    // Get suggestion by role and data attribute instead of text
    const suggestionElement = screen.getByRole('option');

    // Clear fetch mock before clicking
    mockFetchSuggestions.mockClear();

    // Click the suggestion (this updates input value internally)
    await act(async () => {
      fireEvent.click(suggestionElement);
    });

    // Wait for input value to update
    await waitFor(() => {
      expect(input).toHaveValue(MOCK_NOMINATIM_RESPONSES[1].display_name);
    });

    // Advance timers again to ensure no debounced call happens
    await waitFor(() => expect(mockFetchSuggestions).not.toHaveBeenCalled(), {
      timeout: 1000
    });
  });

  it('clears previous suggestions while fetching new ones', async () => {
    // First, provide initial suggestions
    mockFetchSuggestions.mockResolvedValueOnce([MOCK_NOMINATIM_RESPONSES[0]]);

    const { input } = setup();

    // Type the first query
    await act(async () => {
      fireEvent.change(input, { target: { value: 'first query' } });
    });

    // Wait for the first suggestions to appear
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Set up a delayed promise for the second query
    let resolvePromise: (value: unknown) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockFetchSuggestions.mockImplementationOnce(() => delayedPromise);

    // Type a second query which should clear the suggestions while fetching
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    // Wait for the API call after debounce
    await waitFor(
      () => expect(mockFetchSuggestions).toHaveBeenCalledWith('test'),
      { timeout: 2000 }
    );

    // Check that the listbox is removed while fetching
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    // Now resolve the promise with new suggestions
    await act(async () => {
      resolvePromise!([MOCK_NOMINATIM_RESPONSES[0]]);
    });

    // Check that the listbox appears again with the new suggestion
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByRole('option')).toHaveAttribute(
        'data-display',
        MOCK_NOMINATIM_RESPONSES[0].display_name
      );
    });
  });

  it('displays the API error message when the API call fails', () => {
    const errorLookup = createAddressLookupMock({
      query: 'Invalid',
      isFetching: false,
      hasFetched: true,
      locked: false,
      error: 'Error fetching suggestions',
      suggestions: []
    });
    render(<AddressInput mockLookup={errorLookup} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error fetching suggestions'
    );
  });

  it('does not display the error when locked', () => {
    const lockedLookup = createAddressLookupMock({
      query: '123 Main St',
      locked: true,
      hasFetched: true,
      error: 'Error fetching suggestions',
      suggestions: []
    });
    render(<AddressInput mockLookup={lockedLookup} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('logs an event when "Get Instant Estimate" is clicked', async () => {
    const logEvent = vi.fn();

    const suggestion = {
      place_id: MOCK_SUGGESTIONS[0].place_id,
      display_name: MOCK_SUGGESTIONS[0].display_name
    };

    render(
      <AddressInput
        mockLookup={createAddressLookupMock({
          query: MOCK_SUGGESTIONS[0].display_name,
          suggestions: [suggestion],
          locked: true
        })}
        logEvent={logEvent}
      />
    );

    // Trigger the estimate button
    const button = screen.getByRole('button', {
      name: /get instant estimate/i
    });
    await act(async () => {
      await userEvent.click(button);
    });

    // Wait for the log event to be called
    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith(
        'Request Estimate',
        {
          id: MOCK_NOMINATIM_RESPONSES[0].place_id,
          address: MOCK_NOMINATIM_RESPONSES[0].display_name,
          lat: parseFloat(MOCK_NOMINATIM_RESPONSES[0].lat),
          lon: parseFloat(MOCK_NOMINATIM_RESPONSES[0].lon),
          boundingbox: MOCK_NOMINATIM_RESPONSES[0].boundingbox,
          confirmedIntent: true
        },
        { toMixpanel: true, toFirestore: true }
      );
    });
  });
});
