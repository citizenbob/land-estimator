'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import AddressInput from '@components/AddressInput/AddressInput';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import { EstimateCalculator } from '@components/EstimateCalculator/EstimateCalculator';
import { PriceTiers } from '@components/PriceTiers/PriceTiers';
import IsoPreview from '@components/IsoPreview/IsoPreview';
import Icon from '@components/Icon/Icon';
import { useKeyboardNavigation } from '@hooks/useKeyboardNavigation';
import { useElementRefs } from '@hooks/useElementRefs';

export default function Home() {
  const [addressData, setAddressData] =
    useState<EnrichedAddressSuggestion | null>(null);
  const [selectedTier, setSelectedTier] = useState<
    'curb_appeal' | 'full_lawn' | 'dream_lawn'
  >('full_lawn');
  const [adjustedAreaSqFt, setAdjustedAreaSqFt] = useState<number | null>(null);

  const tierOrder: Array<'curb_appeal' | 'full_lawn' | 'dream_lawn'> = useMemo(
    () => ['curb_appeal', 'full_lawn', 'dream_lawn'],
    []
  );
  const tierContainerRef = useRef<HTMLDivElement>(null);
  const { elementRefs } = useElementRefs<HTMLDivElement>(tierOrder.length);

  const handleTierSelect = (index: number) => {
    setSelectedTier(tierOrder[index]);
  };

  const { handleTriggerKeyDown, handleElementKeyDown } = useKeyboardNavigation(
    tierContainerRef,
    handleTierSelect,
    () => elementRefs
  );

  // Touch/swipe navigation
  const handleSwipeNavigation = useCallback(
    (direction: 'left' | 'right') => {
      const currentIndex = tierOrder.indexOf(selectedTier);
      let newIndex: number;

      if (direction === 'left') {
        newIndex = Math.min(currentIndex + 1, tierOrder.length - 1);
      } else {
        newIndex = Math.max(currentIndex - 1, 0);
      }

      if (newIndex !== currentIndex) {
        setSelectedTier(tierOrder[newIndex]);
      }
    },
    [selectedTier, tierOrder]
  );

  const handleAddressSelect = (address: EnrichedAddressSuggestion | null) => {
    setAddressData(address);
    setAdjustedAreaSqFt(null);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col p-4 pb-4 gap-6 sm:p-8 lg:p-0 font-[family-name:var(--font-geist-sans)]">
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {addressData && (
          <div
            className="w-full"
            ref={tierContainerRef}
            tabIndex={0}
            onKeyDown={handleTriggerKeyDown}
          >
            <div className="block lg:hidden lg:mb-8">
              <IsoPreview
                activeTier={selectedTier}
                useIntersectionObserver={true}
                onTierInView={setSelectedTier}
              />
              <p className="text-xs text-gray-500 text-center mt-3 font-medium">
                Swipe for preview
              </p>
            </div>

            <div className="hidden lg:flex lg:flex-col lg:gap-8 lg:items-center">
              <div className="lg:w-full lg:max-w-2xl">
                <IsoPreview
                  activeTier={selectedTier}
                  useIntersectionObserver={false}
                />
                <p className="text-xs text-gray-500 text-center mt-3 font-medium">
                  Click a plan below for preview
                </p>
              </div>
              <div className="lg:w-full lg:max-w-4xl">
                <PriceTiers
                  addressData={addressData}
                  selectedTier={selectedTier}
                  onTierSelect={setSelectedTier}
                  lotSizeSqFt={adjustedAreaSqFt ?? undefined}
                  elementRefs={elementRefs}
                  onElementKeyDown={handleElementKeyDown}
                  onSwipe={handleSwipeNavigation}
                />
              </div>
            </div>

            <div className="block lg:hidden mobile-pricing-tiers">
              <PriceTiers
                addressData={addressData}
                selectedTier={selectedTier}
                onTierSelect={setSelectedTier}
                lotSizeSqFt={adjustedAreaSqFt ?? undefined}
                elementRefs={elementRefs}
                onElementKeyDown={handleElementKeyDown}
                onSwipe={handleSwipeNavigation}
              />
            </div>
          </div>
        )}
        <div className="w-full max-w-2xl flex flex-col gap-8 items-center sm:items-start">
          <AddressInput onAddressSelect={handleAddressSelect} />
          {addressData && (
            <EstimateCalculator
              addressData={addressData}
              onAreaChange={setAdjustedAreaSqFt}
            />
          )}
        </div>
      </div>

      <footer className="w-full border-t border-gray-200 mt-12 pt-6 pb-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="leaf" width={18} height={18} />
                <span className="font-semibold text-sm">Land Estimator</span>
              </div>
              <p className="text-xs text-gray-600 text-center md:text-left">
                Hand-crafted in Phoenix, Arizona with &hearts; by{' '}
                <a
                  href="https://goodcitizens.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:underline-offset-4"
                >
                  Good Citizens Corporation
                </a>
              </p>
            </div>

            <div className="flex gap-6 flex-wrap items-center justify-center">
              <a
                className="flex items-center gap-2 text-sm hover:underline hover:underline-offset-4"
                href="https://github.com/users/citizenbob/projects/3"
                target="_blank"
                rel="noopener noreferrer"
              >
                An Hypothesis-Driven Solution
              </a>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-6">
            &copy; {currentYear} Good Citizens Corporation. All rights reserved.
            <br />
            <span className="text-gray-400">
              Licensed under Business Source License 1.1 (BUSL-1.1) ·
              Enterprise-grade solutions for small businesses and startups
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
