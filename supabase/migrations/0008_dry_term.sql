/*
  # Add color changes validation

  1. Changes
    - Add validation function for color changes format
    - Add trigger to validate color changes on insert/update
  2. Security
    - Ensure color changes follow the required format
*/

-- Create validation function
CREATE OR REPLACE FUNCTION validate_color_changes()
RETURNS trigger AS $$
BEGIN
  -- Check if color_changes is NULL (allowed)
  IF NEW.color_changes IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate it's an array
  IF jsonb_typeof(NEW.color_changes) != 'array' THEN
    RAISE EXCEPTION 'color_changes must be an array';
  END IF;

  -- Validate array is not empty
  IF jsonb_array_length(NEW.color_changes) = 0 THEN
    RAISE EXCEPTION 'color_changes array cannot be empty';
  END IF;

  -- Validate each element has required fields and types
  FOR i IN 0..jsonb_array_length(NEW.color_changes) - 1 LOOP
    IF NOT (
      (NEW.color_changes->i) ? 'originalColor' AND
      (NEW.color_changes->i) ? 'newColor' AND
      jsonb_typeof(NEW.color_changes->i->'originalColor') = 'string' AND
      jsonb_typeof(NEW.color_changes->i->'newColor') = 'string'
    ) THEN
      RAISE EXCEPTION 'Invalid color change format at index %', i;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_color_changes_trigger ON design_matches;
CREATE TRIGGER validate_color_changes_trigger
  BEFORE INSERT OR UPDATE ON design_matches
  FOR EACH ROW
  EXECUTE FUNCTION validate_color_changes();

COMMENT ON FUNCTION validate_color_changes() IS 
'Validates color changes format in design_matches table';
