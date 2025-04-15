import styled from 'styled-components';
import tokens from '@tokens/tokens.json';

export const ButtonStyles = styled.button.attrs(() => ({
  className: 'rounded-md transition-colors'
}))`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) =>
    theme.colors?.primary?.value || tokens.colors.primary.value};
  color: white;
  border: none;
  &:hover {
    background-color: ${({ theme }) =>
      theme.colors?.primaryHover?.value || tokens.colors.primaryHover.value};
  }
  &[disabled] {
    background-color: ${({ theme }) =>
      theme.colors?.gray300?.value || tokens.colors.light.gray300.value};
    cursor: not-allowed;
    &:hover {
      background-color: ${({ theme }) =>
        theme.colors?.gray300?.value || tokens.colors.light.gray300.value};
      cursor: not-allowed;
    }
  }
`;
