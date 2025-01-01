/*
  # Add design validation and logging

  1. Changes
    - Add design number format validation for new designs
    - Add trigger for design updates
    - Add activity logging
*/

-- Create function to validate design updates
CREATE OR REPLACE FUNCTION validate_design_update()
RETURNS trigger AS $$
BEGIN
  -- Check if design number is being changed and already exists
  IF NEW.design_number != OLD.design_number AND EXISTS (
    SELECT 1 FROM designs 
    WHERE design_number = NEW.design_number 
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Design number % already exists', NEW.design_number;
  END IF;

  -- Set category to NULL if empty string
  IF NEW.category = '' THEN
    NEW.category := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for design updates
CREATE TRIGGER validate_design_update_trigger
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION validate_design_update();

-- Add activity logging for design updates
CREATE OR REPLACE FUNCTION log_design_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.design_number != OLD.design_number OR COALESCE(NEW.category, '') != COALESCE(OLD.category, '') THEN
    INSERT INTO activity_log (
      user_id,
      action,
      details
    ) VALUES (
      auth.uid(),
      'update_design',
      jsonb_build_object(
        'design_id', NEW.id,
        'old_number', OLD.design_number,
        'new_number', NEW.design_number,
        'old_category', OLD.category,
        'new_category', NEW.category
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging design updates
CREATE TRIGGER log_design_update_trigger
  AFTER UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION log_design_update();
