/*
  # Add permissions for designs and storage

  1. Storage Permissions
    - Allow public read access to designs bucket
    - Allow authenticated users to upload/delete designs
  
  2. Design Table Permissions
    - Allow public read access
    - Allow authenticated users to create/update/delete designs
*/

-- Update storage bucket policies
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'designs' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'designs' AND auth.role() = 'authenticated');

-- Update designs table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON designs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON designs;

CREATE POLICY "Allow public read access"
ON designs FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated create"
ON designs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update"
ON designs FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete"
ON designs FOR DELETE
USING (auth.role() = 'authenticated');

-- Update design_matches table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON design_matches;
DROP POLICY IF EXISTS "Enable insert access for all users" ON design_matches;

CREATE POLICY "Allow public read access"
ON design_matches FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated create"
ON design_matches FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update"
ON design_matches FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete"
ON design_matches FOR DELETE
USING (auth.role() = 'authenticated');

-- Update design_default_colors table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON design_default_colors;
DROP POLICY IF EXISTS "Enable insert access for all users" ON design_default_colors;

CREATE POLICY "Allow public read access"
ON design_default_colors FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated create"
ON design_default_colors FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update"
ON design_default_colors FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete"
ON design_default_colors FOR DELETE
USING (auth.role() = 'authenticated');
