/*
  # Add Matching Limit Constraint
  
  1. Changes
    - Add trigger to enforce maximum of 1 matching per design
    - Update existing policies to maintain data integrity
*/

-- Create function to check matching limit
CREATE OR REPLACE FUNCTION check_matching_limit()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM design_matches
    WHERE original_design_id = NEW.original_design_id
  ) >= 1 THEN
    RAISE EXCEPTION 'Maximum of 1 matching per design is allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce limit
DROP TRIGGER IF EXISTS enforce_matching_limit ON design_matches;
CREATE TRIGGER enforce_matching_limit
  BEFORE INSERT ON design_matches
  FOR EACH ROW
  EXECUTE FUNCTION check_matching_limit();
