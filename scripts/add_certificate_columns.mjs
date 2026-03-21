// Run with: node scripts/add_certificate_columns.mjs
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
    console.log('📝 Adding certificate columns to marksheets table...\n')

    // Add certificate_id column
    console.log('  → Adding certificate_id...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS certificate_id TEXT`
    console.log('    ✓ certificate_id added')

    // Add certificate_url column
    console.log('  → Adding certificate_url...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS certificate_url TEXT`
    console.log('    ✓ certificate_url added')

    // Add certificate_hash column
    console.log('  → Adding certificate_hash...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS certificate_hash TEXT`
    console.log('    ✓ certificate_hash added')

    // Add tx_hash_certificate column
    console.log('  → Adding tx_hash_certificate...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS tx_hash_certificate TEXT`
    console.log('    ✓ tx_hash_certificate added')

    // Add verification_url column
    console.log('  → Adding verification_url...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS verification_url TEXT`
    console.log('    ✓ verification_url added')

    // Add certificate_data column (JSON for full certificate info)
    console.log('  → Adding certificate_data...')
    await sql`ALTER TABLE marksheets ADD COLUMN IF NOT EXISTS certificate_data JSONB`
    console.log('    ✓ certificate_data added')

    // Create indexes for certificate lookups
    console.log('\n📝 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_marksheets_certificate_id ON marksheets(certificate_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_marksheets_certificate_hash ON marksheets(certificate_hash)`
    console.log('  ✓ Indexes created')

    console.log('\n✅ Migration complete! Certificate columns added to marksheets table.')

    // Verify columns exist
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'marksheets'
      AND column_name LIKE 'certificate%' OR column_name = 'verification_url'
      ORDER BY column_name
    `
    console.log('\n📊 Certificate columns in marksheets table:')
    result.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
