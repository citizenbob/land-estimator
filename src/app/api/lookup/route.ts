import { NextRequest, NextResponse } from 'next/server';
import { searchAddresses } from '@services/addressSearch';
import { logError } from '@lib/errorUtils';
import { deduplicatedLookup } from '@lib/requestDeduplication';

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

  if (!query || query.trim().length < 3) {
    if (!isTestEnv) {
      console.log('❌ Query too short:', query);
    }
    return NextResponse.json(
      { error: 'Query parameter must be at least 3 characters' },
      { status: 400 }
    );
  }

  try {
    if (!isTestEnv) {
      console.log('🚀 Starting searchAddresses for:', query.trim());
    }

    /**
     * Use deduplication for the search request with timeout protection
     * Set a reasonable timeout to prevent 504 errors
     */
    const searchPromise = deduplicatedLookup(
      query.trim(),
      (normalizedQuery) => searchAddresses(normalizedQuery, 10),
      { debounce: false }
    );

    // Set a timeout to prevent 504 errors (10 seconds max)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Search timeout - index may be loading'));
      }, 10000);
    });

    const results = await Promise.race([searchPromise, timeoutPromise]);

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
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle timeout errors gracefully
    if (errorMessage.includes('timeout') || errorMessage.includes('loading')) {
      if (!isTestEnv) {
        console.log('⏳ Search timed out - index may be initializing');
      }
      return NextResponse.json({
        query: query.trim(),
        results: [],
        count: 0,
        message: 'Search index is initializing. Please try again in a moment.'
      });
    }

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
