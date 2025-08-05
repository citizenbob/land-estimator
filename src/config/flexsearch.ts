import { FlexSearchConfig, FlexSearchOptions } from '@app-types/configTypes';
export const FLEXSEARCH_CONFIG: FlexSearchConfig = {
  tokenize: 'forward',
  cache: 100,
  resolution: 9,
  threshold: 1,
  depth: 1,
  bidirectional: false,
  suggest: false
};

export const FLEXSEARCH_SEARCH_OPTIONS: FlexSearchOptions = {
  bool: 'and',
  limit: 5
};

export function createSearchOptions(
  overrides: Partial<FlexSearchOptions> = {}
): FlexSearchOptions {
  return {
    ...FLEXSEARCH_SEARCH_OPTIONS,
    ...overrides
  };
}

export const DEFAULT_SEARCH_LIMIT = 5;
