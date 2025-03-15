import styled from 'styled-components';

// For Form, we can apply a default layout with Tailwind classes,
// and then override spacing and borders with theme tokens.
export const Form = styled.form.attrs(() => ({
  className: 'flex flex-col rounded-md shadow-sm', // static Tailwind classes
}))`
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.base};
  border: 1px solid ${({ theme }) => theme.colors.gray200};
`;

// For Input, we blend a static Tailwind class for border-radius and focus transition
// with dynamic values for border colors and spacing.
export const Input = styled.input.attrs(() => ({
  className: 'rounded-md focus:outline-none focus:ring', // static Tailwind classes
}))`
  padding: 0.75rem; /* you can replace with theme.spacing if desired */
  border: 1px solid ${({ theme }) => theme.colors.gray300};
  &:focus {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primaryHover};
    border-color: ${({ theme }) => theme.colors.primaryHover};
  }
`;

// For Button, we apply a couple of static utility classes for rounding and transitions,
// while dynamically setting colors from our theme.
export const Button = styled.button.attrs(() => ({
  className: 'rounded-md transition-colors', // static Tailwind classes
}))`
  padding: 0.75rem 1rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryHover};
  }
`;
