import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/admin/users — list all admins (superadmin only, enforced client-side + here)
export async function GET() {
  try {
    const db = sql()
    const rows = await db`
      SELECT id, name, email, phone, position, admin_type, firebase_uid, firebase_photo_url, created_at
      FROM admin
      ORDER BY admin_type DESC, created_at ASC
    `
    return NextResponse.json({ admins: rows })
  } catch (err) {
    console.error('[users GET] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/users — add a new admin
export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, position, admin_type } = await req.json()

    if (!name || !email || !admin_type) {
      return NextResponse.json({ error: 'name, email and admin_type are required' }, { status: 400 })
    }
    if (!['admin', 'superadmin'].includes(admin_type)) {
      return NextResponse.json({ error: 'Invalid admin_type' }, { status: 400 })
    }

    const db = sql()
    const rows = await db`
      INSERT INTO admin (name, email, phone, position, admin_type)
      VALUES (
        ${name.trim()},
        ${email.toLowerCase().trim()},
        ${phone?.trim() || null},
        ${position?.trim() || null},
        ${admin_type}::admin_type_enum
      )
      RETURNING id, name, email, phone, position, admin_type, created_at
    `
    return NextResponse.json({ admin: rows[0] }, { status: 201 })
  } catch (err: unknown) {
    const msg = String(err)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'An admin with this email already exists.' }, { status: 409 })
    }
    console.error('[users POST] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/admin/users — remove an admin by id
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = sql()
    await db`DELETE FROM admin WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[users DELETE] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
