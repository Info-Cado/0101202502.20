/*
  # Update colors table policies

  1. Changes
    - Enable public access to colors table
    - Remove user_id requirement
    - Update RLS policies for public access
*/

-- Remove user_id constraint and make it optional
ALTER TABLE colors ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies for public access
DROP POLICY IF EXISTS "Anyone can view colors" ON colors;
DROP POLICY IF EXISTS "Users can insert their own colors" ON colors;
DROP POLICY IF EXISTS "Users can update their own colors" ON colors;
DROP POLICY IF EXISTS "Users can delete their own colors" ON colors;

-- Create new public access policies
CREATE POLICY "Enable read access for all users"
ON colors FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON colors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
ON colors FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
ON colors FOR DELETE
USING (true);
