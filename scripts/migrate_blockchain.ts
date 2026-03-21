import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local')
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log('Adding blockchain hash columns to marksheets table...')
    
    // Using IF NOT EXISTS so it's safe to run multiple times
    await sql`
      ALTER TABLE marksheets
      ADD COLUMN IF NOT EXISTS pdf_hash TEXT,
      ADD COLUMN IF NOT EXISTS data_hash TEXT,
      ADD COLUMN IF NOT EXISTS tx_hash_pdf TEXT,
      ADD COLUMN IF NOT EXISTS tx_hash_data TEXT;
    `
    
    console.log('✅ Blockchain columns added successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

run()
