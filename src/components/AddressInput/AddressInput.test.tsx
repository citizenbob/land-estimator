// src/components/AddressInput/AddressInput.test.tsx
import React from 'react';
import userEvent from '@testing-library/user-event';
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent
} from '@testing-library/react';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockedFunction
} from 'vitest';
import AddressInput from './AddressInput';
import { getNominatimSuggestions } from '@services/nominatimGeoCode';
import { GeocodeResult } from '../../types/nomatimTypes';
import { logEvent } from '@services/logger';

// Create typed mock references
const mockGetNominatimSuggestions = getNominatimSuggestions as MockedFunction<
  typeof getNominatimSuggestions
>;
const mockLogEvent = logEvent as MockedFunction<typeof logEvent>;

// Mocks
vi.mock('@services/nominatimGeoCode', () => ({
  getNominatimSuggestions: vi.fn().mockResolvedValue([])
}));
vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

// Helper functions
type Suggestion = {
  displayName: string;
  label?: string;
  latitude?: string;
  longitude?: string;
};

const baseLookup = {
  query: '',
  suggestions: [] as Suggestion[],
  handleChange: (value: string) => console.log('handleChange:', value),
  isFetching: false,
  error: null as string | null
};

const setup = () => {
  render(<AddressInput />);
  const input = screen.getByPlaceholderText('Enter address');
  return { input };
};

const changeInputValue = async (input: HTMLElement, value: string) => {
  await act(async () => {
    fireEvent.change(input, { target: { value } });
  });
};

const typeAndSelectSuggestion = async (
  input: HTMLElement,
  textToType: string,
  suggestionDisplay: string
) => {
  await act(async () => {
    await userEvent.type(input, textToType);
  });
  const suggestion = await waitFor(() =>
    screen.getByText(
      (_, element) =>
        element?.getAttribute('data-display') === suggestionDisplay
    )
  );
  await act(async () => {
    await userEvent.click(suggestion);
  });
  return suggestion;
};

const assertNoExtraApiCalls = async (delay = 600) => {
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  expect(mockGetNominatimSuggestions.mock.calls.length).toBe(0);
};

const verifyUniqueSuggestions = async () => {
  const items = await waitFor(() => screen.getAllByRole('listitem'));
  const displays = items
    .map((item) => item.getAttribute('data-display'))
    .filter(Boolean);
  const uniqueDisplays = [...new Set(displays)];
  expect(displays.length).toBe(uniqueDisplays.length);
  expect(uniqueDisplays.length).toBeGreaterThan(0);
};

const getListItems = async () => screen.getAllByRole('listitem');

