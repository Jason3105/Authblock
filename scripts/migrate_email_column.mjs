
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

async function addEmailColumn() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Adding student_email column to users table...');
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS student_email TEXT;
    `;
    console.log('Successfully added student_email column!');
  } catch (err) {
    console.error('Failed to add column:', err);
  }
}

addEmailColumn();
