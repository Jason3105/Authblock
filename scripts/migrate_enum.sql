-- Convert admin_type from TEXT+CHECK to a proper ENUM
-- so NeonDB table editor shows it as a dropdown

-- 1. Create the enum type (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_type_enum') THEN
    CREATE TYPE admin_type_enum AS ENUM ('superadmin', 'admin');
  END IF;
END;
$$;

-- 2. Drop the existing CHECK constraint (name may vary)
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'admin'::regclass AND contype = 'c' AND conname LIKE '%admin_type%';

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE admin DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END;
$$;

-- 3. Alter the column to use the enum type
ALTER TABLE admin
  ALTER COLUMN admin_type DROP DEFAULT;

ALTER TABLE admin
  ALTER COLUMN admin_type TYPE admin_type_enum
    USING admin_type::text::admin_type_enum;

ALTER TABLE admin
  ALTER COLUMN admin_type SET DEFAULT 'admin'::admin_type_enum;

