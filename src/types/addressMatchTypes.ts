export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category?: string;
  type?: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: string[];
}

export interface AddressSuggestion {
  place_id: number;
  display_name: string;
}

// Extended suggestion that may contain partial geographic data
export interface EnrichedAddressSuggestion extends AddressSuggestion {
  lat?: string | number;
  lon?: string | number;
  boundingbox?: string[];
  place_id: number;
}
