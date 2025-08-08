import React, { useRef, useState, useEffect } from 'react';
import { PriceTier, PriceTiersProps } from '@app-types/landscapeEstimatorTypes';
import { useLandscapeEstimator } from '@hooks/useLandscapeEstimator';
import {
  PriceTiersContainer,
  PriceTierCard,
  TierTitle,
  TierPrice,
  TierRate,
  TierDescription,
  TierPopular,
  SwipeContainer,
  SwipeWrapper,
  LoadingCard
} from './PriceTiers.styles';

const tierDetails = {
  curb_appeal: {
    title: 'Curb Appeal',
    description: 'Basic landscape enhancement to boost property appeal',
    popular: false
  },
  full_lawn: {
    title: 'Full Lawn',
    description: 'Complete lawn restoration and professional landscaping',
    popular: true
  },
  dream_lawn: {
    title: 'Dream Lawn',
    description: 'Premium landscaping with luxury features and materials',
    popular: false
  }
};

export const PriceTiers: React.FC<PriceTiersProps> = ({
  addressData,
  selectedTier,
  onTierSelect,
  tiers: propTiers,
  lotSizeSqFt: propLotSizeSqFt,
  isLoading: propIsLoading
}) => {
  const swipeRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const { tieredEstimate, isTieredLoading, calculateTieredEstimate } =
    useLandscapeEstimator();

  useEffect(() => {
    if (addressData?.calc?.estimated_landscapable_area) {
      const latOffset = 0.001;
      const lonOffset = 0.001;
      const boundingBox: [string, string, string, string] = [
        (addressData.latitude - latOffset).toString(),
        (addressData.latitude + latOffset).toString(),
        (addressData.longitude - lonOffset).toString(),
        (addressData.longitude + lonOffset).toString()
      ];

      const options = {
        overrideLotSizeSqFt:
          propLotSizeSqFt ?? addressData.calc.estimated_landscapable_area
      };

      calculateTieredEstimate(boundingBox, options);
    }
  }, [addressData, propLotSizeSqFt, calculateTieredEstimate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    setTranslateX(diffX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(translateX) > 50) {
      if (swipeRef.current) {
        const cardWidth = 320 + 16;
        const direction = translateX > 0 ? -1 : 1;
        swipeRef.current.scrollBy({
          left: direction * cardWidth,
          behavior: 'smooth'
        });
      }
    }
    setTranslateX(0);
  };

  if (propIsLoading !== undefined ? propIsLoading : isTieredLoading) {
    return (
      <>
        <PriceTiersContainer>
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i}>
              <div>Loading pricing options...</div>
            </LoadingCard>
          ))}
        </PriceTiersContainer>

        <SwipeContainer>
          <SwipeWrapper $translateX={0}>
            {[1, 2, 3].map((i) => (
              <LoadingCard key={i}>
                <div>Loading pricing options...</div>
              </LoadingCard>
            ))}
          </SwipeWrapper>
        </SwipeContainer>
      </>
    );
  }

  const tiers =
    propTiers || (tieredEstimate ? Object.values(tieredEstimate.tiers) : []);
  const lotSizeSqFt = propLotSizeSqFt || tieredEstimate?.lotSizeSqFt || 0;

  if (tiers.length === 0) {
    return null;
  }

  const handleTierClick = (
    tierType: 'curb_appeal' | 'full_lawn' | 'dream_lawn'
  ) => {
    if (onTierSelect) {
      onTierSelect(tierType);
    }
  };

  const renderTierCard = (tier: PriceTier) => {
    const details = tierDetails[tier.tier];
    const isSelected = selectedTier === tier.tier;

    return (
      <PriceTierCard
        key={tier.tier}
        $isSelected={isSelected}
        $isPopular={details.popular}
        onClick={() => handleTierClick(tier.tier)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTierClick(tier.tier);
          }
        }}
        aria-pressed={isSelected}
        aria-label={`Select ${details.title} pricing tier`}
      >
        {details.popular && <TierPopular>Most Popular</TierPopular>}
        <TierTitle>{details.title}</TierTitle>
        <TierPrice>
          ${tier.finalEstimate.toLocaleString()}
          {lotSizeSqFt && <TierRate> (${tier.rate}/sq ft)</TierRate>}
        </TierPrice>
        <TierDescription>{details.description}</TierDescription>
      </PriceTierCard>
    );
  };

  return (
    <>
      <PriceTiersContainer>{tiers.map(renderTierCard)}</PriceTiersContainer>
      <SwipeContainer>
        <SwipeWrapper
          ref={swipeRef}
          $translateX={translateX}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {tiers.map(renderTierCard)}
        </SwipeWrapper>
      </SwipeContainer>
    </>
  );
};

export default PriceTiers;
