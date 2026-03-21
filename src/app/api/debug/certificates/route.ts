import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    const db = sql()
    const certificates = await db`
      SELECT
        certificate_id, student_name, data_hash, pdf_hash,
        examination, remarks, issued_at
      FROM marksheets
      WHERE certificate_id IS NOT NULL
      ORDER BY issued_at DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      count: certificates.length,
      certificates: certificates.map(cert => ({
        certificate_id: cert.certificate_id,
        student_name: cert.student_name,
        data_hash: cert.data_hash?.substring(0, 20) + '...',
        pdf_hash: cert.pdf_hash?.substring(0, 20) + '...',
        examination: cert.examination,
        remarks: cert.remarks,
        issued_at: cert.issued_at
      }))
    })

  } catch (error: any) {
    console.error('[Debug] Certificate lookup error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}