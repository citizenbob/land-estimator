import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses } from '@services/addressSearch';
import { logError } from '@lib/errorUtils';

/**
 * Address lookup endpoint with fuzzy search capabilities
 * @param request NextRequest containing search query parameter
 * @returns JSON response with matching addresses and metadata
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  const isTestEnv =
    process.env.NODE_ENV === 'test' || process.env.CYPRESS === 'true';

  if (!isTestEnv) {
    console.log('🔍 Lookup API called:', {
      query,
      timestamp: new Date().toISOString()
    });
  }

  if (!query || query.trim().length < 2) {
    if (!isTestEnv) {
      console.log('❌ Query too short:', query);
    }
    return NextResponse.json(
      { error: 'Query parameter must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    if (!isTestEnv) {
      console.log('🚀 Starting searchAddresses for:', query.trim());
    }
    const results = await searchAddresses(query.trim(), 10);
    if (!isTestEnv) {
      console.log('✅ Search completed:', { resultCount: results.length });
    }

    const response = NextResponse.json({
      query: query.trim(),
      results,
      count: results.length
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=86400'
    );

    return response;
  } catch (error) {
    logError(error, {
      operation: 'api_lookup',
      endpoint: '/api/lookup',
      query: request.nextUrl.searchParams.get('query')
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
