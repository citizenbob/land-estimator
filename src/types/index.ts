/**
 * Centralized type definitions for the Land Estimator application
 *
 * This file provides organized re-exports of all major types used throughout
 * the application, making imports cleaner and more discoverable.
 */

// Import FlexSearch type definitions
import './address-index.d.ts';

// Export all types from individual modules
export * from './localAddressTypes';
export * from './landscapeEstimatorTypes';
export * from './versionManifestTypes';
export * from './analytics';

// Export FlexSearch types explicitly
export type {
  FlexSearchIndexBundle,
  PrecomputedIndexData,
  StaticAddressManifest,
  AddressLookupData,
  AddressDocument
} from 'flexsearch';
