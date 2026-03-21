-- Add firebase_photo_url column to admin table
ALTER TABLE admin ADD COLUMN IF NOT EXISTS firebase_photo_url TEXT;
