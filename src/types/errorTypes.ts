import type { ErrorInfo } from 'react';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggedError {
  message: string;
  context?: ErrorContext;
  timestamp: Date;
  stack?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?:
    | 'validation'
    | 'network'
    | 'authentication'
    | 'business_logic'
    | 'system';
}

export interface ErrorResult {
  isError: true;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface SuccessResult<T = unknown> {
  isError: false;
  data: T;
  timestamp?: string;
}

export type OperationResult<T = unknown> = SuccessResult<T> | ErrorResult;

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  path?: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface NetworkError {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  timeout?: boolean;
  offline?: boolean;
  message: string;
}

export interface ErrorHandlerConfig {
  logToConsole: boolean;
  logToRemote: boolean;
  showUserNotification: boolean;
  retryable: boolean;
  maxRetries?: number;
}
