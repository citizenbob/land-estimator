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
}

export const AreaAdjuster: React.FC<AreaAdjusterProps> = ({
  addressData,
  onAreaChange,
  initialPercentage = 80
}) => {
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

  if (!maxArea) {
    return null;
  }

  return (
    <AreaAdjusterContainer>
      <SliderLabel>Adjust Landscapable Area</SliderLabel>

      <AreaDisplay>
        <AreaValue>{formatArea(selectedArea)}</AreaValue>
        <AreaUnit>sq ft</AreaUnit>
        <span>({formatPercentage(percentage)} of landscapable area)</span>
      </AreaDisplay>

      <SliderContainer>
        <SliderTrack>
          <SliderInput
            type="range"
            min="20"
            max="100"
            value={percentage}
            onChange={handleSliderChange}
            aria-label="Adjust landscapable area percentage"
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
};

export default AreaAdjuster;
