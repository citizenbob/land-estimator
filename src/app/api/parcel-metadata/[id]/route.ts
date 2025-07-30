import { NextRequest, NextResponse } from 'next/server';
import { getParcelMetadata } from '@services/parcelMetadata';

/**
 * @param request - NextRequest instance
 * @param context - Route context containing params promise with parcel id
 * @returns Parcel metadata object or error response
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Validate parcel ID
  if (!id || id.trim() === '') {
    return NextResponse.json({ error: 'Missing parcel id' }, { status: 400 });
  }

  try {
    const parcelMetadata = await getParcelMetadata(id);

    if (!parcelMetadata) {
      return NextResponse.json(
        { error: 'Parcel metadata not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(parcelMetadata);
  } catch (error) {
    console.error('Error in parcel metadata API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parcel metadata' },
      { status: 500 }
    );
  }
}
