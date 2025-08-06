/**
 * Formats a number as currency (USD)
 *
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  options: {
    includeSymbol?: boolean;
    decimalPlaces?: number;
  } = {}
): string {
  const { includeSymbol = true, decimalPlaces = 2 } = options;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount);

  return includeSymbol ? formatted : formatted.replace('$', '');
}

/**
 * Formats a number with locale-specific thousands separators
 *
 * @param value - The number to format
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted number string with thousands separators
 */
export function formatNumber(
  value: number | undefined | null,
  locale: string = 'en-US'
): string {
  if (value === undefined || value === null) return '';
  return value.toLocaleString(locale);
}

/**
 * Formats square footage with appropriate units
 *
 * @param sqFt - Square footage value
 * @returns Formatted string with units
 */
export function formatSquareFeet(sqFt: number | undefined | null): string {
  if (sqFt === undefined || sqFt === null) return '';
  return `${formatNumber(sqFt)} sq ft`;
}

/**
 * Formats a price range
 *
 * @param range - Object with min and max values
 * @returns Formatted price range string
 */
export function formatPriceRange(range: { min: number; max: number }): string {
  return `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`;
}

/**
 * Formats monthly pricing
 *
 * @param amount - Monthly amount
 * @returns Formatted monthly price string
 */
export function formatMonthlyPrice(amount: number): string {
  return `${formatCurrency(amount)} / month`;
}

/**
 * Formats file size in megabytes
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string in MB
 */
export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
