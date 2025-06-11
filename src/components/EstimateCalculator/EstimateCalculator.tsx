import React, { useState, useEffect } from 'react';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { EnrichedAddressSuggestion } from '@typez/addressMatchTypes';
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
  const { estimate, calculateEstimate, status, error } =
    useLandscapeEstimator();

  useEffect(() => {
    if (!addressData.calc || !addressData.calc.estimated_landscapable_area) {
      console.error(
        'Insufficient data: estimated_landscapable_area is missing or invalid.'
      );
      return;
    }

    calculateEstimate(addressData, {
      serviceTypes: selectedServices,
      overrideLotSizeSqFt: lotSizeSqFt ? Number(lotSizeSqFt) : undefined
    });
  }, [addressData, selectedServices, lotSizeSqFt, calculateEstimate]);

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
