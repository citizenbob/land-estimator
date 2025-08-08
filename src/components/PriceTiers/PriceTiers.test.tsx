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

    expect(screen.getAllByText('Curb Appeal')).toHaveLength(2);
    expect(screen.getAllByText('Full Lawn')).toHaveLength(2);
    expect(screen.getAllByText('Dream Lawn')).toHaveLength(2);
  });

  it('displays pricing for each tier', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);

    expect(screen.getAllByText(/\$/).length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText(/2,750/)).toHaveLength(2);
    expect(screen.getAllByText(/4,800/)).toHaveLength(2);
    expect(screen.getAllByText(/7,200/)).toHaveLength(2);
  });

  it('shows "Most Popular" badge for full lawn tier', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} />);

    expect(screen.getAllByText('Most Popular')).toHaveLength(2);
  });

  it('calls onTierSelect when a tier is clicked', () => {
    const mockOnTierSelect = vi.fn();

    renderWithTheme(
      <PriceTiers tiers={mockTiers} onTierSelect={mockOnTierSelect} />
    );

    const curbAppealCards = screen.getAllByLabelText(
      'Select Curb Appeal pricing tier, $2,750'
    );
    fireEvent.click(curbAppealCards[0]);

    expect(mockOnTierSelect).toHaveBeenCalledWith('curb_appeal');
  });

  it('handles keyboard interaction', () => {
    const mockOnTierSelect = vi.fn();

    renderWithTheme(
      <PriceTiers tiers={mockTiers} onTierSelect={mockOnTierSelect} />
    );

    const fullLawnCards = screen.getAllByLabelText(
      'Select Full Lawn pricing tier, $4,800, most popular option'
    );
    fireEvent.keyDown(fullLawnCards[0], { key: 'Enter' });

    expect(mockOnTierSelect).toHaveBeenCalledWith('full_lawn');
  });

  it('displays rate per square foot when lotSizeSqFt is provided', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} lotSizeSqFt={500} />);

    // Both desktop and mobile versions are rendered
    expect(screen.getAllByText(/\$4.5\/sq ft/)).toHaveLength(2);
    expect(screen.getAllByText(/\$8\/sq ft/)).toHaveLength(2);
    expect(screen.getAllByText(/\$12\/sq ft/)).toHaveLength(2);
  });

  it('renders null when no tiers provided', () => {
    const { container } = renderWithTheme(<PriceTiers tiers={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('marks selected tier correctly', () => {
    renderWithTheme(<PriceTiers tiers={mockTiers} selectedTier="full_lawn" />);

    const fullLawnCards = screen.getAllByLabelText(
      'Select Full Lawn pricing tier, $4,800, most popular option, currently selected'
    );
    expect(fullLawnCards[0]).toHaveAttribute('aria-pressed', 'true');
    expect(fullLawnCards[1]).toHaveAttribute('aria-pressed', 'true');
  });
});
