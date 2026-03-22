import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('student_session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    
    // @ts-ignore
    const db = sql();

    // Generate a new UUID
    const newToken = crypto.randomUUID();

    // Update the user's qr_token
    await db`
      UPDATE users 
      SET qr_token = ${newToken}
      WHERE prn_no = ${session.prn_no};
    `;

    return NextResponse.json({ qr_token: newToken });
  } catch (error) {
    console.error('Error generating QR token:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating QR code' },
      { status: 500 }
    );
  }
}
