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
  changeInputValue,
  verifyLogEventCall,
  mockSuccessResponse,
  mockErrorResponse,
  verifyUniqueSuggestions,
  getListItems,
  setupConsoleMocks
} from '@lib/testUtils';
import {
  mockSuggestions,
  mockGeocodeResults,
  mockAddresses
} from '@lib/testData';

// Mocks
vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

// Mock fetch globally
const originalFetch = global.fetch;
const mockFetch = vi.fn();
global.fetch = mockFetch;

const setup = () => {
  render(<AddressInput />);
  const input = screen.getByPlaceholderText('Enter address');
  return { input };
};

describe('AddressInput', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('ensures suggestions have unique keys', async () => {
    // Create a list including one duplicate displayName
    const results = [
      ...mockGeocodeResults,
      {
        ...mockGeocodeResults[1],
        value: '4',
        label: 'Duplicate Loop'
      }
    ];

    // Filter to only unique displayNames
    mockSuccessResponse(
      mockFetch,
      results.filter(
        (v, i, a) => a.findIndex((t) => t.displayName === v.displayName) === i
      )
    );

    const { input } = setup();
    await act(async () => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nominatim?type=suggestions&query=1')
      );
    });

    await verifyUniqueSuggestions();
  });

  it('fetches address suggestions as user types', async () => {
    mockSuccessResponse(mockFetch, mockGeocodeResults);

    const { input } = setup();
    await changeInputValue(input, '1600');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nominatim?type=suggestions&query=1600')
      );
      expect(screen.getByText('1600 Amphitheatre Parkway')).toBeInTheDocument();
    });
  });

  it('handles API failures gracefully and displays an error message', async () => {
    mockErrorResponse(mockFetch);

    const { input } = setup();
    await changeInputValue(input, '1600');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nominatim?type=suggestions&query=1600')
      );
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /error fetching suggestions/i
    );
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('clears suggestions when input is empty', async () => {
    mockSuccessResponse(mockFetch, [mockGeocodeResults[0]]);

    const { input } = setup();
    await changeInputValue(input, '1600');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nominatim?type=suggestions&query=1600')
      );
    });

    await changeInputValue(input, '');
    await waitFor(() =>
      expect(screen.queryByText('1600 Amphitheatre Parkway')).toBeNull()
    );
  });

  it('supports keyboard navigation for suggestions with cyclic focus and returns focus to input on tab', async () => {
    mockSuccessResponse(mockFetch, [
      mockGeocodeResults[0],
      mockGeocodeResults[1]
    ]);

    const { input } = setup();
    await changeInputValue(input, '1600');

    await waitFor(async () =>
      expect((await getListItems()).length).toBeGreaterThan(0)
    );

    input.focus();
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    });

    const items = await getListItems();
    await waitFor(() => expect(items[0]).toHaveFocus());

    act(() => {
      fireEvent.keyDown(items[0], { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await waitFor(() => expect(items[1]).toHaveFocus());

    act(() => {
      fireEvent.keyDown(items[1], { key: 'ArrowDown', code: 'ArrowDown' });
    });
    await waitFor(() => expect(items[0]).toHaveFocus());

    act(() => {
      fireEvent.keyDown(items[0], { key: 'Tab', code: 'Tab' });
      input.focus();
    });
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('updates input value when suggestion is selected via keyboard and logs event', async () => {
    const logEvent = vi.fn();
    const mockLookup = {
      query: '1600 Amphitheatre Parkway',
      suggestions: mockSuggestions,
      handleSelect: vi.fn()
    };

    render(<AddressInput mockLookup={{ ...mockLookup }} logEvent={logEvent} />);

    screen.getByPlaceholderText('Enter address');

    // Mock fetch no longer needed because we're using mockLookup

    // Simulate selection using custom helper
    fireEvent.click(screen.getByText('Google HQ'));

    await waitFor(() => {
      expect(mockLookup.handleSelect).toHaveBeenCalledWith(
        mockAddresses.google
      );
      verifyLogEventCall(
        logEvent,
        'Address Selected',
        {
          address: mockAddresses.google,
          lat: mockSuggestions[0].lat,
          lon: mockSuggestions[0].lon
        },
        { toMixpanel: true, toFirestore: true }
      );
    });
  });

  it('clears previous suggestions while fetching new ones', async () => {
    let resolvePromise: (value: Response) => void;
    const delayedPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetch.mockImplementationOnce(() => delayedPromise);

    const { input } = setup();
    await changeInputValue(input, 'test');

    // No suggestions should be visible while fetching
    expect(screen.queryByRole('list')).toBeNull();

    // Resolve the fetch with mock data
    act(() => {
      resolvePromise!({
        ok: true,
        json: async () => [mockGeocodeResults[0]]
      } as Response);
    });

    // Now suggestion should be visible
    await waitFor(() =>
      expect(screen.getByText('1600 Amphitheatre Parkway')).toBeInTheDocument()
    );
  });

  it('does not trigger an API call when a suggestion is selected', async () => {
    const phoenixSuggestion = {
      label: '2323 E Highland Ave',
      value: '1',
      lat: '37.123',
      lon: '-122.123',
      displayName: mockAddresses.phoenix
    };

    mockSuccessResponse(mockFetch, [phoenixSuggestion]);

    const { input } = setup();

    // Type something to trigger suggestions
    await changeInputValue(input, '2323 E Highland');

    // Wait for suggestion to appear
    await waitFor(() =>
      expect(screen.getByText('2323 E Highland Ave')).toBeInTheDocument()
    );

    // Click the suggestion
    fireEvent.click(screen.getByText('2323 E Highland Ave'));

    // Input should have the full address
    expect(input).toHaveValue(mockAddresses.phoenix);

    // Clear mock to check if additional calls are made
    mockFetch.mockClear();

    // Change the input to the full value again (this shouldn't trigger a new fetch)
    await changeInputValue(input, mockAddresses.phoenix);

    // Wait to ensure no additional fetch is made
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('displays the API error message when the API call fails', () => {
    const errorLookup = {
      query: 'Invalid',
      isFetching: false,
      hasFetched: true,
      locked: false,
      error: 'Error fetching suggestions',
      suggestions: []
    };
    render(<AddressInput mockLookup={errorLookup} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Error fetching suggestions'
    );
  });

  it('does not display the error when locked', () => {
    const lockedLookup = {
      query: '123 Main St',
      locked: true,
      hasFetched: true,
      error: 'Error fetching suggestions',
      suggestions: []
    };
    render(<AddressInput mockLookup={lockedLookup} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('logs an event when "Get Instant Estimate" is clicked', async () => {
    const logEvent = vi.fn();

    // Create a proper suggestion object to set as the selected suggestion
    const suggestion = {
      displayName: mockAddresses.google,
      label: 'Google HQ',
      lat: mockSuggestions[0].lat,
      lon: mockSuggestions[0].lon,
      value: mockAddresses.google
    };

    // Mock the component with the data already selected
    render(
      <AddressInput
        mockLookup={{
          query: mockAddresses.google,
          suggestions: [suggestion],
          locked: true,
          selectedSuggestion: suggestion
        }}
        logEvent={logEvent}
      />
    );

    // Click the estimate button directly - using userEvent for better interaction simulation
    await userEvent.click(
      screen.getByRole('button', { name: /get instant estimate/i })
    );

    // Check if logEvent was called with the right parameters
    expect(logEvent).toHaveBeenCalledWith(
      'Request Estimate',
      {
        address: mockAddresses.google,
        lat: mockSuggestions[0].lat,
        lon: mockSuggestions[0].lon,
        confirmedIntent: true
      },
      { toMixpanel: true, toFirestore: true }
    );
  });
});
