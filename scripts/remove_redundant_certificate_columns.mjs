// Run with: node scripts/remove_redundant_certificate_columns.mjs
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local')
    process.exit(1)
  }

  console.log('🔄 Connecting to database...')
  const sql = neon(DATABASE_URL)

  try {
    console.log('📝 Removing redundant certificate columns from marksheets table...\n')

    // Remove certificate_hash column (we'll use pdf_hash)
    console.log('  → Removing certificate_hash column...')
    await sql`ALTER TABLE marksheets DROP COLUMN IF EXISTS certificate_hash`
    console.log('    ✓ certificate_hash removed')

    // Remove tx_hash_certificate column (we'll use tx_hash_pdf)
    console.log('  → Removing tx_hash_certificate column...')
    await sql`ALTER TABLE marksheets DROP COLUMN IF EXISTS tx_hash_certificate`
    console.log('    ✓ tx_hash_certificate removed')

    // Drop the indexes for those columns too
    console.log('\n📝 Dropping related indexes...')
    await sql`DROP INDEX IF EXISTS idx_marksheets_certificate_hash`
    console.log('  ✓ Certificate hash index dropped')

    console.log('\n✅ Migration complete! Redundant columns removed.')

    // Show remaining certificate-related columns
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'marksheets'
      AND (column_name LIKE '%certificate%' OR column_name LIKE '%hash%' OR column_name = 'verification_url')
      ORDER BY column_name
    `
    console.log('\n📊 Remaining certificate/hash columns in marksheets table:')
    result.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()