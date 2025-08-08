import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const AreaAdjusterContainer = styled.div`
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
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};

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
        'colors.dark.gray200.value',
        tokens.colors.dark.gray200.value
      )};
  }
`;

export const SliderLabel = styled.label`
  display: block;
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  font-size: 0.875rem;
  font-weight: 500;

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const AreaDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
`;

export const AreaValue = styled.span`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
`;

export const AreaUnit = styled.span`
  font-size: 0.875rem;
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

export const SliderContainer = styled.div`
  position: relative;
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.base.value', tokens.spacing.base.value)}
    0;
`;

export const SliderTrack = styled.div`
  position: relative;
  height: 8px;
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray200.value',
      tokens.colors.light.gray200.value
    )};
  border-radius: 4px;

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray200.value',
        tokens.colors.dark.gray200.value
      )};
  }
`;

export const SliderInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;

  &:focus {
    outline: none;
  }

  &:focus + div {
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  }
`;

export const SliderThumb = styled.div`
  position: absolute;
  top: 50%;
  width: 20px;
  height: 20px;
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease-in-out;
  z-index: 1;

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }

  @media (prefers-color-scheme: dark) {
    border-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
  }
`;

export const AreaRange = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  font-size: 0.75rem;
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
