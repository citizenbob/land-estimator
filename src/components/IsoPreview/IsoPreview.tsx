'use client';

import React, { useState, useEffect } from 'react';
import {
  IsoPreviewContainer,
  SvgCanvas,
  SvgLayer,
  SvgLayerContainer
} from './IsoPreview.styles';

export type TierType = 'curb_appeal' | 'full_lawn' | 'dream_lawn';

interface IsoPreviewProps {
  activeTier?: TierType | null;
  useIntersectionObserver?: boolean;
  onTierInView?: (tier: TierType) => void;
  animationDuration?: number;
}

const tierSvgMap: Record<TierType, string> = {
  curb_appeal: '/calculator/curb_appeal.svg',
  full_lawn: '/calculator/full_landscape.svg',
  dream_lawn: '/calculator/dream_yards.svg'
};

const tierHierarchy: TierType[] = ['curb_appeal', 'full_lawn', 'dream_lawn'];

const layerZIndex = {
  empty_lot: 100,
  curb_appeal: 140,
  full_landscape: 150,
  dream_yards: 105,
  house: 130
};

const baseLayers = ['/calculator/empty_lot.svg', '/calculator/house.svg'];

export default function IsoPreview({
  activeTier,
  useIntersectionObserver = false,
  onTierInView,
  animationDuration = 600
}: IsoPreviewProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [currentTier, setCurrentTier] = useState<TierType | null>(
    activeTier || null
  );

  useEffect(() => {
    setCurrentTier(activeTier || null);
  }, [activeTier]);

  useEffect(() => {
    const allImages = [...baseLayers, ...Object.values(tierSvgMap)];

    const loadImage = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages((prev) => new Set(prev).add(src));
          resolve();
        };
        img.onerror = reject;
        img.src = src;
      });
    };

    Promise.all(allImages.map(loadImage)).catch((error) => {
      console.warn('Failed to preload some SVG images:', error);
    });
  }, []);

  useEffect(() => {
    if (!useIntersectionObserver || !onTierInView) return;

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    if (!mediaQuery.matches) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      if (!window.matchMedia('(max-width: 1023px)').matches) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const tierElement = entry.target as HTMLElement;
          const tier = tierElement.dataset.tier as TierType;
          if (tier && tier !== currentTier) {
            setCurrentTier(tier);
            onTierInView(tier);
          }
        }
      });
    }, observerOptions);

    // Only observe elements within the mobile pricing tiers container
    const tierElements = document.querySelectorAll(
      '.mobile-pricing-tiers [data-tier]'
    );
    tierElements.forEach((element) => observer.observe(element));

    return () => {
      tierElements.forEach((element) => observer.unobserve(element));
    };
  }, [useIntersectionObserver, onTierInView, currentTier]);

  const isImageLoaded = (src: string) => loadedImages.has(src);

  const getActiveTierLayers = (): TierType[] => {
    if (!currentTier) return [];

    const currentTierIndex = tierHierarchy.indexOf(currentTier);
    return tierHierarchy.slice(0, currentTierIndex + 1);
  };

  const activeTierLayers = getActiveTierLayers();

  return (
    <IsoPreviewContainer>
      <SvgCanvas>
        <SvgLayerContainer>
          <SvgLayer
            key="empty-lot"
            src="/calculator/empty_lot.svg"
            alt="Empty lot"
            $isVisible={isImageLoaded('/calculator/empty_lot.svg')}
            $animationDelay={0}
            $animationDuration={animationDuration}
            $zIndex={layerZIndex.empty_lot}
          />

          {activeTierLayers.includes('dream_lawn') && (
            <SvgLayer
              key="dream-yards"
              src={tierSvgMap.dream_lawn}
              alt="Dream yards landscape"
              $isVisible={isImageLoaded(tierSvgMap.dream_lawn)}
              $animationDelay={300}
              $animationDuration={animationDuration}
              $zIndex={layerZIndex.dream_yards}
            />
          )}

          {activeTierLayers.includes('curb_appeal') && (
            <SvgLayer
              key="curb-appeal"
              src={tierSvgMap.curb_appeal}
              alt="Curb appeal landscape"
              $isVisible={isImageLoaded(tierSvgMap.curb_appeal)}
              $animationDelay={200}
              $animationDuration={animationDuration}
              $zIndex={layerZIndex.curb_appeal}
            />
          )}

          {activeTierLayers.includes('full_lawn') && (
            <SvgLayer
              key="full-landscape"
              src={tierSvgMap.full_lawn}
              alt="Full lawn landscape"
              $isVisible={isImageLoaded(tierSvgMap.full_lawn)}
              $animationDelay={250}
              $animationDuration={animationDuration}
              $zIndex={layerZIndex.full_landscape}
            />
          )}

          <SvgLayer
            key="house"
            src="/calculator/house.svg"
            alt="House"
            $isVisible={isImageLoaded('/calculator/house.svg')}
            $animationDelay={100}
            $animationDuration={animationDuration}
            $zIndex={layerZIndex.house}
          />
        </SvgLayerContainer>
      </SvgCanvas>
    </IsoPreviewContainer>
  );
}
