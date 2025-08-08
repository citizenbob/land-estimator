import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const CalculatorContainer = styled.div.attrs(() => ({
  className: 'rounded-lg shadow-sm'
}))`
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.border.value',
        tokens.colors.dark.border.value
      )};
  }
`;

export const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0
    ${({ theme }) =>
      getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const ServiceSelection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};

  @media (min-width: 640px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

export const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.base.value', tokens.spacing.base.value)}
    0;
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray100.value',
      tokens.colors.light.gray100.value
    )};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray100.value',
        tokens.colors.dark.gray100.value
      )};
  }
`;

export const Spinner = styled.div`
  width: 1rem;
  height: 1rem;
  border: 2px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      )};
  border-top-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-color-scheme: dark) {
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray300.value',
        tokens.colors.dark.gray300.value
      )};
    border-top-color: ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  }
`;

export const EstimateBreakdown = styled.div`
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)}
    0;
`;

export const LineItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray900.value',
      tokens.colors.light.gray900.value
    )};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  font-size: 0.875rem;

  &:last-child {
    margin-bottom: 0;
  }

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray700.value',
        tokens.colors.dark.gray700.value
      )};
  }
`;

export const Total = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  margin-top: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
  font-weight: 600;
  font-size: 1.125rem;
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)}20;
  border: 1px solid
    ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const LotSizeContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
`;

export const LotSizeLabel = styled.label`
  font-weight: 500;
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const Disclaimer = styled.p`
  font-size: 0.75rem;
  font-style: italic;
  margin-top: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray700.value',
      tokens.colors.light.gray700.value
    )};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray100.value',
      tokens.colors.light.gray100.value
    )};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  border-left: 3px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      )};

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray300.value',
        tokens.colors.dark.gray300.value
      )};
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray100.value',
        tokens.colors.dark.gray100.value
      )};
    border-left-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray300.value',
        tokens.colors.dark.gray300.value
      )};
  }
`;
