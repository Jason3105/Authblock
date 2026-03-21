import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local')
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log('Re-creating marksheets table with subjects tracking...')
    // We drop and recreate since it's safe right now (no real production data yet)
    await sql`DROP TABLE IF EXISTS marksheets;`
    await sql`
      CREATE TABLE marksheets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_name TEXT NOT NULL,
        prn_no TEXT NOT NULL,
        examination TEXT,
        branch TEXT,
        session_name TEXT,
        sgpi TEXT,
        cgpi TEXT,
        subjects JSONB,
        supabase_pdf_url TEXT NOT NULL,
        issued_by UUID REFERENCES admin(id),
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    console.log('✅ marksheets table updated successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

run()
