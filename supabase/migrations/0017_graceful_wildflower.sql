/*
  # Add thumbnail URL support
  
  1. Changes
    - Add thumbnail_url column to designs table
    - Add comment explaining the column's purpose
    - Update existing rows to use image_url as fallback
*/

-- Add thumbnail_url column
ALTER TABLE designs
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add column comment
COMMENT ON COLUMN designs.thumbnail_url IS 'URL to the thumbnail version of the design image. Falls back to image_url if not set.';

-- Set existing rows to use image_url as fallback
UPDATE designs 
SET thumbnail_url = image_url 
WHERE thumbnail_url IS NULL;
