/**
 * Centralized error handling utilities and patterns
 */

/**
 * Standard error types used throughout the application
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Base error class with additional context
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options: {
      context?: Record<string, unknown>;
      isRetryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.context = options.context;
    this.isRetryable = options.isRetryable ?? false;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Creates a standardized error for insufficient data scenarios
 */
export function createInsufficientDataError(
  context?: Record<string, unknown>
): AppError {
  return new AppError(
    'Insufficient data for automatic estimate. In-person consultation required.',
    ErrorType.INSUFFICIENT_DATA,
    { context, isRetryable: false }
  );
}

/**
 * Creates a standardized network error
 */
export function createNetworkError(
  message: string = 'Network request failed',
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, ErrorType.NETWORK, {
    context,
    isRetryable: true
  });
}

/**
 * Wraps an async function with error handling and optional retry logic
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    errorType?: ErrorType;
    context?: Record<string, unknown>;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const {
    errorType = ErrorType.UNKNOWN,
    context,
    retries = 0,
    retryDelay = 1000
  } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        throw new AppError(lastError.message, errorType, {
          context: { ...context, attempts: attempt + 1 },
          cause: lastError
        });
      }

      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError!;
}

/**
 * Safely extracts error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('connection')
    );
  }
  return false;
}

/**
 * Logs error with consistent format and optional context
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const message = getErrorMessage(error);
  const errorInfo = {
    message,
    context,
    ...(error instanceof AppError && {
      type: error.type,
      isRetryable: error.isRetryable,
      errorContext: error.context
    })
  };

  console.error('[Error]', errorInfo);
}
