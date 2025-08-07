import styled from 'styled-components';
import { motion } from 'framer-motion';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const SpinnerWrapper = styled(motion.div)<{
  size: 'sm' | 'md' | 'lg';
  color: 'primary' | 'secondary' | 'gray';
}>`
  border-radius: 50%;
  border-style: solid;
  border-width: ${({ size }) => (size === 'lg' ? '3px' : '2px')};
  width: ${({ size }) =>
    size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : '1.5rem'};
  height: ${({ size }) =>
    size === 'sm' ? '1rem' : size === 'md' ? '1.25rem' : '1.5rem'};

  ${({ color, theme }) => {
    if (color === 'primary') {
      return `
        border-color: ${getToken(theme, 'colors.light.gray200.value', tokens.colors.light.gray200.value)};
        border-top-color: ${getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
        
        @media (prefers-color-scheme: dark) {
          border-color: ${getToken(theme, 'colors.dark.gray300.value', tokens.colors.dark.gray300.value)};
          border-top-color: ${getToken(theme, 'colors.primary.value', tokens.colors.primary.value)};
        }
      `;
    } else if (color === 'secondary') {
      return `
        border-color: ${getToken(theme, 'colors.light.gray200.value', tokens.colors.light.gray200.value)};
        border-top-color: ${getToken(theme, 'colors.secondary.value', tokens.colors.secondary.value)};
        
        @media (prefers-color-scheme: dark) {
          border-color: ${getToken(theme, 'colors.dark.gray300.value', tokens.colors.dark.gray300.value)};
          border-top-color: ${getToken(theme, 'colors.secondary.value', tokens.colors.secondary.value)};
        }
      `;
    } else {
      return `
        border-color: ${getToken(theme, 'colors.light.gray300.value', tokens.colors.light.gray300.value)};
        border-top-color: ${getToken(theme, 'colors.light.gray600.value', tokens.colors.light.gray600.value)};
        
        @media (prefers-color-scheme: dark) {
          border-color: ${getToken(theme, 'colors.dark.gray400.value', tokens.colors.dark.gray400.value)};
          border-top-color: ${getToken(theme, 'colors.dark.gray600.value', tokens.colors.dark.gray600.value)};
        }
      `;
    }
  }}
`;
