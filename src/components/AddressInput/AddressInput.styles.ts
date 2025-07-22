import styled from 'styled-components';
import tokens from '@tokens/tokens.json';
import { getToken } from '@tokens/tokenUtils';

export const Form = styled.form.attrs(() => ({
  className: 'relative flex flex-col rounded-md shadow-sm w-full'
}))`
  gap: ${({ theme }) =>
    getToken(theme, 'spacing.sm.value', tokens.spacing.sm.value)};
  padding: ${({ theme }) =>
    getToken(theme, 'spacing.base.value', tokens.spacing.base.value)};
  border: 1px solid
    ${({ theme }) =>
      getToken(
        theme,
        'colors.light.gray200.value',
        tokens.colors.light.gray200.value
      )};
`;
