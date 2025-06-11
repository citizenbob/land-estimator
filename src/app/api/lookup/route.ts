import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses } from '@services/addressSearch';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query parameter must be at least 2 characters' },
        { status: 400 }
      );
    }

    const results = await searchAddresses(query.trim(), 10);

    const response = NextResponse.json({
      query: query.trim(),
      results,
      count: results.length
    });

    // Add cache headers for fast responses
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=86400'
    );

    return response;
  } catch (error) {
    console.error('Address lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
