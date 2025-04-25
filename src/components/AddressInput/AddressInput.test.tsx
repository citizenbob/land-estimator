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
  setupConsoleMocks
} from '@lib/testUtils';
import { mockSuggestions, mockNominatimResponses } from '@lib/testData';

vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

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
    const results = [
      ...mockNominatimResponses,
      { ...mockNominatimResponses[1] }
    ];

    mockSuccessResponse(mockFetch, results);

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
    mockSuccessResponse(mockFetch, mockNominatimResponses);

    const { input } = setup();
    await changeInputValue(input, '1600');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/nominatim?type=suggestions&query=1600')
      );
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(mockNominatimResponses.length);
      expect(options[0]).toHaveAttribute(
        'data-display',
        mockNominatimResponses[0].display_name
      );
      expect(options[1]).toHaveAttribute(
        'data-display',
        mockNominatimResponses[1].display_name
      );
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
    mockSuccessResponse(mockFetch, [mockSuggestions[0]]);

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
    const handleSelect = vi.fn();
    const mockLookup = {
      query: '1600',
      suggestions: [mockSuggestions[0], mockSuggestions[1]],
      handleSelect,
      hasFetched: true
    };

    render(
      <AddressInput
        mockLookup={{ ...mockLookup, suggestions: mockSuggestions }}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const items = screen.getAllByRole('option');

    expect(items[0]).toHaveTextContent('1600 Amphitheatre Parkway');
    expect(items[1]).toHaveTextContent('1 Infinite Loop');

    fireEvent.keyDown(items[0], { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(
        mockSuggestions[0].display_name
      );
    });
  });

  it('updates input value when suggestion is selected via keyboard and logs event', async () => {
    const logEvent = vi.fn();
    const mockLookup = {
      query: '1600',
      suggestions: mockSuggestions,
      handleSelect: vi.fn(),
      hasFetched: true,
      getSuggestionData: () => ({
        ...mockNominatimResponses[0],
        licence: mockNominatimResponses[0].license,
        place_rank: 0,
        importance: 0,
        addresstype: '',
        name: ''
      })
    };

    render(<AddressInput mockLookup={mockLookup} logEvent={logEvent} />);

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const suggestionElement = screen.getAllByRole('option')[0];
    fireEvent.click(suggestionElement);

    await waitFor(() => {
      expect(mockLookup.handleSelect).toHaveBeenCalledWith(
        mockSuggestions[0].display_name
      );
      verifyLogEventCall(
        logEvent,
        'Address Selected',
        {
          id: mockNominatimResponses[0].place_id,
          address: mockNominatimResponses[0].display_name,
          lat: parseFloat(mockNominatimResponses[0].lat),
          lon: parseFloat(mockNominatimResponses[0].lon),
          boundingbox: mockNominatimResponses[0].boundingbox,
          confirmedIntent: false
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

    expect(screen.queryByRole('listbox')).toBeNull();

    act(() => {
      resolvePromise!({
        ok: true,
        json: async () => [mockSuggestions[0]]
      } as Response);
    });

    await waitFor(() =>
      expect(
        screen.getByText((content) =>
          content.includes('1600 Amphitheatre Parkway')
        )
      ).toBeInTheDocument()
    );
  });

  it('does not trigger an API call when a suggestion is selected', async () => {
    mockSuccessResponse(mockFetch, [mockNominatimResponses[1]]);

    const { input } = setup();

    await changeInputValue(input, '2323 E Highland');

    await waitFor(() => {
      expect(
        screen.getByText(mockSuggestions[1].display_name)
      ).toBeInTheDocument();
    });

    const suggestion = screen.getByText(mockSuggestions[1].display_name);
    fireEvent.click(suggestion);

    expect(input).toHaveValue(mockSuggestions[1].display_name);

    mockFetch.mockClear();

    await changeInputValue(input, mockSuggestions[1].display_name);

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

    const suggestion = {
      place_id: mockSuggestions[0].place_id,
      display_name: mockSuggestions[0].display_name
    };

    render(
      <AddressInput
        mockLookup={{
          query: mockSuggestions[0].display_name,
          suggestions: [suggestion],
          locked: true,
          getSuggestionData: () => ({
            ...mockNominatimResponses[0],
            licence: mockNominatimResponses[0].license,
            place_rank: 0,
            importance: 0,
            addresstype: '',
            name: ''
          })
        }}
        logEvent={logEvent}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /get instant estimate/i })
    );

    expect(logEvent).toHaveBeenCalledWith(
      'Request Estimate',
      {
        id: mockNominatimResponses[0].place_id,
        address: mockNominatimResponses[0].display_name,
        lat: parseFloat(mockNominatimResponses[0].lat),
        lon: parseFloat(mockNominatimResponses[0].lon),
        boundingbox: mockNominatimResponses[0].boundingbox,
        confirmedIntent: true
      },
      { toMixpanel: true, toFirestore: true }
    );
  });
});
