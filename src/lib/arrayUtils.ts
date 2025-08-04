/**
 * @fileoverview Utility functions for common array operations and reductions
 */

/**
 * Utility functions for array manipulation and filtering
 */

import { filterExactMatches } from '@lib/addressTransforms';

// Re-export for backward compatibility
export { filterExactMatches };
export function sumByProperty<T>(items: T[], property: keyof T): number {
  return items.reduce((sum, item) => {
    const value = item[property];
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

/**
 * Sums min/max range values from an array of objects
 *
 * @param items - Array of objects containing min/max properties
 * @param property - Property name that contains the min/max object
 * @returns Object with summed min and max values
 */
export function sumMinMaxProperty<T>(
  items: T[],
  property: keyof T
): { min: number; max: number } {
  const min = items.reduce((sum, item) => {
    const value = item[property];
    if (value && typeof value === 'object' && 'min' in value) {
      return sum + (typeof value.min === 'number' ? value.min : 0);
    }
    return sum;
  }, 0);

  const max = items.reduce((sum, item) => {
    const value = item[property];
    if (value && typeof value === 'object' && 'max' in value) {
      return sum + (typeof value.max === 'number' ? value.max : 0);
    }
    return sum;
  }, 0);

  return { min, max };
}

/**
 * Finds the first non-null/undefined value of a property in an array
 *
 * @param items - Array of objects to search
 * @param property - Property name to find
 * @returns First non-null/undefined value found
 */
export function firstDefinedProperty<T, K extends keyof T>(
  items: T[],
  property: K
): T[K] | undefined {
  for (const item of items) {
    const value = item[property];
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return undefined;
}

/**
 * Groups an array of items by a given property value
 *
 * @param items - Array of items to group
 * @param property - Property to group by
 * @returns Map with grouped items
 */
export function groupBy<T, K extends keyof T>(
  items: T[],
  property: K
): Map<T[K], T[]> {
  const groups = new Map<T[K], T[]>();

  for (const item of items) {
    const key = item[property];
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  return groups;
}

/**
 * Removes duplicate items from an array based on a property value
 *
 * @param items - Array of items to deduplicate
 * @param property - Property to use for uniqueness check
 * @returns Array with duplicates removed
 */
export function uniqueByProperty<T, K extends keyof T>(
  items: T[],
  property: K
): T[] {
  const seen = new Set<T[K]>();
  return items.filter((item) => {
    const value = item[property];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Deduplicates suggestions by display name, keeping the first occurrence
 *
 * @param suggestions - Array of address suggestions to deduplicate
 * @returns Array with duplicates removed
 */
export function deduplicateSuggestions<T extends { display_name: string }>(
  suggestions: T[]
): T[] {
  return uniqueByProperty(suggestions, 'display_name');
}
