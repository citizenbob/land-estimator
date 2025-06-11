export interface LocalAddressRecord {
  id: string;
  full_address: string;
  region: string;
  latitude: number;
  longitude: number;
  calc: {
    landarea: number;
    building_sqft: number;
    estimated_landscapable_area: number;
    property_type: string;
  };
  owner: {
    name: string;
  };
  affluence_score: number;
  source_file: string;
  processed_date: string;
}

export interface AddressSuggestion {
  place_id: string;
  display_name: string;
}

export interface EnrichedAddressSuggestion extends AddressSuggestion {
  latitude: number;
  longitude: number;
  region: string;
  calc: {
    landarea: number;
    building_sqft: number;
    estimated_landscapable_area: number;
    property_type: string;
  };
  affluence_score: number;
}
