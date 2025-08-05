import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreAdmin } from '@config/firebaseAdmin';
import { logError, getErrorMessage } from '@lib/errorUtils';
import {
  LogEventRequest,
  LogEventResponse,
  ServerErrorResponse
} from '@app-types/apiResponseTypes';

/**
 * @param request - Request containing eventName and data properties
 * @returns Success confirmation or error response
 */
export async function POST(
  request: Request
): Promise<NextResponse<LogEventResponse | ServerErrorResponse>> {
  try {
    const { eventName, data }: LogEventRequest = await request.json();
    await firestoreAdmin.collection('landscapeInquiries').add({
      eventName,
      data,
      timestamp: FieldValue.serverTimestamp()
    });

    const response: LogEventResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    const loggedError = logError(error, {
      operation: 'api_log',
      endpoint: '/api/log'
    });

    const errorResponse: ServerErrorResponse = {
      success: false,
      error: {
        message: getErrorMessage(error),
        status: 500,
        code: 'FIRESTORE_LOG_ERROR',
        timestamp: loggedError.timestamp.toISOString()
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
