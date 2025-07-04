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
import { setupConsoleMocks, createAddressLookupMock } from '@lib/testUtils';
import { MOCK_LOCAL_ADDRESSES } from '@lib/testData';

vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

global.fetch = vi.fn();
const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

const createMockApiRecord = (address: (typeof MOCK_LOCAL_ADDRESSES)[0]) => ({
  id: address.id,
  display_name: address.full_address,
  region: address.region,
  normalized: address.full_address.toLowerCase()
});

const setup = () => {
  render(<AddressInput />);
  const input = screen.getByPlaceholderText('Enter address');
  return { input };
};

describe('AddressInput', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    setupConsoleMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ensures suggestions have unique keys', async () => {
    const suggestions = MOCK_LOCAL_ADDRESSES.slice(0, 2).map((addr) => ({
      place_id: addr.id,
      display_name: addr.full_address
    }));

    const mockLookup = createAddressLookupMock({
      query: '1',
      suggestions,
      hasFetched: true
    });

    render(<AddressInput mockLookup={mockLookup} />);

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute(
      'data-display',
      MOCK_LOCAL_ADDRESSES[0].full_address
    );
    expect(options[1]).toHaveAttribute(
      'data-display',
      MOCK_LOCAL_ADDRESSES[1].full_address
    );
  });

  it('fetches address suggestions as user types', async () => {
    const mockApiRecord = createMockApiRecord(MOCK_LOCAL_ADDRESSES[0]);

    const mockLookup = createAddressLookupMock({
      query: '1600',
      suggestions: [
        {
          place_id: mockApiRecord.id,
          display_name: mockApiRecord.display_name
        }
      ],
      hasFetched: true
    });

    render(<AddressInput mockLookup={mockLookup} />);

    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveAttribute(
      'data-display',
      mockApiRecord.display_name
    );
  });

  it('handles API failures gracefully and displays an error message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Internal Server Error'));

    const { input } = setup();
    fireEvent.change(input, { target: { value: '1600' } });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith('/api/lookup?query=1600');
      },
      { timeout: 2000 }
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/error fetching suggestions/i);
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('clears suggestions when input is empty', async () => {
    const mockLookup = createAddressLookupMock({
      query: '',
      suggestions: [],
      hasFetched: false
    });

    render(<AddressInput mockLookup={mockLookup} />);

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('supports keyboard navigation for suggestions with cyclic focus and returns focus to input on tab', async () => {
    const suggestions = MOCK_LOCAL_ADDRESSES.slice(0, 2).map((addr) => ({
      place_id: addr.id,
      display_name: addr.full_address
    }));

    const handleSelect = vi.fn();
    const mockLookup = createAddressLookupMock({
      query: '1600',
      suggestions,
      handleSelect,
      hasFetched: true
    });

    render(<AddressInput mockLookup={mockLookup} />);

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const items = screen.getAllByRole('option');

    expect(items[0]).toHaveTextContent(MOCK_LOCAL_ADDRESSES[0].full_address);
    expect(items[1]).toHaveTextContent(MOCK_LOCAL_ADDRESSES[1].full_address);

    fireEvent.keyDown(items[0], { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(handleSelect).toHaveBeenCalledWith(suggestions[0].display_name);
    });
  });

  it('updates input value when suggestion is selected via keyboard and logs event', async () => {
    const logEvent = vi.fn();
    const suggestions = MOCK_LOCAL_ADDRESSES.slice(0, 2).map((addr) => ({
      place_id: addr.id,
      display_name: addr.full_address
    }));

    const mockLookup = createAddressLookupMock({
      query: '1600',
      suggestions,
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
        suggestions[0].display_name
      );
      expect(logEvent).toHaveBeenCalledWith('address_selected', {
        query: '1600',
        address_id: suggestions[0].place_id,
        position_in_results: 0
      });
    });
  });

  it('does not trigger an API call when a suggestion is selected', async () => {
    const mockApiRecord = createMockApiRecord(MOCK_LOCAL_ADDRESSES[1]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: '2323 E Highland',
        results: [mockApiRecord],
        count: 1
      })
    });

    const { input } = setup();

    fireEvent.change(input, { target: { value: '2323 E Highland' } });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/lookup?query=2323%20E%20Highland'
        );
      },
      { timeout: 2000 }
    );

    await waitFor(() => {
      expect(screen.getByRole('option')).toBeInTheDocument();
    });

    mockFetch.mockClear();

    const suggestionElement = screen.getByRole('option');
    fireEvent.click(suggestionElement);

    await waitFor(() => {
      expect(input).toHaveValue(mockApiRecord.display_name);
    });

    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('clears previous suggestions while fetching new ones', async () => {
    const mockLookup = createAddressLookupMock({
      query: 'test',
      suggestions: [],
      isFetching: true,
      hasFetched: false
    });

    render(<AddressInput mockLookup={mockLookup} />);

    expect(screen.queryByRole('listbox')).toBeNull();
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
      place_id: MOCK_LOCAL_ADDRESSES[0].id,
      display_name: MOCK_LOCAL_ADDRESSES[0].full_address
    };

    render(
      <AddressInput
        mockLookup={createAddressLookupMock({
          query: MOCK_LOCAL_ADDRESSES[0].full_address,
          suggestions: [suggestion],
          locked: true
        })}
        logEvent={logEvent}
      />
    );

    const button = screen.getByRole('button', {
      name: /get instant estimate/i
    });
    await act(async () => {
      await userEvent.click(button);
    });

    await waitFor(() => {
      expect(logEvent).toHaveBeenCalledWith('estimate_button_clicked', {
        address_id: MOCK_LOCAL_ADDRESSES[0].id
      });
    });
  });

  describe('Parcel metadata API integration', () => {
    const mockParcelData = {
      id: 'test-parcel-123',
      full_address: '123 Test St, St. Louis, MO 63101',
      latitude: 38.627,
      longitude: -90.1994,
      region: 'St. Louis City',
      calc: {
        landarea: 5000,
        building_sqft: 1200,
        estimated_landscapable_area: 3800,
        property_type: 'residential'
      },
      owner: {
        name: 'Test Owner'
      },
      affluence_score: 0.75,
      source_file: 'test',
      processed_date: '2024-01-01T00:00:00.000Z'
    };

    it('fetches parcel data from API route and calls onAddressSelect', async () => {
      const onAddressSelect = vi.fn();
      const suggestion = {
        place_id: 'test-parcel-123',
        display_name: '123 Test St, St. Louis, MO 63101'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParcelData
      } as Response);

      const mockLookup = createAddressLookupMock({
        query: '123 Test St',
        suggestions: [suggestion],
        locked: true
      });

      render(
        <AddressInput
          mockLookup={mockLookup}
          onAddressSelect={onAddressSelect}
        />
      );

      const button = screen.getByRole('button', {
        name: /get instant estimate/i
      });

      await act(async () => {
        await userEvent.click(button);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/parcel-metadata/test-parcel-123'
        );
        expect(onAddressSelect).toHaveBeenCalledWith({
          place_id: 'test-parcel-123',
          display_name: '123 Test St, St. Louis, MO 63101',
          latitude: 38.627,
          longitude: -90.1994,
          region: 'St. Louis City',
          calc: {
            landarea: 5000,
            building_sqft: 1200,
            estimated_landscapable_area: 3800,
            property_type: 'residential'
          },
          affluence_score: 0.75
        });
      });
    });

    it('falls back to getSuggestionData when API fails', async () => {
      const onAddressSelect = vi.fn();
      const suggestion = {
        place_id: 'test-parcel-123',
        display_name: '123 Test St, St. Louis, MO 63101'
      };

      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const mockLookup = createAddressLookupMock({
        query: '123 Test St',
        suggestions: [suggestion],
        locked: true,
        getSuggestionData: vi.fn().mockResolvedValue(mockParcelData)
      });

      render(
        <AddressInput
          mockLookup={mockLookup}
          onAddressSelect={onAddressSelect}
        />
      );

      const button = screen.getByRole('button', {
        name: /get instant estimate/i
      });

      await act(async () => {
        await userEvent.click(button);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/parcel-metadata/test-parcel-123'
        );
        expect(mockLookup.getSuggestionData).toHaveBeenCalledWith(
          'test-parcel-123'
        );
        expect(onAddressSelect).toHaveBeenCalledWith({
          place_id: 'test-parcel-123',
          display_name: '123 Test St, St. Louis, MO 63101',
          latitude: 38.627,
          longitude: -90.1994,
          region: 'St. Louis City',
          calc: {
            landarea: 5000,
            building_sqft: 1200,
            estimated_landscapable_area: 3800,
            property_type: 'residential'
          },
          affluence_score: 0.75
        });
      });
    });
  });
});
