import { ParcelMetadata } from '@app-types/parcel-index';
import type { PriceBreakdown } from '@app-types/landscapeEstimatorTypes';
import {
  sumByProperty,
  sumMinMaxProperty,
  firstDefinedProperty
} from '@lib/arrayUtils';

type BoundingBox = [string, string, string, string];

const PRICING = {
  residential: {
    baseRate: { min: 4.5, max: 12 },
    complexMultiplier: 1.75,
    designRateHourly: { min: 70, max: 120 },
    designPercentOfInstall: 0.2,
    bundledDiscount: 0.5,
    maintenanceMonthly: { min: 100, max: 400 },
    minimumServiceFee: 400
  },
  commercialMultiplier: 0.85,
  affluence: {
    minMultiplier: 0.85,
    maxMultiplier: 1.25,
    baselineScore: 50
  }
};

export function calculateAffluenceMultiplier(affluenceScore: number): number {
  const { minMultiplier, maxMultiplier, baselineScore } = PRICING.affluence;

  const clampedScore = Math.max(0, Math.min(100, affluenceScore));

  if (clampedScore <= baselineScore) {
    const ratio = clampedScore / baselineScore;
    return minMultiplier + (1.0 - minMultiplier) * ratio;
  } else {
    const ratio = (clampedScore - baselineScore) / (100 - baselineScore);
    return 1.0 + (maxMultiplier - 1.0) * ratio;
  }
}

const earthRadiusFt = 20925524.9;

function calculateAreaFromBoundingBox(box: BoundingBox): number {
  const [latMin, latMax, lonMin, lonMax] = box.map(Number);

  const avgLatRad = ((latMin + latMax) / 2) * (Math.PI / 180);
  const latDiff = Math.abs(latMax - latMin) * (Math.PI / 180);
  const lonDiff = Math.abs(lonMax - lonMin) * (Math.PI / 180);

  const widthFt = earthRadiusFt * lonDiff * Math.cos(avgLatRad);
  const heightFt = earthRadiusFt * latDiff;

  return Math.abs(widthFt * heightFt);
}

function createBasePriceBreakdown(
  lotSizeSqFt: number,
  baseRate: { min: number; max: number },
  minimumServiceFee: number
): PriceBreakdown {
  return {
    lotSizeSqFt,
    baseRatePerSqFt: baseRate,
    designFee: 0,
    installationCost: 0,
    maintenanceMonthly: 0,
    subtotal: { min: 0, max: 0 },
    minimumServiceFee,
    finalEstimate: { min: 0, max: 0 }
  };
}

function calculateInstallationCost(
  lotSizeSqFt: number,
  baseRate: { min: number; max: number }
): { min: number; max: number } {
  return {
    min: lotSizeSqFt * baseRate.min,
    max: lotSizeSqFt * baseRate.max
  };
}

function applyMinimumServiceFee(
  estimate: { min: number; max: number },
  minimumServiceFee: number
): { min: number; max: number } {
  return {
    min: Math.max(estimate.min, minimumServiceFee),
    max: Math.max(estimate.max, minimumServiceFee)
  };
}

function calculateAverage(range: { min: number; max: number }): number {
  return (range.min + range.max) / 2;
}

function mergeBreakdowns(breakdowns: PriceBreakdown[]): PriceBreakdown {
  const first = breakdowns[0];
  const lotSizeSqFt =
    firstDefinedProperty(breakdowns, 'lotSizeSqFt') ?? first.lotSizeSqFt;
  const baseRatePerSqFt =
    firstDefinedProperty(breakdowns, 'baseRatePerSqFt') ??
    first.baseRatePerSqFt;
  const minimumServiceFee =
    firstDefinedProperty(breakdowns, 'minimumServiceFee') ??
    first.minimumServiceFee;

  const designFee = sumByProperty(breakdowns, 'designFee');
  const installationCost = sumByProperty(breakdowns, 'installationCost');
  const maintenanceMonthly = sumByProperty(breakdowns, 'maintenanceMonthly');

  const mergedSubtotal = sumMinMaxProperty(breakdowns, 'subtotal');

  const finalEstimate = applyMinimumServiceFee(
    mergedSubtotal,
    minimumServiceFee
  );

  return {
    lotSizeSqFt,
    baseRatePerSqFt,
    designFee,
    installationCost,
    maintenanceMonthly,
    subtotal: mergedSubtotal,
    minimumServiceFee,
    finalEstimate
  };
}

