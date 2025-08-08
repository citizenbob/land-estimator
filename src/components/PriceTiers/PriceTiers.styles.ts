import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const PriceTiersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  margin-bottom: ${({ theme }) =>
    getToken(theme, 'spacing.xl.value', tokens.spacing.xl.value)};
  max-width: 1200px;
  margin: 0 auto;
  padding: 0
    ${({ theme }) =>
      getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};

  @media (max-width: 768px) {
    display: none;
  }
`;

export const SwipeContainer = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    width: 100%;
  }
`;
export const SwipeWrapper = styled.div<{ $translateX?: number }>`
  display: flex;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.xl.value', tokens.spacing.xl.value)};
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  -webkit-overflow-scrolling: touch;
`;

export const LoadingCard = styled.div`
  position: relative;
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border: 2px solid
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
  text-align: center;
  min-width: 280px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  @media (max-width: 768px) {
    scroll-snap-align: center;
    flex-shrink: 0;
    width: calc(100% - 2rem);
    min-width: calc(100% - 2rem);
  }

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

export const PriceTierCard = styled.div<{
  $isSelected?: boolean;
  $isPopular?: boolean;
}>`
  position: relative;
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.lg.value', tokens.spacing.lg.value)};
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.background.value',
      tokens.colors.light.background.value
    )};
  border: 2px solid
    ${({ theme, $isSelected, $isPopular }) => {
      if ($isSelected) {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }
      if ($isPopular) {
        return getToken(
          theme,
          'colors.light.success.value',
          tokens.colors.light.success.value
        );
      }
      return getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      );
    }};
  border-radius: ${({ theme }) =>
    getToken(
      theme,
      'borderRadius.default.value',
      tokens.borderRadius.default.value
    )};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-align: center;

  @media (max-width: 768px) {
    scroll-snap-align: center;
    flex-shrink: 0;
    width: 100%;
    min-height: 200px;
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.background.value',
        tokens.colors.dark.background.value
      )};
    border-color: ${({ theme, $isSelected, $isPopular }) => {
      if ($isSelected) {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }
      if ($isPopular) {
        return getToken(
          theme,
          'colors.dark.success.value',
          tokens.colors.dark.success.value
        );
      }
      return getToken(
        theme,
        'colors.dark.gray200.value',
        tokens.colors.dark.gray200.value
      );
    }};
  }

  &:hover {
    border-color: ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);

    @media (prefers-color-scheme: dark) {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
  }

  &:focus {
    outline: 2px solid
      ${({ theme }) =>
        getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    outline-offset: 2px;
  }

  ${({ $isSelected }) =>
    $isSelected &&
    `
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);

    @media (prefers-color-scheme: dark) {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }
  `}
`;

export const TierPopular = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.success.value',
      tokens.colors.light.success.value
    )};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: ${({ theme }) =>
    getToken(theme, 'borderRadius.full.value', tokens.borderRadius.full.value)};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.success.value',
        tokens.colors.dark.success.value
      )};
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const TierTitle = styled.h3`
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)}
    0;
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  font-size: 1.25rem;
  font-weight: 600;

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(theme, 'colors.dark.text.value', tokens.colors.dark.text.value)};
  }
`;

export const TierPrice = styled.div`
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.base.value', tokens.spacing.base.value)}
    0;
  color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  font-size: 1.875rem;
  font-weight: 700;
`;

export const TierRate = styled.div`
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray600.value',
      tokens.colors.light.gray600.value
    )};
  font-size: 0.875rem;
  font-weight: 400;

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray600.value',
        tokens.colors.dark.gray600.value
      )};
  }
`;

export const TierDescription = styled.p`
  margin: ${({ theme }) =>
      getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)}
    0 0;
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray600.value',
      tokens.colors.light.gray600.value
    )};
  font-size: 0.875rem;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.gray600.value',
        tokens.colors.dark.gray600.value
      )};
  }
`;
