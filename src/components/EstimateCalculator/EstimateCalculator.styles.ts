import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const CalculatorContainer = styled.div.attrs(() => ({
  className: 'estimate-calculator rounded-md shadow-sm w-full'
}))`
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
  background: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};

  @media (prefers-color-scheme: dark) {
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray300.value',
        tokens.colors.dark.gray300.value
      )};
    background: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
  }
`;

export const Title = styled.h2.attrs(() => ({
  className: 'text-xl font-semibold mb-4'
}))`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const ServiceSelection = styled.div.attrs(() => ({
  className: 'service-selection flex flex-col sm:flex-row gap-2'
}))`
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
`;

export const ServiceLabel = styled.label.attrs(() => ({
  className: 'flex items-center gap-2 cursor-pointer'
}))`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const StatusContainer = styled.div.attrs(() => ({
  className: 'status-container my-2 flex items-center gap-2'
}))``;

export const Spinner = styled.span.attrs(() => ({
  className: 'inline-block w-4 h-4 rounded-full animate-spin'
}))`
  border: 2px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.info.value',
        tokens.colors.light.info.value
      )};
  border-top-color: transparent;

  @media (prefers-color-scheme: dark) {
    border: 2px solid
      ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.info.value',
          tokens.colors.dark.info.value
        )};
    border-top-color: transparent;
  }
`;

export const EstimateBreakdown = styled.div.attrs(() => ({
  className: 'estimate-breakdown space-y-2'
}))``;

export const LineItem = styled.div.attrs(() => ({
  className: 'line-item flex justify-between p-2 rounded'
}))`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  background: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
    background: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray100.value',
        tokens.colors.dark.gray100.value
      )};
  }
`;

export const Total = styled.div.attrs(() => ({
  className: 'total mt-4 flex justify-between font-bold p-2 rounded'
}))`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  background: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray100.value',
      tokens.colors.light.gray100.value
    )};
  border-top: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
    background: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray200.value',
        tokens.colors.dark.gray200.value
      )};
    border-top: 1px solid
      ${({ theme }) =>
        getToken(
          theme,
          'colors.dark.gray300.value',
          tokens.colors.dark.gray300.value
        )};
  }
`;

export const LotSizeContainer = styled.div.attrs(() => ({
  className: 'lot-size-container mb-4 flex flex-col'
}))`
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const LotSizeLabel = styled.label.attrs(() => ({
  className: 'mb-2 font-medium'
}))`
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray800.value',
      tokens.colors.light.gray800.value
    )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray800.value',
        tokens.colors.dark.gray800.value
      )};
  }
`;

export const Disclaimer = styled.p.attrs(() => ({
  className: 'text-xs mt-2 italic'
}))`
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray600.value',
      tokens.colors.light.gray600.value
    )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray600.value',
        tokens.colors.dark.gray600.value
      )};
  }
`;
