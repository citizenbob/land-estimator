import { NextResponse } from 'next/server';
import {
  getCoordinatesFromAddress,
  getNominatimSuggestions
} from '@services/nominatimGeoCode';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'coordinates') {
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Invalid address parameter' },
        { status: 400 }
      );
    }

    try {
      const result = await getCoordinatesFromAddress(address);
      if (!result) {
        return NextResponse.json(
          { error: 'No results found' },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in coordinates endpoint:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } else if (type === 'suggestions') {
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      );
    }

    try {
      const suggestions = await getNominatimSuggestions(query);
      return NextResponse.json(suggestions);
    } catch (error) {
      console.error('Error in suggestions endpoint:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { error: 'Invalid type parameter' },
      { status: 400 }
    );
  }
}
