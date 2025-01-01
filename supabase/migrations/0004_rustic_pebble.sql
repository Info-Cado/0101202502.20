/*
  # Add storage bucket for designs

  1. Storage
    - Create public bucket for design images
    - Enable public access to the bucket
*/

-- Enable storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', true);

-- Allow public access to the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'designs');
