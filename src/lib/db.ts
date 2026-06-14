import { neon } from '@neondatabase/serverless'
import { Pool } from '@neondatabase/serverless'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[db] DATABASE_URL is not set. Add it to your Amplify environment variables (App Settings → Environment Variables).'
    )
  }
  return url
}

// For server-side API routes: single SQL call helper
export function sql(connectionString?: string) {
  return neon(connectionString ?? getDatabaseUrl())
}

// For server-side API routes needing a persistent pool (optional)
export function getPool() {
  return new Pool({ connectionString: getDatabaseUrl() })
}
