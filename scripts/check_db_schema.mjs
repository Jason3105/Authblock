
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

async function checkColumns() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    console.log('Columns in users table:');
    console.table(result);
  } catch (err) {
    console.error('Failed to check columns:', err);
  }
}

checkColumns();
