/*
  # Fix realtime subscriptions and optimize performance
  
  This migration improves realtime functionality by:
  1. Configuring publication settings
  2. Setting up proper replica identity
  3. Adding performance indexes
*/

-- First ensure we have the required tables
DO $$ 
BEGIN
  -- Add performance indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'design_matches' 
    AND indexname = 'idx_design_matches_original_design_id'
  ) THEN
    CREATE INDEX idx_design_matches_original_design_id 
    ON design_matches(original_design_id);
  END IF;
END $$;

-- Set replica identity for each table
ALTER TABLE designs REPLICA IDENTITY FULL;
ALTER TABLE design_matches REPLICA IDENTITY FULL;
ALTER TABLE design_default_colors REPLICA IDENTITY FULL;
ALTER TABLE color_changes REPLICA IDENTITY FULL;
ALTER TABLE colors REPLICA IDENTITY FULL;

-- Create publication for realtime updates
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  designs,
  design_matches,
  design_default_colors,
  color_changes,
  colors;
