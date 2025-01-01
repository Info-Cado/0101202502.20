/*
  # Add category support for designs

  1. Changes
    - Add category column to designs table
    - Add index for faster category filtering
*/

-- Add category column
ALTER TABLE designs
ADD COLUMN category text;

-- Add index for faster category lookups
CREATE INDEX idx_designs_category ON designs(category);

-- Update RLS policy to allow category updates
CREATE POLICY "Enable update access for all users"
ON designs FOR UPDATE
USING (true)
WITH CHECK (true);
