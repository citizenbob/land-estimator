import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@config/firebaseAdmin';

/**
 * API route handler for event logging
 *
 * Receives event data via POST requests and stores it in Firestore.
 * Performs validation on the request payload and provides appropriate
 * error responses when validation fails or errors occur.
 *
 * @param request - The incoming HTTP request object
 * @returns NextResponse with appropriate status code and message
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventName, data } = body;

    // Basic validation
    if (!eventName || typeof eventName !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid eventName' },
        { status: 400 }
      );
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid data payload' },
        { status: 400 }
      );
    }

    const logEntry = {
      eventName,
      data,
      timestamp: new Date().toISOString()
    };

    const docRef = await firestoreAdmin
      .collection('landscapeEstimates')
      .add(logEntry);

    // Return success response
    return NextResponse.json(
      { success: true, message: 'Log event stored', id: docRef.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error logging event via API route:', error);

    if (
      error instanceof SyntaxError ||
      (typeof error === 'object' && error !== null && 'message' in error)
    ) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
