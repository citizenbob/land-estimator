import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import { logEvent } from '@services/logger';
import Alert from '@components/Alert/Alert';
import { Checkbox } from '@components/Checkbox/Checkbox';
import { EstimateLineItem } from '@components/EstimateLineItem/EstimateLineItem';
import { AreaAdjuster } from '@components/AreaAdjuster/AreaAdjuster';
import { useElementRefs } from '@hooks/useElementRefs';
import { useKeyboardNavigation } from '@hooks/useKeyboardNavigation';
import {
  formatCurrency,
  formatSquareFeet,
  formatPriceRange,
  formatMonthlyPrice
} from '@lib/formatUtils';
import {
  CalculatorContainer,
  Title,
  ServiceSelection,
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
  onAreaChange?: (areaSqFt: number) => void;
}

export function EstimateCalculator({
  addressData,
  onAreaChange
}: EstimateCalculatorProps) {
  const [selectedServices, setSelectedServices] = useState<
    Array<'design' | 'installation' | 'maintenance'>
  >(['design', 'installation']);
  const [lotSizeSqFt, setLotSizeSqFt] = useState<string>('');
  const { estimate, calculateEstimate, status, error } =
    useLandscapeEstimator();

  const { elementRefs: checkboxRefs } = useElementRefs<HTMLInputElement>(
    services.length
  );

  const calculatorContainerRef = useRef<HTMLDivElement>(null);
  const areaAdjusterRef = useRef<HTMLInputElement>(null);

  const totalElements = 1 + services.length;
  const { elementRefs: allElementRefs } =
    useElementRefs<HTMLElement>(totalElements);

  const handleElementSelect = useCallback(
    (index: number) => {
      if (index === 0) {
        if (areaAdjusterRef.current) {
          areaAdjusterRef.current.focus();
        }
      } else {
        const checkboxIndex = index - 1;
        if (checkboxRefs[checkboxIndex]?.current) {
          checkboxRefs[checkboxIndex].current?.focus();
        }
      }
    },
    [checkboxRefs]
  );

  const { handleTriggerKeyDown, handleElementKeyDown } = useKeyboardNavigation(
    calculatorContainerRef,
    handleElementSelect,
    () => allElementRefs
  );

  useEffect(() => {
    if (areaAdjusterRef.current) {
      allElementRefs[0].current = areaAdjusterRef.current;
    }

    checkboxRefs.forEach((ref, index) => {
      if (ref.current && allElementRefs[index + 1]) {
        allElementRefs[index + 1].current = ref.current;
      }
    });
  }, [allElementRefs, checkboxRefs, areaAdjusterRef]);

  const analyticsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const logAnalyticsDebounced = useCallback(() => {
    if (analyticsTimeoutRef.current) {
      clearTimeout(analyticsTimeoutRef.current);
    }

    analyticsTimeoutRef.current = setTimeout(() => {
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

            price_per_sqft_min:
              estimate.finalEstimate.min / estimate.lotSizeSqFt,
            price_per_sqft_max:
              estimate.finalEstimate.max / estimate.lotSizeSqFt,
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
    }, 1500);
  }, [status, estimate, addressData, selectedServices, lotSizeSqFt]);

  useEffect(() => {
    if (!addressData.calc || !addressData.calc.estimated_landscapable_area) {
      return;
    }

    calculateEstimate(addressData, {
      serviceTypes: selectedServices,
      overrideLotSizeSqFt: lotSizeSqFt ? Number(lotSizeSqFt) : undefined
    });
  }, [addressData, selectedServices, lotSizeSqFt, calculateEstimate]);

  useEffect(() => {
    logAnalyticsDebounced();
  }, [logAnalyticsDebounced]);

  useEffect(() => {
    return () => {
      if (analyticsTimeoutRef.current) {
        clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, []);

  const handleServiceChange = (
    service: 'design' | 'installation' | 'maintenance'
  ) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const handleAreaChange = (areaSqFt: number) => {
    setLotSizeSqFt(areaSqFt.toString());
    onAreaChange?.(areaSqFt);
  };

  return (
    <CalculatorContainer
      ref={calculatorContainerRef}
      tabIndex={-1}
      onKeyDown={handleTriggerKeyDown}
    >
      <Title>Customize Your Landscaping Services</Title>

      <AreaAdjuster
        ref={areaAdjusterRef}
        addressData={addressData}
        onAreaChange={handleAreaChange}
        initialPercentage={80}
        onKeyDown={(e) => handleElementKeyDown?.(e, 0)}
        currentEstimate={estimate?.finalEstimate}
      />

      <ServiceSelection>
        {services.map((service, index) => (
          <Checkbox
            key={service.value}
            ref={checkboxRefs[index]}
            label={service.label}
            checked={selectedServices.includes(
              service.value as 'design' | 'installation' | 'maintenance'
            )}
            onChange={() =>
              handleServiceChange(
                service.value as 'design' | 'installation' | 'maintenance'
              )
            }
            onKeyDown={(e) => handleElementKeyDown?.(e, index + 1)}
            id={`service-${service.value}`}
          />
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
