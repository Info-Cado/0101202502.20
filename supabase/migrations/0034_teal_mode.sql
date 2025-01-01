/*
  # Configure realtime settings

  This migration configures proper realtime settings for the database to ensure
  stable connections and proper publication setup.
*/

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create new publication with proper table configuration
CREATE PUBLICATION supabase_realtime FOR TABLE 
  designs,
  design_matches,
  design_default_colors,
  color_changes,
  colors;

-- Configure replication identifiers for realtime tables
ALTER TABLE designs REPLICA IDENTITY FULL;
ALTER TABLE design_matches REPLICA IDENTITY FULL;
ALTER TABLE design_default_colors REPLICA IDENTITY FULL;
ALTER TABLE color_changes REPLICA IDENTITY FULL;
ALTER TABLE colors REPLICA IDENTITY FULL;