describe('AddressInput Component (Nominatim API)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('ensures suggestions have unique keys', async () => {
    mockGetNominatimSuggestions.mockImplementation(async () => {
      const results: GeocodeResult[] = [
        {
          label: '1600 Amphitheatre Parkway',
          value: '1',
          latitude: '37.422',
          longitude: '-122.084',
          displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
        },
        {
          label: '1 Infinite Loop',
          value: '2',
          latitude: '37.331',
          longitude: '-122.030',
          displayName: '1 Infinite Loop, Cupertino, CA'
        },
        {
          label: 'Empire State Building',
          value: '3',
          latitude: '40.748817',
          longitude: '-73.985428',
          displayName: 'Empire State Building, New York, NY'
        },
        {
          label: 'Duplicate Loop',
          value: '4',
          latitude: '37.331',
          longitude: '-122.030',
          displayName: '1 Infinite Loop, Cupertino, CA'
        }
      ];
      return results.filter(
        (v, i, a) => a.findIndex((t) => t.displayName === v.displayName) === i
      );
    });

    const { input } = setup();
    await act(async () => {
      fireEvent.change(input, { target: { value: '1' } });
    });
    await waitFor(() =>
      expect(mockGetNominatimSuggestions).toHaveBeenCalledTimes(1)
    );
    await waitFor(() =>
      expect(mockGetNominatimSuggestions).toHaveBeenCalledWith(
        expect.any(String)
      )
    );
    await verifyUniqueSuggestions();
  });

  it('fetches address suggestions as user types', async () => {
    mockGetNominatimSuggestions.mockResolvedValue([
      {
        label: '1600 Amphitheatre Parkway',
        value: '1',
        latitude: '37.422',
        longitude: '-122.084',
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
      },
      {
        label: '1 Infinite Loop',
        value: '2',
        latitude: '37.331',
        longitude: '-122.030',
        displayName: '1 Infinite Loop, Cupertino, CA'
      },
      {
        label: '1 Infinite Loop',
        value: '2',
        latitude: '37.331',
        longitude: '-122.030',
        displayName: '1 Infinite Loop, Cupertino, CA'
      }
    ]);
    const { input } = setup();
    await changeInputValue(input, '1600');
    await waitFor(() => {
      expect(mockGetNominatimSuggestions).toHaveBeenCalledWith('1600');
      expect(screen.getByText('1600 Amphitheatre Parkway')).not.toBeNull();
    });
  });

  it('handles API failures gracefully and displays an error message', async () => {
    mockGetNominatimSuggestions.mockRejectedValue(new Error('API Failure'));
    const { input } = setup();
    await changeInputValue(input, '1600');
    await waitFor(() =>
      expect(mockGetNominatimSuggestions).toHaveBeenCalledTimes(1)
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /error fetching suggestions/i
    );
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('clears suggestions when input is empty', async () => {
    mockGetNominatimSuggestions.mockResolvedValue([
      {
        label: '1600 Amphitheatre Parkway',
        value: '1',
        latitude: '37.422',
        longitude: '-122.084',
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
      }
    ]);
    const { input } = setup();
    await changeInputValue(input, '1600');
    await waitFor(() =>
      expect(mockGetNominatimSuggestions).toHaveBeenCalledWith('1600')
    );
    await changeInputValue(input, '');
    await waitFor(() =>
      expect(screen.queryByText('1600 Amphitheatre Parkway')).toBeNull()
    );
  });

  it('displays a loading indicator with proper ARIA attributes while fetching suggestions', async () => {
    mockGetNominatimSuggestions.mockImplementation(
      async () =>
        new Promise<GeocodeResult[]>((resolve) => {
          setTimeout(() => {
            resolve([
              {
                label: '1600 Amphitheatre Parkway',
                value: '1',
                latitude: '37.422',
                longitude: '-122.084',
                displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
              }
            ]);
          }, 500);
        })
    );
    const { input } = setup();
    await changeInputValue(input, '1600');
    const loadingIndicator = await waitFor(() => screen.getByRole('status'));
    expect(loadingIndicator).toHaveTextContent(/fetching suggestions/i);
    await waitFor(() =>
      expect(screen.getByText('1600 Amphitheatre Parkway')).toBeInTheDocument()
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('supports keyboard navigation for suggestions with cyclic focus and returns focus to input on tab', async () => {
    mockGetNominatimSuggestions.mockResolvedValue([
      {
        label: '1600 Amphitheatre Parkway',
        value: '1',
        latitude: '37.422',
        longitude: '-122.084',
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
      },
      {
        label: '1 Infinite Loop',
        value: '2',
        latitude: '37.331',
        longitude: '-122.030',
        displayName: '1 Infinite Loop, Cupertino, CA'
      }
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
    });
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('updates input value when suggestion is selected via keyboard and logs event', async () => {
    mockGetNominatimSuggestions.mockResolvedValue([
      {
        label: '1600 Amphitheatre Parkway',
        value: '1',
        latitude: '37.422',
        longitude: '-122.084',
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
      },
      {
        label: '1 Infinite Loop',
        value: '2',
        latitude: '37.331',
        longitude: '-122.030',
        displayName: '1 Infinite Loop, Cupertino, CA'
      }
    ]);
    const { input } = setup();
    await changeInputValue(input, '1600');
    await waitFor(() =>
      expect(screen.getByText('1600 Amphitheatre Parkway')).toBeInTheDocument()
    );
    input.focus();
    act(() => {
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    });
    const items = await getListItems();
    await waitFor(() => expect(items[0]).toHaveFocus());
    act(() => {
      fireEvent.keyDown(items[0], { key: 'Enter', code: 'Enter' });
    });
    await waitFor(() =>
      expect(input).toHaveValue('1600 Amphitheatre Parkway, Mountain View, CA')
    );
    expect(screen.queryByRole('list')).toBeNull();
    expect(
      screen.getByRole('button', { name: /change address/i })
    ).toBeInTheDocument();
    expect(logEvent).toHaveBeenCalledWith({
      eventName: 'Address Matched',
      data: {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
        confirmedIntent: false
      }
    });
  });

  it('clears previous suggestions while fetching new ones', async () => {
    let resolvePromise: (value: GeocodeResult[]) => void;
    const delayedPromise = new Promise<GeocodeResult[]>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetNominatimSuggestions.mockImplementation(async () => delayedPromise);
    const { input } = setup();
    await changeInputValue(input, 'test');
    expect(screen.queryByRole('list')).toBeNull();
    act(() => {
      resolvePromise([
        {
          label: 'Test Place',
          value: '1',
          latitude: '0',
          longitude: '0',
          displayName: 'Test Place'
        }
      ]);
    });
    await waitFor(() =>
      expect(screen.getByText('Test Place')).toBeInTheDocument()
    );
  });

  it('does not trigger an API call when a suggestion is selected', async () => {
    mockGetNominatimSuggestions.mockResolvedValueOnce([
      {
        label: '2323 E Highland Ave',
        value: '1',
        latitude: '37.123',
        longitude: '-122.123',
        displayName:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
      }
    ]);
    const { input } = setup();
    await typeAndSelectSuggestion(
      input,
      '2323 E Highland Ave',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );
    expect(input).toHaveValue(
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );
    mockGetNominatimSuggestions.mockClear();
    await changeInputValue(
      input,
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    await assertNoExtraApiCalls();
  });

  it('displays the API error message when the API call fails', () => {
    const errorLookup = {
      ...baseLookup,
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
      ...baseLookup,
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
    mockGetNominatimSuggestions.mockResolvedValueOnce([
      {
        label: '1600 Amphitheatre Parkway',
        value: '1',
        latitude: '37.422',
        longitude: '-122.084',
        displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
      }
    ]);
    const { input } = setup();
    await act(async () => {
      await userEvent.type(input, '1600');
    });
    const suggestion = await waitFor(() =>
      screen.getByText(
        (_, element) =>
          element?.getAttribute('data-display') ===
          '1600 Amphitheatre Parkway, Mountain View, CA'
      )
    );
    await act(async () => {
      await userEvent.click(suggestion);
    });
    mockLogEvent.mockClear();
    const estimateButton = await waitFor(() =>
      screen.getByRole('button', { name: /get instant estimate/i })
    );
    await act(async () => {
      await userEvent.click(estimateButton);
    });
    expect(mockLogEvent).toHaveBeenCalledWith({
      eventName: 'Request Estimate',
      data: {
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
        confirmedIntent: true
      }
    });
  });
});
