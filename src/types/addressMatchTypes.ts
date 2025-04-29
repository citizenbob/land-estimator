export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: string[];
  class: string;
  type: string;
  importance: number;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface AddressSuggestion {
  place_id: number;
  display_name: string;
}
export interface EnrichedAddressSuggestion extends AddressSuggestion {
  lat?: string | number;
  lon?: string | number;
  boundingbox?: string[];
  osm_type?: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: {
    city?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}
