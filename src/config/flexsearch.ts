/**
 * Centralized FlexSearch Configuration
 *
 * This file contains all FlexSearch-related configurations used throughout the application
 * to ensure consistency and avoid duplication.
 */

/**
 * FlexSearch index configuration optimized for fast address searching
 * These settings match the build configuration for optimal performance
 */
export const FLEXSEARCH_CONFIG = {
  tokenize: 'forward' as const,
  cache: 100,
  resolution: 9,
  threshold: 1,
  depth: 1,
  bidirectional: false,
  suggest: false
} as const;

/**
 * Default search options for FlexSearch queries
 */
export const FLEXSEARCH_SEARCH_OPTIONS = {
  bool: 'and' as const,
  limit: 10
} as const;

/**
 * Creates search options with custom parameters while preserving defaults
 */
export function createSearchOptions(
  overrides: {
    bool?: 'and' | 'or';
    limit?: number;
    offset?: number;
  } = {}
) {
  return {
    ...FLEXSEARCH_SEARCH_OPTIONS,
    ...overrides
  };
}

/**
 * Default limit for address search results
 */
export const DEFAULT_SEARCH_LIMIT = 10;
