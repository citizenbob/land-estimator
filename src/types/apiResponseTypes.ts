import { ApiError } from '@app-types/errorTypes';
import { ParcelMetadata } from '@app-types/parcel-index';

export interface BaseApiResponse {
  timestamp?: string;
}

export interface SuccessResponse<T = unknown> extends BaseApiResponse {
  success: true;
  data?: T;
}

export interface ErrorResponse extends BaseApiResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

export interface LogEventRequest {
  eventName: string;
  data: Record<string, unknown>;
}

export interface LogEventResponse extends SuccessResponse<void> {
  success: true;
}

export interface ParcelMetadataResponse
  extends SuccessResponse<ParcelMetadata> {
  success: true;
  data: ParcelMetadata;
}

export interface ValidationErrorResponse extends ErrorResponse {
  error: ApiError & {
    code: 'MISSING_PARCEL_ID' | 'INVALID_PARCEL_ID' | 'VALIDATION_ERROR';
  };
}

export interface NotFoundErrorResponse extends ErrorResponse {
  error: ApiError & {
    code: 'PARCEL_NOT_FOUND' | 'RESOURCE_NOT_FOUND';
    status: 404;
  };
}

export interface ServerErrorResponse extends ErrorResponse {
  error: ApiError & {
    code:
      | 'INTERNAL_SERVER_ERROR'
      | 'FIRESTORE_LOG_ERROR'
      | 'PARCEL_FETCH_ERROR';
    status: 500;
  };
}

export interface NetworkErrorResponse extends ErrorResponse {
  error: ApiError & {
    code: 'NETWORK_ERROR' | 'FETCH_FAILED' | 'TIMEOUT_ERROR';
    details?: {
      url?: string;
      method?: string;
      status?: number;
      statusText?: string;
    };
  };
}

export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchResponse<T> extends SuccessResponse<T[]> {
  query: string;
  resultsCount: number;
  executionTime?: number;
}

export interface StatusResponse extends BaseApiResponse {
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
  uptime?: number;
  dependencies?: Record<string, 'healthy' | 'degraded' | 'down'>;
}
