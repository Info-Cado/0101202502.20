/*
  # Add matching number to design matches

  1. Changes
    - Add matching_number column to design_matches table
    - Create sequence for matching numbers per design
    - Add trigger to automatically set matching number
*/

-- Add matching_number column
ALTER TABLE design_matches
ADD COLUMN matching_number integer;

-- Create function to get next matching number
CREATE OR REPLACE FUNCTION get_next_matching_number(design_id uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(matching_number), 0) + 1
  INTO next_number
  FROM design_matches
  WHERE original_design_id = design_id;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set matching number
CREATE OR REPLACE FUNCTION set_matching_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.matching_number := get_next_matching_number(NEW.original_design_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_matching_number_trigger
BEFORE INSERT ON design_matches
FOR EACH ROW
EXECUTE FUNCTION set_matching_number();
