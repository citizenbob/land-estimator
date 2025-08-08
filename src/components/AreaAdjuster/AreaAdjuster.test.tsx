import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AreaAdjuster } from './AreaAdjuster';
import { ThemeProvider } from 'styled-components';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

const mockTheme = {};

const mockAddressData: EnrichedAddressSuggestion = {
  latitude: 40.7128,
  longitude: -74.006,
  region: 'test-region',
  place_id: 'test-place-id',
  display_name: '123 Test St',
  affluence_score: 50,
  calc: {
    landarea: 10000,
    building_sqft: 2000,
    estimated_landscapable_area: 6000,
    property_type: 'residential'
  }
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>);
};

describe('AreaAdjuster', () => {
  const mockOnAreaChange = vi.fn();

  beforeEach(() => {
    mockOnAreaChange.mockClear();
  });

  it('renders with default values', () => {
    renderWithTheme(
      <AreaAdjuster
        addressData={mockAddressData}
        onAreaChange={mockOnAreaChange}
      />
    );

    expect(screen.getByText('Adjust Landscapable Area')).toBeInTheDocument();
    expect(screen.getByText('4,800')).toBeInTheDocument();
    expect(screen.getByText('sq ft')).toBeInTheDocument();
    expect(screen.getByText('(80% of landscapable area)')).toBeInTheDocument();
  });

  it('calls onAreaChange when slider is moved', () => {
    renderWithTheme(
      <AreaAdjuster
        addressData={mockAddressData}
        onAreaChange={mockOnAreaChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '60' } });

    expect(mockOnAreaChange).toHaveBeenCalledWith(3600);
  });

  it('updates display when slider value changes', () => {
    renderWithTheme(
      <AreaAdjuster
        addressData={mockAddressData}
        onAreaChange={mockOnAreaChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(screen.getByText('3,000')).toBeInTheDocument();
    expect(screen.getByText('(50% of landscapable area)')).toBeInTheDocument();
  });

  it('respects custom initial percentage', () => {
    renderWithTheme(
      <AreaAdjuster
        addressData={mockAddressData}
        onAreaChange={mockOnAreaChange}
        initialPercentage={90}
      />
    );

    expect(screen.getByText('5,400')).toBeInTheDocument();
    expect(screen.getByText('(90% of landscapable area)')).toBeInTheDocument();
  });

  it('works correctly with smaller landscapable area', () => {
    const smallLotData = {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        landarea: 5000,
        estimated_landscapable_area: 4500
      }
    };

    renderWithTheme(
      <AreaAdjuster
        addressData={smallLotData}
        onAreaChange={mockOnAreaChange}
        initialPercentage={80}
      />
    );

    expect(screen.getByText('3,600')).toBeInTheDocument();
    expect(screen.getByText('(80% of landscapable area)')).toBeInTheDocument();
  });

  it('shows range labels correctly', () => {
    renderWithTheme(
      <AreaAdjuster
        addressData={mockAddressData}
        onAreaChange={mockOnAreaChange}
      />
    );

    expect(screen.getByText('1,200 sq ft')).toBeInTheDocument();
    expect(screen.getByText('6,000 sq ft')).toBeInTheDocument();
  });

  it('returns null when no landscapable area data', () => {
    const noAreaData = {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        estimated_landscapable_area: 0
      }
    };

    const { container } = renderWithTheme(
      <AreaAdjuster addressData={noAreaData} onAreaChange={mockOnAreaChange} />
    );

    expect(container.firstChild).toBeNull();
  });
});
