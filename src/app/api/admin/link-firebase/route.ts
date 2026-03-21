import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email, firebase_uid, firebase_email } = await req.json()

    if (!email || !firebase_uid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = sql()

    // Update the admin row — only if it belongs to this email
    // and only if firebase_uid is not already set to a DIFFERENT uid
    const rows = await db`
      UPDATE admin
      SET
        firebase_uid   = ${firebase_uid},
        firebase_email = ${firebase_email ?? email}
      WHERE email = ${email.toLowerCase().trim()}
      RETURNING id, name, email, admin_type, position
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, admin: rows[0] })
  } catch (err) {
    console.error('[link-firebase] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
