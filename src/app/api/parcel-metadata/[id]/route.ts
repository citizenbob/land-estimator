import { NextRequest, NextResponse } from 'next/server';
import { getParcelMetadata } from '@services/parcelMetadata';
import { logError } from '@lib/errorUtils';

/**
 * Parcel metadata lookup endpoint
 * @param request NextRequest instance
 * @param params Route parameters containing parcel ID
 * @returns JSON response with complete parcel metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing parcel id' }, { status: 400 });
  }

  try {
    const data = await getParcelMetadata(id);
    if (!data) {
      return NextResponse.json({ error: 'Parcel not found' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    });
  } catch (err) {
    logError(err, {
      operation: 'parcel_metadata_lookup',
      parcelId: id
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
