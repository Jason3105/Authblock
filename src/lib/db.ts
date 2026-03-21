import { neon } from '@neondatabase/serverless'
import { Pool } from '@neondatabase/serverless'

// For server-side API routes: single SQL call helper
export function sql(connectionString?: string) {
  return neon(connectionString ?? process.env.DATABASE_URL!)
}

// For server-side API routes needing a persistent pool (optional)
export function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL! })
}
