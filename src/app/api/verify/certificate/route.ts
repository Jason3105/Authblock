import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getBlockchainContract } from '@/lib/blockchain'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let certId: string | null = null

  try {
    const searchParams = request.nextUrl.searchParams
    certId       = searchParams.get('cert')
    const expectedHash = searchParams.get('hash')
    const expectedTx   = searchParams.get('tx')

    if (!certId && !expectedHash) {
      return NextResponse.json({ error: 'Certificate ID or hash required' }, { status: 400 })
    }

    console.log('[Verify] Marksheet verification request:', { certId, expectedHash, expectedTx })

    // Fetch marksheet record from DB
    // @ts-ignore
    const db = sql()
    const result = certId
      ? await db`
          SELECT
            m.certificate_id, m.student_name, m.prn_no, m.serial_no, m.examination, m.branch,
            m.session_name, m.sgpi, m.cgpi, m.remarks,
            m.data_hash, m.pdf_hash,
            m.tx_hash_data, m.tx_hash_pdf,
            m.verification_url, m.supabase_pdf_url, m.certificate_url,
            m.issued_at, m.certificate_data,
            a.name as issued_by_name
          FROM marksheets m
          LEFT JOIN admin a ON m.issued_by = a.id
          WHERE m.certificate_id = ${certId}
          LIMIT 1
        `
      : await db`
          SELECT
            m.certificate_id, m.student_name, m.prn_no, m.serial_no, m.examination, m.branch,
            m.session_name, m.sgpi, m.cgpi, m.remarks,
            m.data_hash, m.pdf_hash,
            m.tx_hash_data, m.tx_hash_pdf,
            m.verification_url, m.supabase_pdf_url, m.certificate_url,
            m.issued_at, m.certificate_data,
            a.name as issued_by_name
          FROM marksheets m
          LEFT JOIN admin a ON m.issued_by = a.id
          WHERE m.data_hash = ${expectedHash} OR m.pdf_hash = ${expectedHash}
          LIMIT 1
        `

    if (!result || result.length === 0) {
      return NextResponse.json({
        verified: false,
        error: 'Marksheet record not found',
        certificate_id: certId
      }, { status: 404 })
    }

    const record = result[0]
    certId = record.certificate_id

    // Stored marksheet hashes
    const storedDataHash   = record.data_hash   // marksheet coordinate hash
    const storedPdfHash    = record.pdf_hash    // marksheet PDF hash
    const storedTxHashData = record.tx_hash_data
    const storedTxHashPdf  = record.tx_hash_pdf

    console.log('[Verify] Found marksheet record:', {
      id: record.certificate_id,
      student: record.student_name,
      storedDataHash: storedDataHash?.substring(0, 20) + '...',
      storedTxData:   storedTxHashData?.substring(0, 20) + '...'
    })

    // ── 1. Hash match (QR hash vs DB hash) ─────────────────────
    let hashVerified = true
    if (expectedHash && (storedDataHash || storedPdfHash)) {
      const expected = expectedHash.toLowerCase()
      hashVerified =
        (storedDataHash && expected === storedDataHash.toLowerCase()) ||
        (storedPdfHash  && expected === storedPdfHash.toLowerCase())
      console.log('[Verify] Hash check:', { match: hashVerified, expected: expectedHash })
    }

    // ── 2. Transaction match (QR tx vs DB tx) ──────────────────
    let txVerified = true
    if (expectedTx && (storedTxHashData || storedTxHashPdf)) {
      const expected = expectedTx.toLowerCase()
      txVerified =
        (storedTxHashData && expected === storedTxHashData.toLowerCase()) ||
        (storedTxHashPdf  && expected === storedTxHashPdf.toLowerCase())
      console.log('[Verify] TX check:', { match: txVerified, expected: expectedTx })
    }

    // ── 3. Blockchain presence check (primary: data_hash) ──────
    let onBlockchain = false
    let blockchainTimestamp: string | null = null

    try {
      const { contract } = await getBlockchainContract()

      // Prefer checking the data hash (coordinate hash) — it's the primary anchor
      const hashToCheck = storedDataHash || storedPdfHash

      const [exists, timestamp] = await contract.verifyHash(hashToCheck)
      onBlockchain       = exists && Number(timestamp) > 0
      blockchainTimestamp = onBlockchain
        ? new Date(Number(timestamp) * 1000).toISOString()
        : null

      console.log('[Verify] Blockchain check:', {
        hash: hashToCheck?.substring(0, 20) + '...',
        exists: onBlockchain,
        timestamp: blockchainTimestamp
      })
    } catch (e: any) {
      console.error('[Verify] Blockchain verification error:', e)
      return NextResponse.json({
        verified: false,
        error: 'Unable to verify on blockchain: ' + e.message,
        certificate_id: certId
      }, { status: 500 })
    }

    const verified = hashVerified && txVerified && onBlockchain

    // Parse certificate_data JSON to extract ocr_coordinate_map if stored
    let parsedCertData: any = {}
    let ocrCoordinateMap: any[] = []
    try {
      parsedCertData   = typeof record.certificate_data === 'string'
        ? JSON.parse(record.certificate_data)
        : (record.certificate_data || {})
      // ocr_coordinate_map: { field, x, y, value } — used for OCR/canvas text extraction
      ocrCoordinateMap = parsedCertData.ocr_coordinate_map || []
    } catch { /* ignore */ }

    return NextResponse.json({
      verified,
      certificate_id: certId,

      // Marksheet / student details
      certificate: {
        id:               record.certificate_id,
        student_name:     record.student_name,
        prn_no:           record.prn_no,
        serial_no:        record.serial_no,
        examination:      record.examination,
        branch:           record.branch,
        session:          record.session_name,
        sgpi:             record.sgpi,
        cgpi:             record.cgpi,
        remarks:          record.remarks,
        issued_at:        record.issued_at,
        issued_by:        record.issued_by_name,
        verification_url: record.verification_url,
        marksheet_url:    record.supabase_pdf_url,
        certificate_url:  record.certificate_url,
        certificate_data: parsedCertData,
        // OCR coordinate map: {field, x, y, value} — for canvas/OCR verification
        // x/y tell the verifier WHERE to look on the page; value is what was originally drawn
        ocr_coordinate_map: ocrCoordinateMap
      },

      // QR token vs DB comparison
      verification: {
        hash_valid:           hashVerified,
        transaction_valid:    txVerified,
        on_blockchain:        onBlockchain,
        blockchain_timestamp: blockchainTimestamp,
        expected_hash:        expectedHash,
        stored_data_hash:     storedDataHash,
        expected_tx:          expectedTx,
        stored_tx:            storedTxHashData
      },

      // Blockchain anchors (marksheet)
      blockchain: {
        data_hash:            storedDataHash,    // marksheet coordinate hash
        pdf_hash:             storedPdfHash,     // marksheet PDF hash
        tx_hash_data:         storedTxHashData,
        tx_hash_pdf:          storedTxHashPdf,
        etherscan_data_url:   storedTxHashData ? `https://sepolia.etherscan.io/tx/${storedTxHashData}` : null,
        etherscan_pdf_url:    storedTxHashPdf  ? `https://sepolia.etherscan.io/tx/${storedTxHashPdf}`  : null,
        etherscan_url:        storedTxHashData ? `https://sepolia.etherscan.io/tx/${storedTxHashData}` : null
      }
    })

  } catch (err: any) {
    console.error('[verify-certificate] ERROR:', err)
    return NextResponse.json({
      verified: false,
      error: 'Internal server error: ' + err.message,
      certificate_id: certId || 'unknown'
    }, { status: 500 })
  }
}