function computeSingleService(
  boundingBox: BoundingBox,
  type: 'design' | 'installation' | 'maintenance',
  options?: {
    isCommercial?: boolean;
    overrideLotSizeSqFt?: number;
    affluenceScore?: number;
  }
): PriceBreakdown {
  const {
    isCommercial = false,
    overrideLotSizeSqFt,
    affluenceScore = 50
  } = options || {};
  const config = PRICING.residential;
  const lotSizeSqFt =
    overrideLotSizeSqFt || calculateAreaFromBoundingBox(boundingBox);

  const commercialMultiplier = isCommercial ? PRICING.commercialMultiplier : 1;
  const affluenceMultiplier = calculateAffluenceMultiplier(affluenceScore);
  const combinedMultiplier = commercialMultiplier * affluenceMultiplier;

  const baseRate = {
    min: config.baseRate.min * combinedMultiplier,
    max: config.baseRate.max * combinedMultiplier
  };
  const breakdown = createBasePriceBreakdown(
    lotSizeSqFt,
    baseRate,
    config.minimumServiceFee
  );
  const installCosts = calculateInstallationCost(lotSizeSqFt, baseRate);
  const designFees = {
    min: installCosts.min * config.designPercentOfInstall,
    max: installCosts.max * config.designPercentOfInstall
  };

  switch (type) {
    case 'design': {
      const adjusted = applyMinimumServiceFee(
        designFees,
        config.minimumServiceFee
      );
      return {
        ...breakdown,
        designFee: calculateAverage(adjusted),
        subtotal: adjusted,
        finalEstimate: adjusted
      };
    }
    case 'installation': {
      const adjusted = applyMinimumServiceFee(
        installCosts,
        config.minimumServiceFee
      );
      return {
        ...breakdown,
        installationCost: calculateAverage(installCosts),
        subtotal: adjusted,
        finalEstimate: adjusted
      };
    }
    case 'maintenance': {
      const maintenanceCost = {
        min: config.maintenanceMonthly.min,
        max: config.maintenanceMonthly.max
      };
      return {
        ...breakdown,
        maintenanceMonthly: calculateAverage(maintenanceCost),
        subtotal: maintenanceCost,
        finalEstimate: maintenanceCost
      };
    }
  }
}

const DEFAULT_SERVICES: Array<'design' | 'installation'> = [
  'design',
  'installation'
];

export function estimateLandscapingPrice(
  boundingBox: BoundingBox,
  options?: {
    isCommercial?: boolean;
    serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;
    overrideLotSizeSqFt?: number;
    affluenceScore?: number;
  }
): PriceBreakdown {
  const types: Array<'design' | 'installation' | 'maintenance'> =
    options?.serviceTypes && options.serviceTypes.length > 0
      ? options.serviceTypes
      : DEFAULT_SERVICES;
  const breakdowns = types.map((t) =>
    computeSingleService(boundingBox, t, options)
  );
  return mergeBreakdowns(breakdowns);
}

export function estimateLandscapingPriceFromParcel(
  parcelData: ParcelMetadata,
  options?: {
    isCommercial?: boolean;
    serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;
  }
): PriceBreakdown {
  const landscapableAreaSqFt = parcelData.calc.estimated_landscapable_area;

  const isCommercial =
    options?.isCommercial ?? parcelData.calc.property_type === 'commercial';

  const dummyBoundingBox: BoundingBox = ['0', '0', '0', '0'];

  return estimateLandscapingPrice(dummyBoundingBox, {
    ...options,
    isCommercial,
    overrideLotSizeSqFt: landscapableAreaSqFt
  });
}
