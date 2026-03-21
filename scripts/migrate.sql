-- Create admin table
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
);

-- Auto-update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop & recreate trigger (idempotent)
DROP TRIGGER IF EXISTS admin_updated_at ON admin;

CREATE TRIGGER admin_updated_at
BEFORE UPDATE ON admin
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
