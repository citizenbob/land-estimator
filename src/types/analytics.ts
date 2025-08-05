import type { EstimateResult } from '@app-types/landscapeEstimatorTypes';
import type { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';

export interface AddressSelectedEvent {
  query: string;
  address_id: string;
  position_in_results: number;
}

export interface EstimateButtonClickedEvent {
  address_id: string;
}
export interface EstimateGeneratedEvent {
  address_id: string;
  full_address: string;
  region: string;
  latitude: number;
  longitude: number;

  lot_size_sqft: number;
  building_size_sqft: number;
  estimated_landscapable_area: number;
  property_type: string;

  affluence_score: number;
  owner_name?: string;

  selected_services: string[];
  design_fee: number;
  installation_cost: number;
  maintenance_monthly: number;
  estimate_min: number;
  estimate_max: number;
  estimate_range_size: number;

  price_per_sqft_min: number;
  price_per_sqft_max: number;
  is_commercial: boolean;
  has_custom_lot_size: boolean;

  lead_score?: number;
  market_segment?: 'budget' | 'mid-market' | 'premium' | 'luxury';
}

export interface EventMap {
  address_selected: AddressSelectedEvent;
  estimate_button_clicked: EstimateButtonClickedEvent;
  estimate_generated: EstimateGeneratedEvent;
}

export interface LogOptions {
  toMixpanel?: boolean;
  toFirestore?: boolean;
}

export interface BILoggingOptions {
  addressData: EnrichedAddressSuggestion;
  estimate: EstimateResult;
  selectedServices: string[];
  hasCustomLotSize: boolean;
}
