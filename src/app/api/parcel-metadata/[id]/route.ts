import { NextRequest, NextResponse } from 'next/server';
import { getParcelMetadata } from '@services/parcelMetadata';
import { logError, getErrorMessage } from '@lib/errorUtils';
import {
  ParcelMetadataResponse,
  ValidationErrorResponse,
  NotFoundErrorResponse,
  ServerErrorResponse
} from '@app-types/apiResponseTypes';

/**
 * @param request - NextRequest instance
 * @param context - Route context containing params promise with parcel id
 * @returns Parcel metadata object or error response
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<
  NextResponse<
    | ParcelMetadataResponse
    | ValidationErrorResponse
    | NotFoundErrorResponse
    | ServerErrorResponse
  >
> {
  const { id } = await context.params;

  if (!id || id.trim() === '') {
    const response: ValidationErrorResponse = {
      success: false,
      error: {
        message: 'Missing parcel id',
        status: 400,
        code: 'MISSING_PARCEL_ID',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const parcelMetadata = await getParcelMetadata(id);

    if (!parcelMetadata) {
      const response: NotFoundErrorResponse = {
        success: false,
        error: {
          message: 'Parcel metadata not found',
          status: 404,
          code: 'PARCEL_NOT_FOUND',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ParcelMetadataResponse = {
      success: true,
      data: parcelMetadata,
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);
  } catch (error) {
    const loggedError = logError(error, {
      operation: 'parcel_metadata_api',
      parcelId: id
    });

    const response: ServerErrorResponse = {
      success: false,
      error: {
        message: getErrorMessage(error),
        status: 500,
        code: 'PARCEL_FETCH_ERROR',
        timestamp: loggedError.timestamp.toISOString()
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, { status: 500 });
  }
}
