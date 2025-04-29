// EstimateCalculator.tsx

import React, { useState, useEffect } from 'react';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import { EnrichedAddressSuggestion } from '@typez/addressMatchTypes';
import { motion } from 'framer-motion';
import Alert from '@components/Alert/Alert';
import InputField from '@components/InputField/InputField';
import {
  CalculatorContainer,
  Title,
  LotSizeContainer,
  ServiceSelection,
  ServiceLabel,
  StatusContainer,
  Spinner,
  EstimateBreakdown,
  LineItem,
  Total,
  Disclaimer
} from './EstimateCalculator.styles';

// Define the services array
const services = [
  { value: 'design', label: 'Design' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' }
];

// Update to use motion.create() instead of deprecated motion() function
const MotionLineItem = motion.create(LineItem);

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
    // Allow only numeric input
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
        <Alert role="alert" type="error">
          {error}
        </Alert>
      )}

      {estimate && (
        <EstimateBreakdown>
          {estimate.lotSizeSqFt && (
            <MotionLineItem
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span>Lot Size:</span>
              <span>{estimate.lotSizeSqFt.toLocaleString()} sq ft</span>
            </MotionLineItem>
          )}

          {selectedServices.includes('design') && (
            <MotionLineItem
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span>Design:</span>
              <span>${estimate.designFee.toFixed(2)}</span>
            </MotionLineItem>
          )}

          {selectedServices.includes('installation') && (
            <MotionLineItem
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span>Installation:</span>
              <span>${estimate.installationCost.toFixed(2)}</span>
            </MotionLineItem>
          )}

          {selectedServices.includes('maintenance') && (
            <MotionLineItem
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span>Maintenance:</span>
              <span>${estimate.maintenanceMonthly.toFixed(2)} / month</span>
            </MotionLineItem>
          )}

          <Total>
            <strong>Total Estimate:</strong>
            <span>
              ${estimate.finalEstimate.min.toFixed(2)} - $
              {estimate.finalEstimate.max.toFixed(2)}
            </span>
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
