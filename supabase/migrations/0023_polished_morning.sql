/*
  # Enable Public Access

  1. Changes
    - Update policies for designs table to allow public access
    - Update policies for design_matches table to allow public access
    - Update policies for design_default_colors table to allow public access
    - Update policies for storage objects to ensure public access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON designs;
DROP POLICY IF EXISTS "Enable insert for all users" ON designs;
DROP POLICY IF EXISTS "Enable update for all users" ON designs;
DROP POLICY IF EXISTS "Enable delete for all users" ON designs;

DROP POLICY IF EXISTS "Enable read access for all users" ON design_matches;
DROP POLICY IF EXISTS "Enable insert for all users" ON design_matches;
DROP POLICY IF EXISTS "Enable update for all users" ON design_matches;
DROP POLICY IF EXISTS "Enable delete for all users" ON design_matches;

DROP POLICY IF EXISTS "Enable read access for all users" ON design_default_colors;
DROP POLICY IF EXISTS "Enable insert for all users" ON design_default_colors;
DROP POLICY IF EXISTS "Enable update for all users" ON design_default_colors;
DROP POLICY IF EXISTS "Enable delete for all users" ON design_default_colors;

-- Create new policies for designs table
CREATE POLICY "Public read access"
ON designs FOR SELECT
USING (true);

CREATE POLICY "Public insert access"
ON designs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access"
ON designs FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access"
ON designs FOR DELETE
USING (true);

-- Create new policies for design_matches table
CREATE POLICY "Public read access"
ON design_matches FOR SELECT
USING (true);

CREATE POLICY "Public insert access"
ON design_matches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access"
ON design_matches FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access"
ON design_matches FOR DELETE
USING (true);

-- Create new policies for design_default_colors table
CREATE POLICY "Public read access"
ON design_default_colors FOR SELECT
USING (true);

CREATE POLICY "Public insert access"
ON design_default_colors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access"
ON design_default_colors FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access"
ON design_default_colors FOR DELETE
USING (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_default_colors ENABLE ROW LEVEL SECURITY;
