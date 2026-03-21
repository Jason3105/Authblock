import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import crypto from 'crypto'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const certificateId = searchParams.get('id')

    if (!certificateId) {
      return NextResponse.json({ error: 'Certificate ID required. Use ?id=ABC-2025-...' }, { status: 400 })
    }

    const db = sql()
    // Normalize certificate ID - fix OCR confusion between 0 and O
    const normalizedId = certificateId.replace(/O/g, '0')

    const result = await db`
      SELECT
        certificate_id, student_name, prn_no, serial_no, examination, branch, session_name,
        sgpi, cgpi, remarks, data_hash, pdf_hash, issued_at, certificate_data
      FROM marksheets
      WHERE certificate_id = ${normalizedId}
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({
        exists: false,
        message: `Certificate ${certificateId} was never issued through this system`
      })
    }

    const record = result[0]
    const certificateData = record.certificate_data ? JSON.parse(record.certificate_data) : null

    // Recreate the hash to show exactly what was hashed
    const essentialData = {
      name: certificateData?.name || record.student_name,
      prn_no: certificateData?.prn_no || record.prn_no,
      serial_no: certificateData?.serial_no || record.serial_no,
      examination: certificateData?.examination || record.examination,
      branch: certificateData?.branch || record.branch,
      session: certificateData?.session || record.session_name,
      sgpi: certificateData?.sgpi || record.sgpi,
      cgpi: certificateData?.cgpi || record.cgpi,
      remarks: certificateData?.remarks || record.remarks,
      certificate_id: certificateData?.certificate_id || record.certificate_id
      // issue_date removed - not part of hash anymore
    }

    const sortedJson = JSON.stringify(essentialData, Object.keys(essentialData).sort())
    const recomputedHash = '0x' + crypto.createHash('sha256').update(sortedJson).digest('hex')

    return NextResponse.json({
      exists: true,
      stored_data_hash: record.data_hash,
      recomputed_hash: recomputedHash,
      hashes_match: record.data_hash === recomputedHash,
      hash_input_data: essentialData,
      sorted_json_for_hash: sortedJson,
      raw_certificate_data: certificateData
    })

  } catch (error: any) {
    console.error('[Debug] Certificate lookup error:', error)
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}