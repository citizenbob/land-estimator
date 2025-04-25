import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';

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
    statusText
  });
};

export const mockNetworkError = (
  mockFetch: ReturnType<typeof vi.fn>,
  errorMessage = 'Network error'
) => {
  const error = new Error(errorMessage);
  mockFetch.mockRejectedValueOnce(error);
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
