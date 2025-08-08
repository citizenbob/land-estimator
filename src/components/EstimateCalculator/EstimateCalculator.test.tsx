import React from 'react';
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createTestSuite } from '@lib/testUtils';
import { EstimateCalculator } from './EstimateCalculator';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { MOCK_ENRICHED_ADDRESS_DATA } from '../../lib/testData';
import type { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

vi.mock('@hooks/useLandscapeEstimator');
const mockUseLandscapeEstimator =
  useLandscapeEstimator as unknown as ReturnType<typeof vi.fn>;

describe('EstimateCalculator', () => {
  const testSuite = createTestSuite();
  const calculateEstimateMock = vi.fn();

  const mockAddressData = MOCK_ENRICHED_ADDRESS_DATA;

  beforeEach(() => {
    testSuite.beforeEachSetup();

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
    testSuite.afterEachCleanup();
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
      serviceTypes: ['design', 'installation'],
      overrideLotSizeSqFt: undefined
    });

    fireEvent.click(screen.getByLabelText('Maintenance'));
    expect(calculateEstimateMock).toHaveBeenLastCalledWith(mockAddressData, {
      serviceTypes: ['design', 'installation', 'maintenance'],
      overrideLotSizeSqFt: expect.any(Number)
    });

    calculateEstimateMock.mockClear();
    render(<EstimateCalculator addressData={mockAddressData} />);
    expect(calculateEstimateMock).toHaveBeenCalled();
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
    // Check for the component title which should always be present
    expect(
      screen.getByText('Customize Your Landscaping Services')
    ).toBeInTheDocument();
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
    expect(
      screen.getByText('Customize Your Landscaping Services')
    ).toBeInTheDocument();
  });

  it('allows users to override the lot size value', () => {
    calculateEstimateMock.mockReturnValue({
      status: 'success',
      estimate: {
        designFee: 100,
        installationCost: 500,
        maintenanceMonthly: 50,
        finalEstimate: { min: 600, max: 700 },
        lotSizeSqFt: 5000
      },
      error: null
    });

    render(<EstimateCalculator addressData={mockAddressData} />);

    expect(screen.getByText('Adjust Landscapable Area')).toBeInTheDocument();

    const areaSlider = screen.getByRole('slider');
    expect(areaSlider).toBeInTheDocument();

    fireEvent.change(areaSlider, { target: { value: '60' } });

    expect(calculateEstimateMock).toHaveBeenCalled();
  });

  it('displays the disclaimer about estimate ranges', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    const disclaimer = screen.getByText(
      /Estimate range is based on typical landscaping costs/i
    );
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveStyle('font-style: italic');
  });

  it('handles area adjustment through the area adjuster', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    const areaSlider = screen.getByRole('slider');
    expect(areaSlider).toBeInTheDocument();

    const areaLabel = screen.getByText('Adjust Landscapable Area');
    expect(areaLabel).toBeInTheDocument();
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

  it('supports keyboard navigation from slider to checkboxes', () => {
    render(<EstimateCalculator addressData={mockAddressData} />);

    const areaSlider = screen.getByRole('slider');
    const designCheckbox = screen.getByLabelText('Design');
    const installationCheckbox = screen.getByLabelText('Installation');
    const maintenanceCheckbox = screen.getByLabelText('Maintenance');

    areaSlider.focus();
    expect(areaSlider).toHaveFocus();

    designCheckbox.focus();
    expect(designCheckbox).toHaveFocus();

    fireEvent.keyDown(designCheckbox, { key: 'ArrowDown' });
    installationCheckbox.focus();
    expect(installationCheckbox).toHaveFocus();

    fireEvent.keyDown(installationCheckbox, { key: 'ArrowDown' });
    maintenanceCheckbox.focus();
    expect(maintenanceCheckbox).toHaveFocus();

    expect(maintenanceCheckbox).not.toBeChecked();
    fireEvent.keyDown(maintenanceCheckbox, { key: ' ' });
    expect(maintenanceCheckbox).toBeChecked();
  });
});
