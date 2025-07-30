import React, { useState, useEffect } from 'react';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import { logEvent } from '@services/logger';
import Alert from '@components/Alert/Alert';
import InputField from '@components/InputField/InputField';
import { EstimateLineItem } from '@components/EstimateLineItem/EstimateLineItem';
import {
  formatCurrency,
  formatSquareFeet,
  formatPriceRange,
  formatMonthlyPrice
} from '@lib/formatUtils';
import {
  CalculatorContainer,
  Title,
  LotSizeContainer,
  ServiceSelection,
  ServiceLabel,
  StatusContainer,
  Spinner,
  EstimateBreakdown,
  Total,
  Disclaimer
} from './EstimateCalculator.styles';

const services = [
  { value: 'design', label: 'Design' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' }
];

interface EstimateCalculatorProps {
  addressData: EnrichedAddressSuggestion;
}

export function EstimateCalculator({ addressData }: EstimateCalculatorProps) {
  const [selectedServices, setSelectedServices] = useState<
    Array<'design' | 'installation' | 'maintenance'>
  >(['design', 'installation']);
  const [lotSizeSqFt, setLotSizeSqFt] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const { estimate, calculateEstimate, status, error } =
    useLandscapeEstimator();

  useEffect(() => {
    if (!addressData.calc || !addressData.calc.estimated_landscapable_area) {
      // Silently handle insufficient data - this is expected for some addresses
      return;
    }

    calculateEstimate(addressData, {
      serviceTypes: selectedServices,
      overrideLotSizeSqFt: lotSizeSqFt ? Number(lotSizeSqFt) : undefined
    });
  }, [addressData, selectedServices, lotSizeSqFt, calculateEstimate]);

  useEffect(() => {
    if (status === 'complete' && estimate && addressData.place_id) {
      const avgEstimate =
        (estimate.finalEstimate.min + estimate.finalEstimate.max) / 2;
      let marketSegment: 'budget' | 'mid-market' | 'premium' | 'luxury';
      if (avgEstimate < 5000) marketSegment = 'budget';
      else if (avgEstimate < 15000) marketSegment = 'mid-market';
      else if (avgEstimate < 50000) marketSegment = 'premium';
      else marketSegment = 'luxury';

      const estimateScore = Math.min(avgEstimate / 1000, 50);
      const leadScore = Math.round(
        (addressData.affluence_score || 0) * 10 + estimateScore
      );

      logEvent(
        'estimate_generated',
        {
          address_id: addressData.place_id,
          full_address: addressData.display_name || addressData.display_name,
          region: addressData.region || 'Unknown',
          latitude: addressData.latitude,
          longitude: addressData.longitude,

          lot_size_sqft: estimate.lotSizeSqFt,
          building_size_sqft: addressData.calc?.building_sqft || 0,
          estimated_landscapable_area:
            addressData.calc?.estimated_landscapable_area || 0,
          property_type: addressData.calc?.property_type || 'unknown',

          affluence_score: addressData.affluence_score || 0,

          selected_services: selectedServices,
          design_fee: estimate.designFee,
          installation_cost: estimate.installationCost,
          maintenance_monthly: estimate.maintenanceMonthly,
          estimate_min: estimate.finalEstimate.min,
          estimate_max: estimate.finalEstimate.max,
          estimate_range_size:
            estimate.finalEstimate.max - estimate.finalEstimate.min,

          price_per_sqft_min: estimate.finalEstimate.min / estimate.lotSizeSqFt,
          price_per_sqft_max: estimate.finalEstimate.max / estimate.lotSizeSqFt,
          is_commercial: false,
          has_custom_lot_size: Boolean(lotSizeSqFt),

          lead_score: leadScore,
          market_segment: marketSegment
        },
        {
          toFirestore: true,
          toMixpanel: true
        }
      );
    }
  }, [status, estimate, addressData, selectedServices, lotSizeSqFt]);

  const handleServiceChange = (
    service: 'design' | 'installation' | 'maintenance'
  ) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleLotSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setLotSizeSqFt(value);
  };

  return (
    <CalculatorContainer>
      <Title>Customize Your Landscaping Services</Title>

      <LotSizeContainer>
        <InputField
          id="lotSize"
          name="lotSize"
          type="text"
          placeholder={
            estimate?.lotSizeSqFt
              ? estimate.lotSizeSqFt.toString()
              : 'Enter square footage'
          }
          value={lotSizeSqFt}
          onChange={handleLotSizeChange}
          aria-label="Override lot size square footage"
        />
      </LotSizeContainer>

      <ServiceSelection>
        {services.map((service) => (
          <ServiceLabel key={service.value}>
            <input
              type="checkbox"
              checked={selectedServices.includes(
                service.value as 'design' | 'installation' | 'maintenance'
              )}
              onChange={() =>
                handleServiceChange(
                  service.value as 'design' | 'installation' | 'maintenance'
                )
              }
            />
            {service.label}
          </ServiceLabel>
        ))}
      </ServiceSelection>

      {status === 'calculating' && (
        <StatusContainer role="status">
          <Spinner />
          <span>Updating estimate...</span>
        </StatusContainer>
      )}

      {error && (
        <Alert
          role="alert"
          type={error === 'INSUFFICIENT_DATA' ? 'warning' : 'error'}
        >
          {error === 'INSUFFICIENT_DATA' ? (
            <div>
              <p>
                <strong>Unable to provide automatic estimate</strong>
              </p>
              <p>
                This address requires an in-person consultation to accurately
                assess the landscaping potential. Please contact us to schedule
                a site visit for a detailed estimate.
              </p>
            </div>
          ) : (
            error
          )}
        </Alert>
      )}

      {estimate && (
        <EstimateBreakdown>
          <EstimateLineItem
            label="Lot Size"
            value={formatSquareFeet(estimate.lotSizeSqFt)}
            show={!!estimate.lotSizeSqFt && estimate.lotSizeSqFt > 0}
          />

          <EstimateLineItem
            label="Design"
            value={formatCurrency(estimate.designFee)}
            show={selectedServices.includes('design')}
          />

          <EstimateLineItem
            label="Installation"
            value={formatCurrency(estimate.installationCost)}
            show={selectedServices.includes('installation')}
          />

          <EstimateLineItem
            label="Maintenance"
            value={formatMonthlyPrice(estimate.maintenanceMonthly)}
            show={selectedServices.includes('maintenance')}
          />

          <Total>
            <strong>Total Estimate:</strong>
            <span>{formatPriceRange(estimate.finalEstimate)}</span>
          </Total>

          <div className="flex justify-start mt-4">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-colors"
              aria-label={
                showDetails
                  ? 'Hide calculation details'
                  : 'Show calculation details'
              }
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <h3 className="font-semibold mb-3">Calculation Details</h3>

              <EstimateLineItem
                label="Property Type"
                value={addressData.calc?.property_type || 'Unknown'}
                show={!!addressData.calc?.property_type}
              />

              <EstimateLineItem
                label="Building Size"
                value={formatSquareFeet(addressData.calc?.building_sqft || 0)}
                show={
                  !!addressData.calc?.building_sqft &&
                  addressData.calc.building_sqft > 0
                }
              />

              <EstimateLineItem
                label="Total Land Area"
                value={formatSquareFeet(addressData.calc?.landarea || 0)}
                show={
                  !!addressData.calc?.landarea && addressData.calc.landarea > 0
                }
              />

              <EstimateLineItem
                label="Landscapable Area"
                value={formatSquareFeet(
                  addressData.calc?.estimated_landscapable_area || 0
                )}
                show={
                  !!addressData.calc?.estimated_landscapable_area &&
                  addressData.calc.estimated_landscapable_area > 0
                }
              />

              <EstimateLineItem
                label="Base Rate (per sq ft)"
                value={`${formatCurrency(estimate.baseRatePerSqFt.min)} - ${formatCurrency(estimate.baseRatePerSqFt.max)}`}
                show={!!estimate.baseRatePerSqFt}
              />

              <EstimateLineItem
                label="Subtotal"
                value={formatPriceRange(estimate.subtotal)}
                show={!!estimate.subtotal}
              />

              <EstimateLineItem
                label="Minimum Service Fee"
                value={formatCurrency(estimate.minimumServiceFee)}
                show={
                  !!estimate.minimumServiceFee && estimate.minimumServiceFee > 0
                }
              />

              <EstimateLineItem
                label="Affluence Score"
                value={`${addressData.affluence_score || 0}/100`}
                show={typeof addressData.affluence_score === 'number'}
              />

              {typeof addressData.affluence_score === 'number' && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                  <h4 className="font-semibold mb-2">
                    How Affluence Score Affects Pricing:
                  </h4>
                  <div className="space-y-1 text-gray-700">
                    <div>
                      • Score 0-50: Base rate × 0.85-1.0 (lower pricing)
                    </div>
                    <div>• Score 50: Base rate × 1.0 (standard pricing)</div>
                    <div>
                      • Score 51-100: Base rate × 1.0-1.25 (premium pricing)
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Current multiplier:{' '}
                    {(() => {
                      const score = addressData.affluence_score || 50;
                      const clampedScore = Math.max(0, Math.min(100, score));
                      let multiplier;
                      if (clampedScore <= 50) {
                        const ratio = clampedScore / 50;
                        multiplier = 0.85 + (1.0 - 0.85) * ratio;
                      } else {
                        const ratio = (clampedScore - 50) / (100 - 50);
                        multiplier = 1.0 + (1.25 - 1.0) * ratio;
                      }
                      return `×${multiplier.toFixed(2)}`;
                    })()}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <h5 className="font-semibold mb-2 text-xs">
                      How Affluence Score is Calculated:
                    </h5>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>
                        • <strong>Property Assessment:</strong> Total assessed
                        value compared to regional median
                      </div>
                      <div>
                        • <strong>Land Value Ratio:</strong> Proportion of land
                        value to total assessment
                      </div>
                      <div>
                        • <strong>Regional Context:</strong> Percentile ranking
                        within St. Louis City/County
                      </div>
                      <div>
                        • <strong>Score Range:</strong> 0-100 (higher = more
                        affluent area)
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Based on county assessor data and regional market analysis
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Disclaimer>
            Estimate range is based on typical landscaping costs in your area.
            Final pricing may vary based on site conditions, material choices,
            and design complexity.
          </Disclaimer>
        </EstimateBreakdown>
      )}
    </CalculatorContainer>
  );
}
