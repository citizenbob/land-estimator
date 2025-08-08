import styled, { keyframes, css } from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

const loadingProgress = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const loadingStyles = css`
  background-color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray500.value',
      tokens.colors.light.gray500.value
    )};
  color: ${({ theme }) =>
    getToken(
      theme,
      'colors.light.gray600.value',
      tokens.colors.light.gray600.value
    )};
  cursor: wait;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${({ theme }) =>
          getToken(
            theme,
            'colors.light.shimmer.value',
            tokens.colors.light.shimmer.value
          )}
        50%,
      transparent 100%
    );
    animation: ${loadingProgress} 1.5s ease-in-out infinite;

    @media (prefers-color-scheme: dark) {
      background: linear-gradient(
        90deg,
        transparent 0%,
        ${({ theme }) =>
            getToken(
              theme,
              'colors.dark.shimmer.value',
              tokens.colors.dark.shimmer.value
            )}
          50%,
        transparent 100%
      );
    }
  }
`;

export const ButtonStyles = styled.button
  .withConfig({
    shouldForwardProp: (prop) => prop !== 'loading'
  })
  .attrs(() => ({
    className: 'rounded-md px-4 py-2 font-semibold'
  }))<{ loading?: boolean }>`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) =>
    getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  color: ${({ theme }) =>
    getToken(theme, 'colors.light.text.value', tokens.colors.light.text.value)};
  border: none;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: 2px solid ${({ theme }) =>
      getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
    outline-offset: 2px;
  }

  ${({ loading }) => loading && loadingStyles}

  &:hover {
    background-color: ${({ theme, loading }) =>
      loading
        ? getToken(
            theme,
            'colors.light.gray500.value',
            tokens.colors.light.gray500.value
          )
        : getToken(
            theme,
            'colors.primaryHover.value',
            tokens.colors.primaryHover.value
          )};
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.dark.primary.value',
        tokens.colors.primary.value
      )};

    ${({ loading, theme }) =>
      loading &&
      `
      background-color: ${getToken(
        theme,
        'colors.dark.gray300.value',
        tokens.colors.dark.gray300.value
      )};
      color: ${getToken(
        theme,
        'colors.dark.gray500.value',
        tokens.colors.dark.gray500.value
      )};
    `}

    &:hover {
      background-color: ${({ theme, loading }) =>
        loading
          ? getToken(
              theme,
              'colors.dark.gray300.value',
              tokens.colors.dark.gray300.value
            )
          : getToken(
              theme,
              'colors.dark.primaryHover.value',
              tokens.colors.primaryHover.value
            )};
    }
  }

  &[disabled] {
    background-color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      )};
    cursor: not-allowed;

    &:hover {
      background-color: ${({ theme }) =>
        getToken(
          theme,
          'colors.light.gray300.value',
          tokens.colors.light.gray300.value
        )};
      cursor: not-allowed;
    }
  }
`;
