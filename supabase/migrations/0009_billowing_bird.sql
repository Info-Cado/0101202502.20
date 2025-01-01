/*
  # Add delete policies for designs and matches

  1. Changes
    - Add delete policies for designs table
    - Add delete policies for design_matches table
    - Add delete policies for storage bucket

  2. Security
    - Enable deletion for designs table
    - Enable deletion for design_matches table
    - Enable deletion for storage bucket
*/

-- Add delete policy for designs table
CREATE POLICY "Enable delete access for all users"
ON designs FOR DELETE
USING (true);

-- Add delete policy for design_matches table
CREATE POLICY "Enable delete access for all users"
ON design_matches FOR DELETE
USING (true);

-- Add delete policy for storage bucket
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'designs');
