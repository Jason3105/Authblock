import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local')
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log('Adding serial_no column to marksheets table...')
    
    await sql`
      ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS serial_no TEXT;
    `
    console.log('✅ serial_no column added successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

run()
