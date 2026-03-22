import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

// Ensure standard dotenv loads correctly if .env.local exists
import fs from 'fs';
import path from 'path';
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
}

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        prn_no VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Successfully initialized users table in Neon DB!');
  } catch (err) {
    console.error('Failed to create users table:', err);
  }
}

initDb();
