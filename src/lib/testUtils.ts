import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { MOCK_NOMINATIM_RESPONSES } from './testData';
import { AddressSuggestion } from '@typez/addressMatchTypes';
import { useAddressLookup } from '@hooks/useAddressLookup';

export const typeAndSelectSuggestion = async (
  input: HTMLElement,
  textToType: string,
  suggestionDisplay: string
) => {
  await userEvent.type(input, textToType);
  const suggestion = await waitFor(() =>
    screen.getByText(
      (_, element) =>
        element?.getAttribute('data-display') === suggestionDisplay
    )
  );
  fireEvent.click(suggestion);
  return suggestion;
};

export const changeInputValue = async (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

export const assertNoExtraApiCalls = async (
  mockFunction: ReturnType<typeof vi.fn>,
  delay = 600
) => {
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
  expect(mockFunction.mock.calls.length).toBe(0);
};

export const verifyLogEventCall = (
  logEvent: ReturnType<typeof vi.fn>,
  eventName: string,
  data: Record<string, unknown>,
  options: { toMixpanel?: boolean; toFirestore?: boolean }
) => {
  expect(logEvent).toHaveBeenCalledWith(
    eventName,
    expect.objectContaining(data),
    options
  );
};

export const mockSuccessResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  data: unknown
) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data
  });
};

export const mockErrorResponse = (
  mockFetch: ReturnType<typeof vi.fn>,
  status = 500,
  statusText = 'Internal Server Error'
) => {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: async () => ({ error: statusText })
  });
};

export const mockNetworkError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Network error'
) => {
  const error = new Error(errorMessage);
  mockFetch.mockRejectedValueOnce(error);
};

export const mockJsonParsingError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Invalid JSON'
) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => {
      throw new SyntaxError(errorMessage);
    }
  });
};

export const setupConsoleMocks = () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  return { errorSpy, warnSpy };
};

export const verifyUniqueSuggestions = async () => {
  const items = await waitFor(() => screen.getAllByRole('option'));
  const displays = items
    .map((item) => item.getAttribute('data-display'))
    .filter(Boolean);
  const uniqueDisplays = [...new Set(displays)];
  expect(displays.length).toBe(uniqueDisplays.length);
  expect(uniqueDisplays.length).toBeGreaterThan(0);
};

export const getListItems = async () => screen.getAllByRole('option');

/**
 * Creates a standardized mock for useAddressLookup
 *
 * @param overrides Properties to override in the default mock
 * @returns A mock object that can be used with AddressInput's mockLookup prop
 */
export function createAddressLookupMock(
  overrides: Partial<ReturnType<typeof useAddressLookup>> = {}
) {
  const handleChange = vi.fn();
  const handleSelect = vi.fn();

  const getSuggestionData = vi.fn((id: number) => {
    const suggestion = MOCK_NOMINATIM_RESPONSES.find((s) => s.place_id === id);
    return suggestion || MOCK_NOMINATIM_RESPONSES[0];
  });

  const defaultMock = {
    query: '',
    suggestions: [] as AddressSuggestion[],
    isFetching: false,
    locked: false,
    hasFetched: false,
    error: null,
    handleChange,
    handleSelect,
    getSuggestionData
  };

  return {
    ...defaultMock,
    ...overrides
  };
}

/**
 * Creates a standardized mock for NominatimApiClient
 *
 * @param overrides Custom behavior for the mock methods
 * @returns A mocked NominatimApiClient with configured behavior
 */
export function createNominatimApiClientMock(
  overrides: {
    fetchSuggestions?: ReturnType<typeof vi.fn>;
    fetchCoordinates?: ReturnType<typeof vi.fn>;
  } = {}
) {
  return {
    fetchSuggestions:
      overrides.fetchSuggestions || vi.fn().mockResolvedValue([]),
    fetchCoordinates:
      overrides.fetchCoordinates || vi.fn().mockResolvedValue({})
  };
}
