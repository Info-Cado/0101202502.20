-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_color_positions;

-- Create improved function for updating positions
CREATE OR REPLACE FUNCTION update_color_positions(
  color_ids uuid[],
  new_positions integer[]
)
RETURNS void AS $$
DECLARE
  color_id uuid;
  new_pos integer;
BEGIN
  -- Validate arrays have same length
  IF array_length(color_ids, 1) != array_length(new_positions, 1) THEN
    RAISE EXCEPTION 'Arrays must have same length';
  END IF;

  -- Update positions in a single transaction
  FOR i IN 1..array_length(color_ids, 1) LOOP
    color_id := color_ids[i];
    new_pos := new_positions[i];
    
    -- Update position
    UPDATE colors
    SET position = new_pos
    WHERE id = color_id;
    
    -- Verify update
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Color with ID % not found', color_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
