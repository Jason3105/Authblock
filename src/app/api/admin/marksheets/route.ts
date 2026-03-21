import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(req: Request) {
  try {
    const _forceRead = req.url // Force NextJS routing to view request
    const db = sql()
    const marksheets = await db`
      SELECT 
        m.id, m.serial_no, m.student_name, m.prn_no, m.examination, m.branch, m.session_name, 
        m.sgpi, m.cgpi, m.remarks, m.subjects, m.supabase_pdf_url, m.issued_at,
        a.name as issued_by_name
      FROM marksheets m
      LEFT JOIN admin a ON m.issued_by = a.id
      ORDER BY m.issued_at DESC
    `
    return NextResponse.json({ marksheets }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('[fetch-marksheets]', err)
    return NextResponse.json({ error: 'Failed to fetch marksheets' }, { status: 500 })
  }
}
