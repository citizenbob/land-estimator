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
  expect(logEvent).toHaveBeenCalledWith(eventName, data, options);
};
