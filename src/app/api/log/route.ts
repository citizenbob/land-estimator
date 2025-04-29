import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { firestoreAdmin } from '@config/firebaseAdmin';

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
    console.error('Error in /api/log:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error'
      },
      { status: 500 }
    );
  }
}
