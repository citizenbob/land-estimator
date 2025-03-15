import React from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import defaultTheme from '../../app/default_theme';
import AddressInput from './AddressInput';

// Extend expect to include jest-axe matchers
expect.extend(toHaveNoViolations);

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider theme={defaultTheme}>{ui}</ThemeProvider>);

describe('AddressInput Component', () => {
  it('renders an input field and a submit button', () => {
    renderWithTheme(<AddressInput onSubmit={() => {}} />);
    expect(screen.getByPlaceholderText(/Enter address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('calls onSubmit with the correct value when form is submitted', () => {
    const onSubmitMock = jest.fn();
    renderWithTheme(<AddressInput onSubmit={onSubmitMock} />);
    const input = screen.getByPlaceholderText(/Enter address/i);
    const button = screen.getByRole('button', { name: /Submit/i });
    fireEvent.change(input, { target: { value: '123 Main St' } });
    fireEvent.click(button);
    expect(onSubmitMock).toHaveBeenCalledWith('123 Main St');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithTheme(<AddressInput onSubmit={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
