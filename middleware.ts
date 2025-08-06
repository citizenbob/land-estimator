import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Edge Middleware for Regional Shard Detection
 *
 * Automatically detects user's region using Vercel's geolocation headers
 * and sets a cookie to determine which FlexSearch shard to load.
 *
 * Supports:
 * - St. Louis City (stl-city)
 * - St. Louis County (stl-county) - default fallback
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip middleware for API routes and static assets
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/search/') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return response;
  }

  // Get existing region shard from cookie
  const existingRegion = request.cookies.get('regionShard')?.value;

  // If we already have a valid region, keep it
  if (existingRegion === 'stl-city' || existingRegion === 'stl-county') {
    return response;
  }

  // Get geolocation data from Vercel headers
  const region = request.headers.get('x-vercel-ip-country-region') || '';
  const city = request.headers.get('x-vercel-ip-city') || '';
  const postalCode = request.headers.get('x-vercel-ip-postal-code') || '';

  // Determine region based on geolocation
  let regionShard = 'stl-county';

  if (city && region) {
    const cityLower = city.toLowerCase();
    const regionLower = region.toLowerCase();

    // Check for St. Louis City indicators
    if (
      cityLower.includes('st. louis') ||
      cityLower.includes('saint louis') ||
      (regionLower.includes('missouri') && cityLower.includes('louis'))
    ) {
      // St. Louis City ZIP codes
      const stlCityZips = [
        '63101',
        '63102',
        '63103',
        '63104',
        '63108',
        '63110',
        '63111',
        '63112',
        '63113',
        '63115',
        '63116',
        '63118',
        '63120',
        '63139',
        '63147'
      ];

      if (
        cityLower === 'st. louis' ||
        cityLower === 'saint louis' ||
        stlCityZips.includes(postalCode)
      ) {
        regionShard = 'stl-city';
      } else {
        regionShard = 'stl-county';
      }
    }
  }

  // Set the region shard cookie
  response.cookies.set('regionShard', regionShard, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30
  });

  // Optional: Add debug headers in development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Debug-Region-Shard', regionShard);
    response.headers.set('X-Debug-Geo-City', city);
    response.headers.set('X-Debug-Geo-Region', region);
  }

  return response;
}

// Configure which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - search (static search files)
     * - favicon.ico (favicon file)
     * - Any file with an extension
     */
    '/((?!api|_next/static|_next/image|search|favicon.ico|.*\\.).*)'
  ]
};
