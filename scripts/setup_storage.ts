import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing in .env.local')
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log('Creating marksheets bucket and policies...')
    
    // 1. Create the bucket
    await sql`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('marksheets', 'marksheets', true)
      ON CONFLICT (id) DO NOTHING;
    `
    console.log('✅ Bucket "marksheets" created (or already exists).')

    // 2. Create the policies
    try {
      await sql`
        CREATE POLICY "Allow public uploads to marksheets"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'marksheets');
      `
      console.log('✅ Insert policy created.')
    } catch (e: any) {
      if (!e.message.includes('already exists')) console.log('Policy insert error:', e.message)
    }

    try {
      await sql`
        CREATE POLICY "Allow public reads from marksheets"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'marksheets');
      `
      console.log('✅ Select policy created.')
    } catch (e: any) {
       if (!e.message.includes('already exists')) console.log('Policy select error:', e.message)
    }

    console.log('🎉 Storage setup complete!')
  } catch (error) {
    console.error('Storage setup failed:', error)
  }
}

run()
