export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

export function isNumericString(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function hasValidCalcData(addressData: {
  calc?: {
    estimated_landscapable_area?: number;
    landarea?: number;
    building_sqft?: number;
  };
}): boolean {
  return !!(
    addressData.calc?.estimated_landscapable_area &&
    addressData.calc.estimated_landscapable_area > 0
  );
}

export function areValidCoordinates(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function isValidServiceTypes(
  services: unknown
): services is Array<'design' | 'installation' | 'maintenance'> {
  if (!Array.isArray(services)) return false;

  const validServices = ['design', 'installation', 'maintenance'];
  return services.every(
    (service) => typeof service === 'string' && validServices.includes(service)
  );
}

export function isValidBoundingBox(
  box: unknown
): box is [string, string, string, string] {
  if (!Array.isArray(box) || box.length !== 4) return false;

  return box.every(
    (coord) => typeof coord === 'string' && !isNaN(Number(coord))
  );
}
