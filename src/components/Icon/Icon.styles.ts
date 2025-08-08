import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const IconWrapper = styled.span<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'muted' | 'inherit';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Size variants */
  ${({ size = 'md' }) => {
    const sizeMap = {
      xs: '12px',
      sm: '16px',
      md: '20px',
      lg: '24px',
      xl: '32px'
    };

    return `
      width: ${sizeMap[size]};
      height: ${sizeMap[size]};
    `;
  }}

  /* Color variants */
  ${({ color = 'inherit', theme }) => {
    if (color === 'primary') {
      return `
        color: ${getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
      `;
    } else if (color === 'secondary') {
      return `
        color: ${getToken(theme, 'colors.secondary.value', tokens.colors.secondary.value)};
      `;
    } else if (color === 'muted') {
      return `
        color: ${getToken(theme, 'colors.light.gray500.value', tokens.colors.light.gray500.value)};
        
        @media (prefers-color-scheme: dark) {
          color: ${getToken(theme, 'colors.dark.gray400.value', tokens.colors.dark.gray400.value)};
        }
      `;
    }

    return 'color: inherit;';
  }}

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;
