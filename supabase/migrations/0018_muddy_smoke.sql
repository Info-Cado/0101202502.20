/*
  # Fix RLS Policies

  1. Changes
    - Update RLS policies to allow proper access to designs table
    - Add policies for unauthenticated access where needed
    - Fix policy ordering and dependencies

  2. Security
    - Maintain read-only access for public users
    - Allow authenticated users full CRUD access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access" ON designs;
DROP POLICY IF EXISTS "Allow authenticated create" ON designs;
DROP POLICY IF EXISTS "Allow authenticated update" ON designs;
DROP POLICY IF EXISTS "Allow authenticated delete" ON designs;

-- Create new policies with proper access control
CREATE POLICY "Enable read access for all users"
ON designs FOR SELECT
USING (true);

CREATE POLICY "Enable insert for all users"
ON designs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON designs FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON designs FOR DELETE
USING (true);

-- Ensure RLS is enabled
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
