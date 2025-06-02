/**
 * Type definitions for analytics events used throughout the application
 *
 * This file contains all type definitions for the type-safe analytics system.
 * It provides compile-time validation of event data, ensuring consistency
 * across the application. Events are organized into functional categories
 * like address search events, UI interaction events, and system events.
 *
 * Usage example:
 * ```
 * import { logEvent } from '@services/logger';
 * import { ButtonClickEvent } from '@typez/analytics';
 *
 * const event: ButtonClickEvent = { button_id: 'submit_form' };
 * logEvent('button_clicked', event);
 * ```
 */

/**
 * Base interface that all analytics events extend
 * Provides common properties like timestamp
 */
export interface BaseAnalyticsEvent {
  /** Unix timestamp in milliseconds when the event occurred */
  timestamp?: number;
}

/**
 * Address search related analytics events
 * These events track the performance and behavior of the address search system
 */

/**
 * Event logged when a search shard is found in the cache
 * Helps track cache hit rates and optimize performance
 */
export interface AddressSearchCacheHit extends BaseAnalyticsEvent {
  /** The identifier for the search shard that was found in cache */
  shard: string;
}

/**
 * Event logged when a new search shard is loaded from disk
 * Useful for monitoring system performance and data access patterns
 */
export interface AddressSearchShardLoaded extends BaseAnalyticsEvent {
  /** The identifier for the search shard that was loaded */
  shard: string;
  /** Number of records contained in the shard */
  recordCount: number;
  /** Time taken to load the shard in milliseconds */
  load_time_ms?: number;
}

/**
 * Event logged when shard loading fails
 * Critical for error monitoring and data integrity verification
 */
export interface AddressSearchShardLoadError extends BaseAnalyticsEvent {
  /** The identifier for the search shard that failed to load */
  shard: string;
  /** Description of the error that occurred */
  error: string;
}

/**
 * Event logged when an address search is executed
 * Tracks search patterns and result quality
 */
export interface AddressSearchSearchPerformed extends BaseAnalyticsEvent {
  /** The identifier for the search shard that was searched */
  shard: string;
  /** The search query entered by the user */
  query: string;
  /** Number of results returned by the search */
  resultCount: number;
  /** Time taken to perform the search in milliseconds */
  search_time_ms?: number;
  /** Optional session identifier for tracking user journeys */
  session_id?: string;
}

export interface AddressSearchSearchError extends BaseAnalyticsEvent {
  shard: string;
  query: string;
  error: string;
  session_id?: string;
}

/**
 * UI interaction related analytics events
 */
export interface AddressSelectedEvent extends BaseAnalyticsEvent {
  query: string;
  address_id: string;
  position_in_results?: number;
}

export interface EstimateButtonClickedEvent extends BaseAnalyticsEvent {
  address_id: string;
}

export interface ServiceTypeSelectedEvent extends BaseAnalyticsEvent {
  service_type: string;
}

export interface ButtonClickEvent extends BaseAnalyticsEvent {
  button_id: string;
  button_text?: string;
  page_section?: string;
}

export interface FormSubmissionEvent extends BaseAnalyticsEvent {
  form_id: string;
  form_valid: boolean;
  errors?: string[];
}

/**
 * System and performance related analytics events
 */
export interface ApiRequestEvent extends BaseAnalyticsEvent {
  endpoint: string;
  status_code: number;
  response_time_ms: number;
  error?: string;
}

export interface AppErrorEvent extends BaseAnalyticsEvent {
  error_message: string;
  error_type: string;
  component?: string;
}

export interface PageViewEvent extends BaseAnalyticsEvent {
  page_path: string;
  page_title?: string;
  referrer?: string;
}

/** Type representing all possible event data types */
export type EventData =
  | AddressSearchCacheHit
  | AddressSearchShardLoaded
  | AddressSearchShardLoadError
  | AddressSearchSearchPerformed
  | AddressSearchSearchError
  | AddressSelectedEvent
  | EstimateButtonClickedEvent
  | ServiceTypeSelectedEvent
  | ButtonClickEvent
  | FormSubmissionEvent
  | ApiRequestEvent
  | AppErrorEvent
  | PageViewEvent;

/** Map event names to their corresponding typed data structures */
export interface EventMap {
  // Address Search Events
  cache_hit: AddressSearchCacheHit;
  shard_loaded: AddressSearchShardLoaded;
  shard_load_error: AddressSearchShardLoadError;
  search_performed: AddressSearchSearchPerformed;
  search_error: AddressSearchSearchError;

  // UI Events
  address_selected: AddressSelectedEvent;
  estimate_button_clicked: EstimateButtonClickedEvent;
  service_type_selected: ServiceTypeSelectedEvent;
  button_clicked: ButtonClickEvent;
  form_submitted: FormSubmissionEvent;

  // System Events
  api_request: ApiRequestEvent;
  app_error: AppErrorEvent;
  page_view: PageViewEvent;

  // Allow string indexing for custom events
  [key: string]: EventData;
}

export interface LogOptions {
  toMixpanel?: boolean;
  toFirestore?: boolean;
}
