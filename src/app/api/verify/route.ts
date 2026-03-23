import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getBlockchainContract } from '@/lib/blockchain'

export async function POST(req: Request) {
  try {
    const { hash } = await req.json()

    if (!hash) {
      return NextResponse.json({ error: 'Hash is required for verification' }, { status: 400 })
    }

    console.log('[Verify Debug] Received hash for verification:', hash)

    // 1. Check Smart Contract
    const { contract } = await getBlockchainContract()
    // Ensure hash has proper 0x prefix (avoid double 0x)
    const formattedHash = hash.startsWith('0x') ? hash : '0x' + hash
    console.log('[Verify Debug] Formatted hash for blockchain:', formattedHash)

    const [isValid, timestamp] = await contract.verifyHash(formattedHash)
    console.log('[Verify Debug] Blockchain verification result:', { isValid, timestamp: timestamp.toString() })

    if (!isValid) {
      return NextResponse.json({ 
        verified: false, 
        message: 'This document hash was not found on the blockchain.' 
      })
    }

    // 2. Look up DB record to get student details and original PDF
    const db = sql()
    console.log('[Verify Debug] Looking up hash in database:', formattedHash)
    const marksheets = await db`
      SELECT
        serial_no, student_name, prn_no, examination, branch, session_name,
        sgpi, cgpi, remarks, supabase_pdf_url, issued_at, tx_hash_pdf, tx_hash_data,
        pdf_hash, data_hash, certificate_id
      FROM marksheets
      WHERE pdf_hash = ${formattedHash} OR data_hash = ${formattedHash}
      LIMIT 1
    `

    console.log('[Verify Debug] Database lookup result:', {
      found: marksheets.length > 0,
      count: marksheets.length,
      record: marksheets.length > 0 ? {
        certificate_id: marksheets[0].certificate_id,
        student_name: marksheets[0].student_name,
        data_hash: marksheets[0].data_hash,
        pdf_hash: marksheets[0].pdf_hash
      } : null
    })

    if (!marksheets || marksheets.length === 0) {
      // It exists on chain but not in our DB? Rare, but possible.
      return NextResponse.json({ 
        verified: true, 
        onChainTimestamp: Number(timestamp) * 1000,
        message: 'Verified on blockchain, but student record not found in database.',
        record: null
      })
    }

    const record = marksheets[0]
    
    // Determine which hash matched
    const matchType = record.pdf_hash === formattedHash ? 'Digital PDF' : 'Scanned Document (Data)'
    const txHash = record.pdf_hash === formattedHash ? record.tx_hash_pdf : record.tx_hash_data

    return NextResponse.json({
      verified: true,
      onChainTimestamp: Number(timestamp) * 1000,
      matchType,
      txHash,
      record: {
        certificate_id: record.certificate_id,
        serial_no: record.serial_no,
        student_name: record.student_name,
        prn_no: record.prn_no,
        examination: record.examination,
        branch: record.branch,
        session_name: record.session_name,
        sgpi: record.sgpi,
        cgpi: record.cgpi,
        remarks: record.remarks,
        issued_at: record.issued_at,
        data_hash: record.data_hash,
        pdf_hash: record.pdf_hash,
        tx_hash_data: record.tx_hash_data,
        tx_hash_pdf: record.tx_hash_pdf,
        original_pdf_url: record.supabase_pdf_url
      }
    })

  } catch (err: any) {
    console.error('[verify-api]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
