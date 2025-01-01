/*
  # Add default colors support

  1. Changes
    - Add default_colors column to designs table
    - Add validation trigger for default_colors
    - Add index for faster queries
*/

-- Add default_colors column if it doesn't exist
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS default_colors JSONB DEFAULT '[]'::jsonb;

-- Create validation function
CREATE OR REPLACE FUNCTION validate_default_colors()
RETURNS trigger AS $$
BEGIN
  -- Allow NULL or empty array
  IF NEW.default_colors IS NULL OR jsonb_array_length(NEW.default_colors) = 0 THEN
    NEW.default_colors := '[]'::jsonb;
    RETURN NEW;
  END IF;

  -- Validate array structure
  IF jsonb_typeof(NEW.default_colors) != 'array' THEN
    RAISE EXCEPTION 'default_colors must be an array';
  END IF;

  -- Validate each element
  FOR i IN 0..jsonb_array_length(NEW.default_colors) - 1 LOOP
    IF NOT (
      (NEW.default_colors->i) ? 'hex' AND
      (NEW.default_colors->i) ? 'name' AND
      jsonb_typeof(NEW.default_colors->i->'hex') = 'string' AND
      jsonb_typeof(NEW.default_colors->i->'name') = 'string' AND
      (NEW.default_colors->i->>'hex') ~ '^#[0-9A-Fa-f]{6}$'
    ) THEN
      RAISE EXCEPTION 'Invalid default color at index %. Each color must have hex and name properties.', i;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_default_colors_trigger ON designs;
CREATE TRIGGER validate_default_colors_trigger
  BEFORE INSERT OR UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION validate_default_colors();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_designs_default_colors 
ON designs USING GIN (default_colors);
