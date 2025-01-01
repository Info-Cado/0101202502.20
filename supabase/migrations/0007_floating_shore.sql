/*
  # Add color changes tracking
  
  1. Changes
    - Add color_changes column to design_matches table to store color transformation data
    - Column type is JSONB to efficiently store color change arrays
    
  2. Notes
    - Using JSONB instead of JSON for better performance and indexing capabilities
    - Allows storing arrays of color changes with original and new colors
*/

ALTER TABLE design_matches
ADD COLUMN IF NOT EXISTS color_changes JSONB;

-- Add index for potential future queries on color changes
CREATE INDEX IF NOT EXISTS idx_design_matches_color_changes 
ON design_matches USING GIN (color_changes);

COMMENT ON COLUMN design_matches.color_changes IS 
'Stores array of color transformations applied to the original design';
