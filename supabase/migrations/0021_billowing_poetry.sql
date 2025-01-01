/*
  # Update Storage Configuration and Policies

  1. Storage Configuration
    - Ensure designs bucket exists and is public
    - Enable public access without authentication

  2. Security
    - Enable RLS on storage.objects
    - Add policies for public access to designs bucket
*/

-- Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete access for all users" ON storage.objects;

-- Create new policies with proper configuration
CREATE POLICY "Enable read access for all users"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

CREATE POLICY "Enable insert access for all users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'designs');

CREATE POLICY "Enable delete access for all users"
ON storage.objects FOR DELETE
USING (bucket_id = 'designs');

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
