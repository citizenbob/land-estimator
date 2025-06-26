import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreAdmin } from '@config/firebaseAdmin';
import { logError, getErrorMessage } from '@lib/errorUtils';

/**
 * Event logging endpoint for analytics and debugging
 * @param request Request containing event name and associated data
 * @returns JSON confirmation of event logging
 */
export async function POST(request: Request) {
  try {
    const { eventName, data } = await request.json();
    await firestoreAdmin.collection('landscapeInquiries').add({
      eventName,
      data,
      timestamp: FieldValue.serverTimestamp()
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logError(error, {
      operation: 'api_log',
      endpoint: '/api/log'
    });
    return NextResponse.json(
      {
        error: getErrorMessage(error)
      },
      { status: 500 }
    );
  }
}
