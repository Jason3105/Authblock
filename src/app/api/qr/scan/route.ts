import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getQRBlockchainContract } from '@/lib/blockchain';
import { ethers } from 'ethers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { qr_token } = await request.json();

    if (!qr_token) {
      return NextResponse.json({ error: 'Missing qr_token' }, { status: 400 });
    }

    // @ts-ignore
    const db = sql();

    // 1. Find user by qr_token
    const users = await db`
      SELECT id, prn_no, full_name
      FROM users
      WHERE qr_token = ${qr_token}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired QR code' }, { status: 404 });
    }

    const user = users[0];

    // 2. Get scanner IP
    let ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('remote-addr') || 
             'unknown';

    // Format IPv6 loopback and mapped IPv4 to standard IPv4 for cleaner display
    if (ip === '::1') {
      ip = '127.0.0.1';
    } else if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    const timestamp = new Date().toISOString();

    // 3. Create JSON payload and hash it
    const payload = {
      ip,
      prn_no: user.prn_no,
      name: user.full_name,
      timestamp
    };

    const payloadString = JSON.stringify(payload);
    console.log("QR Scan Payload:", payloadString);

    const hashMatch = crypto.createHash('sha256').update(payloadString).digest('hex');
    const bytes32Hash = '0x' + hashMatch;
    let txHash = null;

    // 4. Send hash to Blockchain (fire-and-forget — do NOT await confirmation)
    try {
      console.log("Submitting scan hash to smart contract...");
      const { contract } = await getQRBlockchainContract();
      const tx = await contract.logScan(bytes32Hash);
      // Grab the hash immediately after broadcast; mining continues in the background
      txHash = tx.hash;
      console.log("Scan tx broadcast (processing in background):", txHash);
    } catch (bcError) {
      console.error("Blockchain Logging Error:", bcError);
      // Continue even if blockchain logging fails — the scan record is still stored in DB.
    }

    // 5. Save to database qr_scans
    await db`
      INSERT INTO qr_scans (prn_no, scanned_by_ip, tx_hash)
      VALUES (${user.prn_no}, ${ip}, ${txHash})
    `;

    // 6. Fetch all marksheets for this user
    const marksheets = await db`
      SELECT * FROM marksheets 
      WHERE prn_no = ${user.prn_no}
      ORDER BY issued_at DESC
    `;

    // 7. Return user profile and marksheets
    return NextResponse.json({
      user: {
        prn_no: user.prn_no,
        full_name: user.full_name
      },
      marksheets,
      logs: {
        hash: bytes32Hash,
        tx_hash: txHash,
        timestamp
      }
    });

  } catch (error) {
    console.error('Error scanning QR:', error);
    return NextResponse.json(
      { error: 'Internal server error during QR scan' },
      { status: 500 }
    );
  }
}
