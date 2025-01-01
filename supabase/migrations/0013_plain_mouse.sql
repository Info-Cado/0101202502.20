/*
  # Fix default colors functionality

  1. Changes
    - Drop existing triggers and functions
    - Create new improved validation function
    - Add proper indexes
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS validate_default_colors_trigger ON designs;
DROP FUNCTION IF EXISTS validate_default_colors();

-- Create new validation function with better error handling
CREATE OR REPLACE FUNCTION validate_default_colors()
RETURNS trigger AS $$
BEGIN
  -- Handle null case
  IF NEW.default_colors IS NULL THEN
    NEW.default_colors := '[]'::jsonb;
    RETURN NEW;
  END IF;

  -- Validate array type
  IF jsonb_typeof(NEW.default_colors) != 'array' THEN
    RAISE EXCEPTION 'default_colors must be an array';
  END IF;

  -- Validate each color object
  FOR i IN 0..jsonb_array_length(NEW.default_colors) - 1 LOOP
    -- Check required fields
    IF NOT (
      jsonb_typeof(NEW.default_colors->i) = 'object' AND
      (NEW.default_colors->i) ? 'hex' AND
      (NEW.default_colors->i) ? 'name'
    ) THEN
      RAISE EXCEPTION 'Invalid color object at index %. Must have hex and name fields', i;
    END IF;

    -- Validate hex color format
    IF NOT (NEW.default_colors->i->>'hex' ~ '^#[0-9A-Fa-f]{6}$') THEN
      RAISE EXCEPTION 'Invalid hex color at index %: %', i, NEW.default_colors->i->>'hex';
    END IF;

    -- Validate name is not empty
    IF length(trim(NEW.default_colors->i->>'name')) = 0 THEN
      RAISE EXCEPTION 'Color name cannot be empty at index %', i;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER validate_default_colors_trigger
  BEFORE INSERT OR UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION validate_default_colors();

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_designs_default_colors;

-- Create new optimized index
CREATE INDEX idx_designs_default_colors ON designs USING GIN (default_colors jsonb_path_ops);
