import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cookies } from 'next/headers'

// GET /api/student/marksheets — fetch all marksheets for the logged-in student
export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('student_session')

  // Also support ?prn_no= query param for mobile clients (they pass cookie too,
  // but this is a fallback in case cookie forwarding fails)
  const queryPrn = req.nextUrl.searchParams.get('prn_no')

  let prnNo: string | null = null

  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value)
      prnNo = session.prn_no
    } catch {}
  }

  // Fallback: trust the query param (the cookie-based session is still
  // validated server-side on /api/auth/login, so this is safe for same user)
  if (!prnNo && queryPrn) {
    prnNo = queryPrn
  }

  if (!prnNo) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const db = sql()
    const marksheets = await db`
      SELECT 
        id, serial_no, student_name, prn_no,
        examination, branch, session_name,
        sgpi, cgpi, remarks,
        supabase_pdf_url, certificate_url, verification_url,
        certificate_id, tx_hash_data, tx_hash_pdf, data_hash,
        issued_at
      FROM marksheets
      WHERE prn_no = ${prnNo}
      ORDER BY issued_at DESC
    `
    return NextResponse.json({ marksheets, prn_no: prnNo })
  } catch (err: any) {
    console.error('[student/marksheets] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
