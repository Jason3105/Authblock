import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET() {
  const db = sql()

  try {
    // 1. Get total certificates issued
    const marksheetsCountRes = await db`SELECT COUNT(*)::int as count FROM marksheets`
    const certificatesIssued = marksheetsCountRes[0]?.count || 0

    // 2. Get verified on-chain count (those with blockchain tx hashes)
    const verifiedOnChainRes = await db`
      SELECT COUNT(*)::int as count 
      FROM marksheets 
      WHERE tx_hash_pdf IS NOT NULL OR tx_hash_data IS NOT NULL
    `
    const verifiedOnChain = verifiedOnChainRes[0]?.count || 0

    // 3. Get total admin users
    const adminCountRes = await db`SELECT COUNT(*)::int as count FROM admin`
    const adminUsers = adminCountRes[0]?.count || 0

    return NextResponse.json({
      success: true,
      stats: {
        certificatesIssued,
        verifiedOnChain,
        adminUsers
      }
    })
  } catch (err: any) {
    console.error('[dashboard-stats] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard statistics' }, { status: 500 })
  }
}
