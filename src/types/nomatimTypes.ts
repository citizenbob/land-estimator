// ./types/nominatimTypes.ts
export interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}
export interface GeocodeResult {
  label?: string;
  value: string;
  displayName: string;
  latitude: string;
  longitude: string;
}
