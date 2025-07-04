import type {
  PropertyCalculations,
  PropertyOwner,
  RegionalLocation
} from './geographic';

export interface LocalAddressRecord extends RegionalLocation {
  id: string;
  full_address: string;
  calc: PropertyCalculations;
  owner: PropertyOwner;
  affluence_score: number;
  source_file: string;
  processed_date: string;
}

export interface AddressSuggestion {
  place_id: string;
  display_name: string;
}

export interface EnrichedAddressSuggestion
  extends AddressSuggestion,
    RegionalLocation {
  calc: PropertyCalculations;
  affluence_score: number;
}
