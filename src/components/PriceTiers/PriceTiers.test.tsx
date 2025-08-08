import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { PriceTiers } from './PriceTiers';
import { PriceTier } from '@app-types/landscapeEstimatorTypes';

const mockTheme = {};

const mockTiers: PriceTier[] = [
  {
    tier: 'curb_appeal',
    rate: 4.5,
    designFee: 500,
    installationCost: 2250,
    maintenanceMonthly: 200,
    finalEstimate: 2750
  },
  {
    tier: 'full_lawn',
    rate: 8,
    designFee: 800,
    installationCost: 4000,
    maintenanceMonthly: 300,
    finalEstimate: 4800
  },
  {
    tier: 'dream_lawn',
    rate: 12,
    designFee: 1200,
    installationCost: 6000,
    maintenanceMonthly: 500,
    finalEstimate: 7200
  }
];

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);
};

describe('PriceTiers', () => {
  it('renders without crashing', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);
  });

  it('displays all three tiers', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);

    expect(screen.getByText('Curb Appeal')).toBeInTheDocument();
    expect(screen.getByText('Full Lawn')).toBeInTheDocument();
    expect(screen.getByText('Dream Lawn')).toBeInTheDocument();
  });

  it('displays pricing for each tier', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);

    expect(screen.getByText('$2,750')).toBeInTheDocument();
    expect(screen.getByText('$4,800')).toBeInTheDocument();
    expect(screen.getByText('$7,200')).toBeInTheDocument();
  });

  it('shows "Most Popular" badge for full lawn tier', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);

    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('calls onTierSelect when a tier is clicked', () => {
    const mockOnTierSelect = vi.fn();

    renderWithTheme(
      <PriceTiers tiers={mockTiers} onTierSelect={mockOnTierSelect} />
    );

    const curbAppealCard = screen.getByLabelText(
      'Select Curb Appeal pricing tier'
    );
    fireEvent.click(curbAppealCard);

    expect(mockOnTierSelect).toHaveBeenCalledWith('curb_appeal');
  });

  it('handles keyboard interaction', () => {
    const mockOnTierSelect = vi.fn();

    renderWithTheme(
      <PriceTiers tiers={mockTiers} onTierSelect={mockOnTierSelect} />
    );

    const fullLawnCard = screen.getByLabelText('Select Full Lawn pricing tier');
    fireEvent.keyDown(fullLawnCard, { key: 'Enter' });

    expect(mockOnTierSelect).toHaveBeenCalledWith('full_lawn');
  });

  it('displays rate per square foot when lotSizeSqFt is provided', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} lotSizeSqFt={500} />);

    expect(screen.getByText(/\$4.5\/sq ft/)).toBeInTheDocument();
    expect(screen.getByText(/\$8\/sq ft/)).toBeInTheDocument();
    expect(screen.getByText(/\$12\/sq ft/)).toBeInTheDocument();
  });

  it('renders null when no tiers provided', () => {
    const { container } = renderWithTheme(<PriceTiers tiers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('marks selected tier correctly', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} selectedTier="full_lawn" />);

    const fullLawnCard = screen.getByLabelText('Select Full Lawn pricing tier');
    expect(fullLawnCard).toHaveAttribute('aria-pressed', 'true');
  });
});
