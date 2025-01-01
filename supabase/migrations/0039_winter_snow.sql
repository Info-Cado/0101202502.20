/*
  # Fix Color Palette Schema

  1. Changes
    - Add position column to colors table if not exists
    - Create function to update color positions
    - Add index for faster position queries
    - Add trigger for automatic position assignment
*/

-- Add position column if it doesn't exist
ALTER TABLE colors 
ADD COLUMN IF NOT EXISTS position integer;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_colors_position ON colors(position);

-- Function to get next position
CREATE OR REPLACE FUNCTION get_next_color_position()
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(position) + 1 FROM colors),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update positions
CREATE OR REPLACE FUNCTION update_color_positions(
  color_ids uuid[],
  new_positions integer[]
)
RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(color_ids, 1) LOOP
    UPDATE colors
    SET position = new_positions[i]
    WHERE id = color_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set position on insert
CREATE OR REPLACE FUNCTION set_color_position()
RETURNS trigger AS $$
BEGIN
  IF NEW.position IS NULL THEN
    NEW.position := get_next_color_position();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_color_position_trigger ON colors;
CREATE TRIGGER set_color_position_trigger
  BEFORE INSERT ON colors
  FOR EACH ROW
  EXECUTE FUNCTION set_color_position();

-- Set initial positions for existing colors
WITH numbered_colors AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as new_position
  FROM colors
)
UPDATE colors c
SET position = nc.new_position
FROM numbered_colors nc
WHERE c.id = nc.id
AND c.position IS NULL;
