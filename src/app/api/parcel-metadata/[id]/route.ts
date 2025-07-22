import { NextRequest, NextResponse } from 'next/server';
import { getParcelMetadata } from '@services/parcelMetadata';

/**
 * Parcel metadata lookup endpoint
 * @param request NextRequest instance
 * @param params Route parameters containing parcel ID
 * @returns JSON response with complete parcel metadata
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
