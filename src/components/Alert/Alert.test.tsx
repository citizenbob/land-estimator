import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect } from 'vitest';
import Alert from './Alert';

describe('Alert Component', () => {
  it('renders an alert style for type="success"', () => {
    render(
      <Alert role="status" type="success">
        Operation successful
      </Alert>
    );
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Operation successful');
    expect(alert).toHaveClass('alert-success');
  });

  it('renders an alert style for type="error"', () => {
    render(
      <Alert role="alert" type="error">
        An error occurred
      </Alert>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('An error occurred');
    expect(alert).toHaveClass('alert-error');
  });

  it('renders an alert style for type="warning"', () => {
    render(
      <Alert role="alert" type="warning">
        This is a warning
      </Alert>
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('This is a warning');
    expect(alert).toHaveClass('alert-warning');
  });

  it('renders an alert style for type="info"', () => {
    render(
      <Alert role="status" type="info">
        Informational message
      </Alert>
    );
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Informational message');
    expect(alert).toHaveClass('alert-info');
  });
});
