import styled, { keyframes, css } from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

// Loading animation - progress bar moving left to right
const loadingProgress = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// Loading state styles
const loadingStyles = css`
  background-color: #9ca3af;
  color: #6b7280;
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
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: ${loadingProgress} 1.5s ease-in-out infinite;
  }
`;

export const ButtonStyles = styled.button
  .withConfig({
    shouldForwardProp: (prop) => prop !== 'loading'
  })
  .attrs(() => ({
    className:
      'rounded-md px-4 py-2 font-semibold focus:outline-none focus:ring focus:border-primary'
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

  /* Apply loading styles when loading */
  ${({ loading }) => loading && loadingStyles}

  &:hover {
    background-color: ${({ theme, loading }) =>
      loading
        ? '#9ca3af'
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

    ${({ loading }) =>
      loading &&
      `
      background-color: #4b5563;
      color: #9ca3af;
    `}

    &:hover {
      background-color: ${({ theme, loading }) =>
        loading
          ? '#4b5563'
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
