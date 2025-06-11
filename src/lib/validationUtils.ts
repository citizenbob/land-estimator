/**
 * Common validation utilities used across the application
 */

/**
 * Validates that a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that a value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Validates that a value is a valid numeric string
 */
export function isNumericString(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/**
 * Validates that address data has required calculation fields
 */
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

/**
 * Validates coordinate values
 */
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

/**
 * Sanitizes numeric input by removing non-numeric characters
 */
export function sanitizeNumericInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/**
 * Validates service type arrays
 */
export function isValidServiceTypes(
  services: unknown
): services is Array<'design' | 'installation' | 'maintenance'> {
  if (!Array.isArray(services)) return false;

  const validServices = ['design', 'installation', 'maintenance'];
  return services.every(
    (service) => typeof service === 'string' && validServices.includes(service)
  );
}

/**
 * Validates bounding box format
 */
export function isValidBoundingBox(
  box: unknown
): box is [string, string, string, string] {
  if (!Array.isArray(box) || box.length !== 4) return false;

  return box.every(
    (coord) => typeof coord === 'string' && !isNaN(Number(coord))
  );
}
