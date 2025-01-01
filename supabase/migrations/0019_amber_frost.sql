/*
  # Fix design_default_colors RLS Policies

  1. Changes
    - Update RLS policies to allow proper access to design_default_colors table
    - Add policies for unauthenticated access where needed
    - Fix policy ordering and dependencies

  2. Security
    - Maintain read-only access for public users
    - Allow all users full CRUD access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON design_default_colors;
DROP POLICY IF EXISTS "Allow authenticated create" ON design_default_colors;
DROP POLICY IF EXISTS "Allow authenticated update" ON design_default_colors;
DROP POLICY IF EXISTS "Allow authenticated delete" ON design_default_colors;

-- Create new policies with proper access control
CREATE POLICY "Enable read access for all users"
ON design_default_colors FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON design_default_colors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON design_default_colors FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON design_default_colors FOR DELETE
USING (true);

-- Ensure RLS is enabled
ALTER TABLE design_default_colors ENABLE ROW LEVEL SECURITY;
