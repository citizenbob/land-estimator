import styled from 'styled-components';
import tokens from '@tokens/tokens.json';

export const InputFieldStyles = styled.input.attrs(() => ({
  className:
    'w-full rounded-md focus:outline-none focus:ring focus:border-primary'
}))`
  padding: 0.75rem;
  border: 1px solid
    ${({ theme }) =>
      theme.colors?.light?.gray300?.value || tokens.colors.light.gray300.value};
  background-color: ${({ theme }) =>
    theme.colors?.light?.background?.value ||
    tokens.colors.light.background.value};
  color: ${({ theme }) =>
    theme.colors?.light?.text?.value || tokens.colors.light.text.value};
  @media (prefers-color-scheme: dark) {
    background-color: ${({ theme }) =>
      theme.colors?.dark?.background?.value ||
      tokens.colors.dark.background.value};
    color: ${({ theme }) =>
      theme.colors?.dark?.text?.value || tokens.colors.dark.text.value};
  }
  &:focus {
    box-shadow: 0 0 0 2px
      ${({ theme }) =>
        theme.colors?.primaryHover?.value || tokens.colors.primaryHover.value};
    border-color: ${({ theme }) =>
      theme.colors?.primary?.value || tokens.colors.primary.value};
    @media (prefers-color-scheme: dark) {
      border-color: ${({ theme }) =>
        theme.colors?.primary?.value || tokens.colors.primary.value};
    }
  }
`;
