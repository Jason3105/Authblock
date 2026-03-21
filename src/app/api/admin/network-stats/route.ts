import { NextResponse } from 'next/server'

// How many recent blocks to fetch
const BLOCKS_TO_FETCH = 20

export async function GET() {
  const rpcUrl = process.env.ALCHEMY_RPC_URL

  if (!rpcUrl) {
    return NextResponse.json({ error: 'Alchemy RPC URL not configured' }, { status: 500 })
  }

  try {
    // 1. Get the latest block number
    const headRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      // Reduce caching so we get live data
      cache: 'no-store'
    })
    const headData = await headRes.json()
    const latestHex = headData.result
    if (!latestHex) throw new Error('Failed to get block number')
    
    const latestDec = parseInt(latestHex, 16)

    // 2. Prepare a JSON-RPC batch request for the last BLOCKS_TO_FETCH blocks
    const batchPayload = []
    for (let i = 0; i < BLOCKS_TO_FETCH; i++) {
      const blockNumHex = '0x' + (latestDec - i).toString(16)
      batchPayload.push({
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: [blockNumHex, false],
        id: i,
      })
    }

    // 3. Execute batch request
    const batchRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload),
      cache: 'no-store'
    })
    const batchData = await batchRes.json()

    // 4. Format data for the frontend chart
    const formattedData = batchData
      .filter((b: any) => b.result)
      .map((b: any) => {
        const block = b.result
        return {
          blockNumber: parseInt(block.number, 16),
          timestamp: parseInt(block.timestamp, 16) * 1000,
          gasUsed: parseInt(block.gasUsed, 16),
          gasLimit: parseInt(block.gasLimit, 16),
          baseFeeGwei: block.baseFeePerGas ? parseInt(block.baseFeePerGas, 16) / 1e9 : 0,
          txCount: block.transactions ? block.transactions.length : 0,
        }
      })
      // Sort chronologically (oldest to newest)
      .sort((a: any, b: any) => a.blockNumber - b.blockNumber)

    return NextResponse.json({ blocks: formattedData })
  } catch (err: any) {
    console.error('[network-stats]', err)
    return NextResponse.json({ error: 'Failed to fetch network stats' }, { status: 500 })
  }
}
