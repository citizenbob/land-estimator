import {
  formatCurrency,
  formatSquareFeet,
  formatPriceRange,
  formatMonthlyPrice
} from '@lib/formatUtils';
import type {
  EstimateDisplay,
  ServiceType,
  EstimateLineItemData
} from '@app-types/landscapeEstimatorTypes';
import { ServiceConfig } from '@app-types/configTypes';

export const DEFAULT_SERVICES: ServiceType[] = ['design', 'installation'];

export const SERVICE_CONFIG: readonly ServiceConfig[] = [
  { value: 'design', label: 'Design' },
  { value: 'installation', label: 'Installation' },
  { value: 'maintenance', label: 'Maintenance' }
] as const;

export function generateEstimateLineItems(
  estimate: EstimateDisplay,
  selectedServices: ServiceType[]
): EstimateLineItemData[] {
  const items: EstimateLineItemData[] = [];

  if (estimate.lotSizeSqFt && estimate.lotSizeSqFt > 0) {
    items.push({
      key: 'lotSize',
      label: 'Lot Size',
      value: formatSquareFeet(estimate.lotSizeSqFt),
      show: true
    });
  }

  if (selectedServices.includes('design')) {
    items.push({
      key: 'design',
      label: 'Design',
      value: formatCurrency(estimate.designFee),
      show: true
    });
  }

  if (selectedServices.includes('installation')) {
    items.push({
      key: 'installation',
      label: 'Installation',
      value: formatCurrency(estimate.installationCost),
      show: true
    });
  }

  if (selectedServices.includes('maintenance')) {
    items.push({
      key: 'maintenance',
      label: 'Maintenance',
      value: formatMonthlyPrice(estimate.maintenanceMonthly),
      show: true
    });
  }

  items.push({
    key: 'total',
    label: 'Total Estimate',
    value: formatPriceRange(estimate.finalEstimate),
    show: true,
    isTotal: true
  });

  return items;
}

export function getEstimateSummary(estimate: EstimateDisplay) {
  const { finalEstimate } = estimate;
  const average = (finalEstimate.min + finalEstimate.max) / 2;
  const range = finalEstimate.max - finalEstimate.min;
  const rangePercentage = (range / average) * 100;

  return {
    min: finalEstimate.min,
    max: finalEstimate.max,
    average,
    range,
    rangePercentage: Math.round(rangePercentage)
  };
}

export function isValidEstimate(
  estimate: unknown
): estimate is EstimateDisplay {
  if (!estimate || typeof estimate !== 'object') return false;

  const est = estimate as Partial<EstimateDisplay>;

  return !!(
    typeof est.designFee === 'number' &&
    typeof est.installationCost === 'number' &&
    typeof est.maintenanceMonthly === 'number' &&
    est.finalEstimate &&
    typeof est.finalEstimate.min === 'number' &&
    typeof est.finalEstimate.max === 'number' &&
    est.finalEstimate.min <= est.finalEstimate.max
  );
}
