import React, { useState, useEffect } from 'react';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import {
  AreaAdjusterContainer,
  SliderContainer,
  SliderLabel,
  SliderInput,
  SliderTrack,
  SliderThumb,
  AreaDisplay,
  AreaValue,
  AreaUnit,
  AreaRange
} from './AreaAdjuster.styles';

export interface AreaAdjusterProps {
  addressData: EnrichedAddressSuggestion;
  onAreaChange: (areaSqFt: number) => void;
  initialPercentage?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  currentEstimate?: {
    min: number;
    max: number;
  };
}

export const AreaAdjuster = React.forwardRef<
  HTMLInputElement,
  AreaAdjusterProps
>(
  (
    {
      addressData,
      onAreaChange,
      initialPercentage = 80,
      onKeyDown,
      currentEstimate
    },
    ref
  ) => {
    const estimatedLandscapable =
      addressData.calc?.estimated_landscapable_area || 0;

    const maxArea = estimatedLandscapable;

    const initialArea = Math.round(maxArea * (initialPercentage / 100));

    const [selectedArea, setSelectedArea] = useState(initialArea);
    const [percentage, setPercentage] = useState(initialPercentage);

    useEffect(() => {
      onAreaChange(selectedArea);
    }, [selectedArea, onAreaChange]);

    const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newPercentage = parseInt(event.target.value);
      const newArea = Math.round(maxArea * (newPercentage / 100));

      setPercentage(newPercentage);
      setSelectedArea(newArea);
    };

    const formatArea = (area: number): string => {
      return area.toLocaleString();
    };

    const formatPercentage = (pct: number): string => {
      return `${pct}%`;
    };

    const formatPriceRange = (estimate: {
      min: number;
      max: number;
    }): string => {
      const formatCurrency = (amount: number): string => {
        return `$${amount.toLocaleString()}`;
      };

      if (estimate.min === estimate.max) {
        return formatCurrency(estimate.min);
      }
      return `${formatCurrency(estimate.min)} - ${formatCurrency(estimate.max)}`;
    };

    const ariaLabel = currentEstimate
      ? `% of total parcel ${formatArea(selectedArea)} square feet. Adjust area percentage, current range: ${formatPriceRange(currentEstimate)}`
      : 'Adjust area percentage';

    if (!maxArea) {
      return null;
    }

    return (
      <AreaAdjusterContainer>
        <SliderLabel>Adjust Landscapable Area</SliderLabel>

        <AreaDisplay>
          <AreaValue>{formatArea(selectedArea)}</AreaValue>
          <AreaUnit>
            sq ft ({formatPercentage(percentage)} of available parcel)
          </AreaUnit>
        </AreaDisplay>

        <SliderContainer>
          <SliderTrack>
            <SliderInput
              ref={ref}
              type="range"
              min="20"
              max="100"
              value={percentage}
              onChange={handleSliderChange}
              onKeyDown={onKeyDown}
              aria-label={ariaLabel}
              tabIndex={0}
            />
            <SliderThumb style={{ left: `${percentage}%` }} />
          </SliderTrack>
        </SliderContainer>

        <AreaRange>
          <span>{formatArea(Math.round(maxArea * 0.2))} sq ft</span>
          <span>{formatArea(maxArea)} sq ft</span>
        </AreaRange>
      </AreaAdjusterContainer>
    );
  }
);

AreaAdjuster.displayName = 'AreaAdjuster';

export default AreaAdjuster;
