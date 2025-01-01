/*
  # Add default colors to designs

  1. Changes
    - Add default_colors column to designs table to store the default colors
    
  2. Schema Details
    - default_colors: JSONB array of objects containing:
      - hex: color hex value
      - name: color name
*/

ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS default_colors JSONB DEFAULT '[]'::jsonb;

-- Add validation for default colors
CREATE OR REPLACE FUNCTION validate_default_colors()
RETURNS trigger AS $$
BEGIN
  -- Check if default_colors is NULL (allowed)
  IF NEW.default_colors IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate it's an array
  IF jsonb_typeof(NEW.default_colors) != 'array' THEN
    RAISE EXCEPTION 'default_colors must be an array';
  END IF;

  -- Validate each element has required fields and types
  FOR i IN 0..jsonb_array_length(NEW.default_colors) - 1 LOOP
    IF NOT (
      (NEW.default_colors->i) ? 'hex' AND
      (NEW.default_colors->i) ? 'name' AND
      jsonb_typeof(NEW.default_colors->i->'hex') = 'string' AND
      jsonb_typeof(NEW.default_colors->i->'name') = 'string'
    ) THEN
      RAISE EXCEPTION 'Invalid default color format at index %', i;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_default_colors_trigger
  BEFORE INSERT OR UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION validate_default_colors();
