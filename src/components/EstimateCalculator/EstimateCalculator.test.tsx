import React from 'react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EstimateCalculator } from './EstimateCalculator';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { MOCK_ENRICHED_ADDRESS_DATA } from '../../lib/testData';
import type { EnrichedAddressSuggestion } from '@app-types';

vi.mock('@hooks/useLandscapeEstimator');
const mockUseLandscapeEstimator =
  useLandscapeEstimator as unknown as ReturnType<typeof vi.fn>;

describe('EstimateCalculator', () => {
  const calculateEstimateMock = vi.fn();

  const mockAddressData = MOCK_ENRICHED_ADDRESS_DATA;

  beforeEach(() => {
    calculateEstimateMock.mockImplementation(() => Promise.resolve());
    mockUseLandscapeEstimator.mockReturnValue({
      estimate: {
        designFee: 100,
        installationCost: 500,
        maintenanceMonthly: 50,
        finalEstimate: { min: 600, max: 700 }
      },
      calculateEstimate: calculateEstimateMock,
      status: 'idle',
      error: null
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with default selected services', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    expect(
      screen.getByText('Customize Your Landscaping Services')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Design')).toBeChecked();
    expect(screen.getByLabelText('Installation')).toBeChecked();
    expect(screen.getByLabelText('Maintenance')).not.toBeChecked();
  });

  it('calls calculateEstimate on mount and when selected services change', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    expect(calculateEstimateMock).toHaveBeenCalledWith(mockAddressData, {
      serviceTypes: ['design', 'installation']
    });

    fireEvent.click(screen.getByLabelText('Maintenance'));
    expect(calculateEstimateMock).toHaveBeenCalledWith(mockAddressData, {
      serviceTypes: ['design', 'installation', 'maintenance']
    });

    calculateEstimateMock.mockClear();
    render(<EstimateCalculator addressData={mockAddressData} />);
    expect(calculateEstimateMock).toHaveBeenCalledTimes(1);
  });

  it('displays the estimate breakdown when estimate is available', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    expect(screen.getByText('Design:')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('Installation:')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.queryByText('Maintenance:')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Maintenance'));
    expect(screen.getByText('Maintenance:')).toBeInTheDocument();
    expect(screen.getByText('$50.00 / month')).toBeInTheDocument();
  });

  it('displays a loading spinner when status is "calculating"', () => {
    mockUseLandscapeEstimator.mockReturnValueOnce({
      estimate: {
        designFee: 100,
        installationCost: 500,
        maintenanceMonthly: 50,
        finalEstimate: { min: 600, max: 700 }
      },
      calculateEstimate: calculateEstimateMock,
      status: 'calculating',
      error: null
    });

    render(<EstimateCalculator addressData={mockAddressData} />);
    expect(screen.getByText('Updating estimate...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays an error message when there is an error', () => {
    mockUseLandscapeEstimator.mockReturnValueOnce({
      estimate: {
        designFee: 100,
        installationCost: 500,
        maintenanceMonthly: 50,
        finalEstimate: { min: 600, max: 700 }
      },
      calculateEstimate: calculateEstimateMock,
      status: 'idle',
      error: 'Something went wrong'
    });

    render(<EstimateCalculator addressData={mockAddressData} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('allows users to override the lot size value', async () => {
    mockUseLandscapeEstimator.mockReturnValue({
      estimate: {
        lotSizeSqFt: 5000,
        designFee: 100,
        installationCost: 500,
        maintenanceMonthly: 50,
        finalEstimate: { min: 600, max: 700 }
      },
      calculateEstimate: calculateEstimateMock,
      status: 'idle',
      error: null
    });

    render(<EstimateCalculator addressData={mockAddressData} />);

    expect(screen.getByText('Lot Size:')).toBeInTheDocument();
    expect(screen.getByText('5,000 sq ft')).toBeInTheDocument();

    const lotSizeInput = screen.getByLabelText(
      'Override lot size square footage'
    );
    expect(lotSizeInput).toBeInTheDocument();

    fireEvent.change(lotSizeInput, { target: { value: '' } });
    fireEvent.change(lotSizeInput, { target: { value: '7500' } });

    expect(calculateEstimateMock).toHaveBeenCalledWith(mockAddressData, {
      serviceTypes: ['design', 'installation'],
      overrideLotSizeSqFt: 7500
    });
  });

  it('displays the disclaimer about estimate ranges', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    const disclaimer = screen.getByText(
      /Estimate range is based on typical landscaping costs/i
    );
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveClass('text-xs');
  });

  it('filters out non-numeric input in the lot size field', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    const lotSizeInput = screen.getByLabelText(
      'Override lot size square footage'
    );

    fireEvent.change(lotSizeInput, { target: { value: '1000abc' } });

    expect(lotSizeInput).toHaveValue('1000');
  });

  it('handles incomplete address data gracefully', () => {
    const incompleteAddressData = {
      ...mockAddressData,
      calc: undefined
    } as unknown as EnrichedAddressSuggestion;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<EstimateCalculator addressData={incompleteAddressData} />);

    expect(
      screen.getByText('Customize Your Landscaping Services')
    ).toBeInTheDocument();
    expect(calculateEstimateMock).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles missing landscapable area data', () => {
    const incompleteCalcData = {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        estimated_landscapable_area: undefined
      }
    } as unknown as EnrichedAddressSuggestion;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<EstimateCalculator addressData={incompleteCalcData} />);

    expect(
      screen.getByText('Customize Your Landscaping Services')
    ).toBeInTheDocument();
    expect(calculateEstimateMock).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('calculates estimates with valid address data', () => {
    const validAddressData = {
      ...mockAddressData,
      calc: {
        ...mockAddressData.calc,
        landarea: 5000,
        building_sqft: 1000,
        estimated_landscapable_area: 3500,
        property_type: 'residential'
      }
    };

    render(<EstimateCalculator addressData={validAddressData} />);

    expect(calculateEstimateMock).toHaveBeenCalledWith(validAddressData, {
      serviceTypes: ['design', 'installation']
    });
  });
});
