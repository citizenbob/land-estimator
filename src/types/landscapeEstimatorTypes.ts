import { EnrichedAddressSuggestion } from './localAddressTypes';

export interface LandscapeEstimatorOptions {
  isCommercial?: boolean;
  serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;
  serviceType?:
    | 'design'
    | 'installation'
    | 'design_installation'
    | 'maintenance';
  overrideLotSizeSqFt?: number;
}

export type EstimatorStatus = 'idle' | 'calculating' | 'complete' | 'error';

export interface EstimateResult {
  address: {
    display_name: string;
    lat: number;
    lon: number;
  };
  lotSizeSqFt: number;
  baseRatePerSqFt: { min: number; max: number };
  designFee: number;
  installationCost: number;
  maintenanceMonthly: number;
  subtotal: { min: number; max: number };
  minimumServiceFee: number;
  finalEstimate: { min: number; max: number };
}

export type ServiceType = 'design' | 'installation' | 'maintenance';

export type PriceTierType = 'curb_appeal' | 'full_lawn' | 'dream_lawn';

export interface PriceTier {
  tier: PriceTierType;
  rate: number;
  designFee: number;
  installationCost: number;
  maintenanceMonthly: number;
  finalEstimate: number;
}

export interface TieredEstimateResult {
  address: {
    display_name: string;
    lat: number;
    lon: number;
  };
  lotSizeSqFt: number;
  minimumServiceFee: number;
  tiers: {
    curb_appeal: PriceTier;
    full_lawn: PriceTier;
    dream_lawn: PriceTier;
  };
}

export interface PriceTiersProps {
  addressData?: EnrichedAddressSuggestion;
  selectedTier?: PriceTierType;
  onTierSelect?: (tier: PriceTierType) => void;
  tiers?: PriceTier[];
  lotSizeSqFt?: number;
  isLoading?: boolean;
  elementRefs?: React.RefObject<HTMLDivElement>[];
  onElementKeyDown?: (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  onSwipe?: (direction: 'left' | 'right') => void;
}

export interface EstimateDisplay {
  lotSizeSqFt?: number;
  designFee: number;
  installationCost: number;
  maintenanceMonthly: number;
  finalEstimate: { min: number; max: number };
}

export interface EstimateLineItemData {
  key: string;
  label: string;
  value: string;
  show: boolean;
  isTotal?: boolean;
}

export interface EstimateResult {
  address: {
    display_name: string;
    lat: number;
    lon: number;
  };
  lotSizeSqFt: number;
  baseRatePerSqFt: { min: number; max: number };
  designFee: number;
  installationCost: number;
  maintenanceMonthly: number;
  subtotal: { min: number; max: number };
  minimumServiceFee: number;
  finalEstimate: { min: number; max: number };
}

export interface PriceBreakdown {
  lotSizeSqFt: number;
  baseRatePerSqFt: { min: number; max: number };
  designFee: number;
  installationCost: number;
  maintenanceMonthly: number;
  subtotal: { min: number; max: number };
  minimumServiceFee: number;
  finalEstimate: { min: number; max: number };
}
