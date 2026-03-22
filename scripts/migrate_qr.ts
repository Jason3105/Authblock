import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding qr_token to users table...');
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS qr_token UUID UNIQUE;
    `;

    console.log('Creating qr_scans table...');
    await sql`
      CREATE TABLE IF NOT EXISTS qr_scans (
        id SERIAL PRIMARY KEY,
        prn_no VARCHAR(50) REFERENCES users(prn_no) ON DELETE CASCADE,
        scanned_by_ip VARCHAR(50),
        tx_hash VARCHAR(66),
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Creating index on prn_no in qr_scans...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_qr_scans_prn ON qr_scans(prn_no);
    `;

    console.log('QR migrations successfully applied!');
  } catch (err) {
    console.error('Failed to run QR migrations:', err);
  }
}

migrate();
