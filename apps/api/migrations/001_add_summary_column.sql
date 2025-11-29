-- Add summary column to sources table
ALTER TABLE sources ADD COLUMN IF NOT EXISTS summary TEXT;
