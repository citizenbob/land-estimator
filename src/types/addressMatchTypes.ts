// ./types/nominatimTypes.ts
export interface NominatimResponse {
  latitude: string;
  longitude: string;
  display_name: string;
}
export interface GeocodeResult {
  label?: string;
  value: string;
  displayName: string;
  latitude: string;
  longitude: string;
}

export type Suggestion = {
  label?: string;
  value: string;
  displayName: string;
  latitude: string;
  longitude: string;
};
