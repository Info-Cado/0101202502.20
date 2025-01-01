/*
  # Update storage permissions

  1. Changes
    - Update storage bucket policies to allow public uploads
    - Remove authentication requirement for uploads
    - Keep public read access

  2. Security
    - Enable public uploads while maintaining security through bucket restrictions
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Create new policies for public access
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
