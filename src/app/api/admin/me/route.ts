import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/admin/me?email=xxx  — fetch full admin row from DB
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    const db = sql()
    const rows = await db`
      SELECT id, name, email, phone, position, admin_type, firebase_uid, firebase_photo_url, created_at
      FROM admin
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ admin: rows[0] })
  } catch (err) {
    console.error('[me] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
