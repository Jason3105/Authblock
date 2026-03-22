import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getBlockchainContract } from '@/lib/blockchain'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let certId: string | null = null

  try {
    const searchParams = request.nextUrl.searchParams
    certId = searchParams.get('cert')
    const expectedHash = searchParams.get('hash')
    const expectedTx = searchParams.get('tx')

    if (!certId) {
      return NextResponse.json({ error: 'Certificate ID required' }, { status: 400 })
    }

    console.log('[Verify] Certificate verification request:', { certId, expectedHash, expectedTx })

    // Fetch certificate from marksheets table
    // @ts-ignore
    const db = sql()
    const result = await db`
      SELECT
        m.certificate_id, m.student_name, m.prn_no, m.serial_no, m.examination, m.branch,
        m.session_name, m.sgpi, m.cgpi, m.remarks, m.data_hash, m.pdf_hash,
        m.tx_hash_data, m.tx_hash_pdf, m.verification_url, m.issued_at, m.certificate_data,
        a.name as issued_by_name
      FROM marksheets m
      LEFT JOIN admin a ON m.issued_by = a.id
      WHERE m.certificate_id = ${certId}
      LIMIT 1
    `

    if (!result || result.length === 0) {
      return NextResponse.json({
        verified: false,
        error: 'Certificate not found',
        certificate_id: certId
      }, { status: 404 })
    }

    const certificate = result[0]
    const storedDataHash = certificate.data_hash
    const storedTxHash = certificate.tx_hash_data

    console.log('[Verify] Found certificate:', {
      id: certificate.certificate_id,
      student: certificate.student_name,
      storedHash: storedDataHash?.substring(0, 16) + '...',
      storedTx: storedTxHash?.substring(0, 16) + '...'
    })

    // Verify hashes match if provided in QR code
    let hashVerified = true
    let txVerified = true

    if (expectedHash && storedDataHash) {
      hashVerified = expectedHash.toLowerCase() === storedDataHash.toLowerCase()
      console.log('[Verify] Hash verification:', { expected: expectedHash, stored: storedDataHash, match: hashVerified })
    }

    if (expectedTx && storedTxHash) {
      txVerified = expectedTx.toLowerCase() === storedTxHash.toLowerCase()
      console.log('[Verify] TX verification:', { expected: expectedTx, stored: storedTxHash, match: txVerified })
    }

    // Verify hash exists on blockchain
    let onBlockchain = false
    let blockchainTimestamp = null

    try {
      const { contract } = await getBlockchainContract()

      // The contract exposes verifyHash(bytes32) → (bool exists, uint256 timestamp)
      // storedDataHash is already a 0x-prefixed 32-byte hex string
      const [exists, timestamp] = await contract.verifyHash(storedDataHash)

      onBlockchain = exists && Number(timestamp) > 0
      blockchainTimestamp = onBlockchain
        ? new Date(Number(timestamp) * 1000).toISOString()
        : null

      console.log('[Verify] Blockchain verification:', {
        hash: storedDataHash?.substring(0, 16) + '...',
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

    return NextResponse.json({
      verified,
      certificate_id: certId,
      certificate: {
        id: certificate.certificate_id,
        student_name: certificate.student_name,
        prn_no: certificate.prn_no,
        serial_no: certificate.serial_no,
        examination: certificate.examination,
        branch: certificate.branch,
        session: certificate.session_name,
        sgpi: certificate.sgpi,
        cgpi: certificate.cgpi,
        remarks: certificate.remarks,
        issued_at: certificate.issued_at,
        issued_by: certificate.issued_by_name
      },
      verification: {
        hash_valid: hashVerified,
        transaction_valid: txVerified,
        on_blockchain: onBlockchain,
        blockchain_timestamp: blockchainTimestamp,
        expected_hash: expectedHash,
        stored_hash: storedDataHash,
        expected_tx: expectedTx,
        stored_tx: storedTxHash
      },
      blockchain: {
        data_hash: storedDataHash,
        tx_hash: storedTxHash,
        etherscan_url: `https://sepolia.etherscan.io/tx/${storedTxHash}`
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
