export interface LandscapeEstimatorOptions {
  isCommercial?: boolean;
  serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;
  overrideLotSizeSqFt?: number;
}

export type EstimatorStatus = 'idle' | 'calculating' | 'complete' | 'error';

export type ServiceType = 'design' | 'installation' | 'maintenance';

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
