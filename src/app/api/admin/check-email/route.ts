import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const db = sql()
    const rows = await db`
      SELECT id, name, email, admin_type, position
      FROM admin
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ allowed: false }, { status: 200 })
    }

    const admin = rows[0]
    return NextResponse.json({
      allowed: true,
      name: admin.name,
      adminType: admin.admin_type,
      position: admin.position,
    })
  } catch (err) {
    console.error('[check-email] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
