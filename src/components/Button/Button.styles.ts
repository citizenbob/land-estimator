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
    shouldForwardProp: (prop) => !['loading', 'variant', 'size'].includes(prop)
  })
  .attrs(() => ({
    className: 'rounded-md px-4 py-2 font-semibold'
  }))<{
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
}>`
  padding: ${({ size }) => {
    switch (size) {
      case 'small':
        return '0.5rem 0.75rem';
      case 'large':
        return '1rem 1.5rem';
      default:
        return '0.75rem 1rem';
    }
  }};
  
  font-size: ${({ size }) => {
    switch (size) {
      case 'small':
        return '0.875rem';
      case 'large':
        return '1.125rem';
      default:
        return '1rem';
    }
  }};

  background-color: ${({ theme, variant }) =>
    variant === 'secondary' || variant === 'tertiary'
      ? 'transparent'
      : getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
  
  color: ${({ theme, variant }) => {
    if (variant === 'secondary') {
      return getToken(
        theme,
        'colors.light.text.value',
        tokens.colors.light.text.value
      );
    }
    if (variant === 'tertiary') {
      return getToken(
        theme,
        'colors.light.gray600.value',
        tokens.colors.light.gray600.value
      );
    }
    return getToken(
      theme,
      'colors.light.text.value',
      tokens.colors.light.text.value
    );
  }};
  
  border: ${({ theme, variant }) => {
    if (variant === 'secondary') {
      return `2px solid ${getToken(theme, 'colors.primary.value', tokens.colors.primary.value)}`;
    }
    if (variant === 'tertiary') {
      return `1px solid ${getToken(theme, 'colors.light.gray300.value', tokens.colors.light.gray300.value)}`;
    }
    return 'none';
  }};

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
    background-color: ${({ theme, loading, variant }) => {
      if (loading) {
        return getToken(
          theme,
          'colors.light.gray500.value',
          tokens.colors.light.gray500.value
        );
      }

      if (variant === 'secondary') {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }

      if (variant === 'tertiary') {
        return getToken(
          theme,
          'colors.light.gray100.value',
          tokens.colors.light.gray100.value
        );
      }

      return getToken(
        theme,
        'colors.primaryHover.value',
        tokens.colors.primaryHover.value
      );
    }};
    
    color: ${({ theme, loading, variant }) => {
      if (loading) return 'inherit';

      if (variant === 'secondary') {
        return getToken(
          theme,
          'colors.light.text.value',
          tokens.colors.light.text.value
        );
      }

      return 'inherit';
    }};

    border-color: ${({ theme, variant }) => {
      if (variant === 'secondary') {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }
      if (variant === 'tertiary') {
        return getToken(
          theme,
          'colors.light.gray400.value',
          tokens.colors.light.gray400.value
        );
      }
      return 'transparent';
    }};
  }

  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme, variant }) => {
      if (variant === 'secondary' || variant === 'tertiary')
        return 'transparent';
      return getToken(
        theme,
        'colors.primary.value',
        tokens.colors.primary.value
      );
    }};

    color: ${({ theme, variant }) => {
      if (variant === 'secondary') {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }
      if (variant === 'tertiary') {
        return getToken(
          theme,
          'colors.dark.gray400.value',
          tokens.colors.dark.gray400.value
        );
      }
      return getToken(
        theme,
        'colors.light.text.value',
        tokens.colors.light.text.value
      );
    }};

    border-color: ${({ theme, variant }) => {
      if (variant === 'secondary') {
        return getToken(
          theme,
          'colors.primary.value',
          tokens.colors.primary.value
        );
      }
      if (variant === 'tertiary') {
        return getToken(
          theme,
          'colors.dark.gray600.value',
          tokens.colors.dark.gray600.value
        );
      }
      return 'transparent';
    }};

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
      background-color: ${({ theme, loading, variant }) => {
        if (loading) {
          return getToken(
            theme,
            'colors.dark.gray300.value',
            tokens.colors.dark.gray300.value
          );
        }

        if (variant === 'secondary') {
          return getToken(
            theme,
            'colors.primary.value',
            tokens.colors.primary.value
          );
        }

        if (variant === 'tertiary') {
          return getToken(
            theme,
            'colors.dark.gray800.value',
            tokens.colors.dark.gray800.value
          );
        }

        return getToken(
          theme,
          'colors.primaryHover.value',
          tokens.colors.primaryHover.value
        );
      }};

      color: ${({ theme, loading, variant }) => {
        if (loading) return 'inherit';

        if (variant === 'secondary') {
          return getToken(
            theme,
            'colors.light.text.value',
            tokens.colors.light.text.value
          );
        }

        return 'inherit';
      }};
    }
  }

  &[disabled] {
    background-color: ${({ theme, variant }) => {
      if (variant === 'secondary' || variant === 'tertiary')
        return 'transparent';
      return getToken(
        theme,
        'colors.light.gray300.value',
        tokens.colors.light.gray300.value
      );
    }};
    
    color: ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray500.value',
        tokens.colors.light.gray500.value
      )};
    
    border-color: ${({ theme, variant }) => {
      if (variant === 'secondary' || variant === 'tertiary') {
        return getToken(
          theme,
          'colors.light.gray300.value',
          tokens.colors.light.gray300.value
        );
      }
      return 'transparent';
    }};
    
    cursor: not-allowed;

    &:hover {
      background-color: ${({ theme, variant }) => {
        if (variant === 'secondary' || variant === 'tertiary')
          return 'transparent';
        return getToken(
          theme,
          'colors.light.gray300.value',
          tokens.colors.light.gray300.value
        );
      }};
      
      color: ${({ theme }) =>
        getToken(
          theme,
          'colors.light.gray500.value',
          tokens.colors.light.gray500.value
        )};
      
      cursor: not-allowed;
    }
  }
`;
