import { NextRequest, NextResponse } from 'next/server';
import { getParcelMetadata } from '@services/parcelMetadata';

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
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    });
  } catch (err) {
    console.error('Parcel metadata error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
