/**
 * Migration script — run once to create the admin table in NeonDB.
 * Usage: npx tsx scripts/migrate.ts
 */
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!)

  console.log('Running migration…')

  await sql`
    CREATE TABLE IF NOT EXISTS admin (
      id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
      name            TEXT        NOT NULL,
      email           TEXT        NOT NULL UNIQUE,
      phone           TEXT,
      position        TEXT,
      admin_type      TEXT        NOT NULL
                                  CHECK (admin_type IN ('superadmin', 'admin'))
                                  DEFAULT 'admin',
      firebase_uid    TEXT        UNIQUE,
      firebase_email  TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  console.log('✅  admin table created (or already exists)')

  // Auto-update trigger function
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `

  // Drop & recreate the trigger to be idempotent
  await sql`
    DROP TRIGGER IF EXISTS admin_updated_at ON admin
  `
  await sql`
    CREATE TRIGGER admin_updated_at
    BEFORE UPDATE ON admin
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
  `
  console.log('✅  updated_at trigger created')
  console.log('Migration complete.')
  process.exit(0)
}

migrate().catch((e) => {
  console.error('Migration failed:', e)
  process.exit(1)
})
