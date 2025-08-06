import { ApiError, OperationResult, LoggedError } from '@app-types/errorTypes';

export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export class AppError extends Error implements ApiError {
  public readonly type: ErrorType;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly status: number;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    options: {
      context?: Record<string, unknown>;
      isRetryable?: boolean;
      cause?: Error;
      code?: string;
      statusCode?: number;
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.context = options.context;
    this.isRetryable = options.isRetryable ?? false;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.status = options.status ?? options.statusCode ?? 500;
    this.timestamp = new Date().toISOString();

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export function createInsufficientDataError(
  context?: Record<string, unknown>
): AppError {
  return new AppError(
    'Insufficient data for automatic estimate. In-person consultation required.',
    ErrorType.INSUFFICIENT_DATA,
    { context, isRetryable: false }
  );
}

export function createNetworkError(
  message: string = 'Network request failed',
  context?: Record<string, unknown>
): AppError {
  return new AppError(message, ErrorType.NETWORK, {
    context,
    isRetryable: true
  });
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    errorType?: ErrorType;
    context?: Record<string, unknown>;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<OperationResult<T>> {
  const {
    errorType = ErrorType.UNKNOWN,
    context,
    retries = 0,
    retryDelay = 1000
  } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await operation();
      return { isError: false, data, timestamp: new Date().toISOString() };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) {
        const appError = new AppError(lastError.message, errorType, {
          context: { ...context, attempts: attempt + 1 },
          cause: lastError
        });
        return {
          isError: true,
          message: appError.message,
          code: appError.code,
          details: appError.context,
          timestamp: appError.timestamp
        };
      }

      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  const appError = new AppError(lastError!.message, errorType, {
    context,
    cause: lastError!
  });
  return {
    isError: true,
    message: appError.message,
    code: appError.code,
    details: appError.context,
    timestamp: appError.timestamp
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

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

export function logError(
  error: unknown,
  context?: Record<string, unknown>
): LoggedError {
  const message = getErrorMessage(error);
  const loggedError: LoggedError = {
    message,
    timestamp: new Date(),
    severity: 'medium',
    stack: error instanceof Error ? error.stack : undefined,
    context: context ? { metadata: context } : undefined,
    ...(error instanceof AppError && {
      category:
        error.type === ErrorType.NETWORK
          ? 'network'
          : error.type === ErrorType.VALIDATION
            ? 'validation'
            : 'system'
    })
  };

  console.error('[Error]', loggedError);
  return loggedError;
}
