/*
  # Fix realtime subscriptions
  
  This migration ensures proper realtime functionality by:
  1. Recreating the publication with proper settings
  2. Adding necessary indexes
*/

-- Drop existing publication
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create new publication with explicit configuration
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_design_matches_original_design_id 
ON design_matches(original_design_id);

-- Set replica identity for realtime tracking
ALTER TABLE designs REPLICA IDENTITY FULL;
ALTER TABLE design_matches REPLICA IDENTITY FULL;
ALTER TABLE design_default_colors REPLICA IDENTITY FULL;
ALTER TABLE color_changes REPLICA IDENTITY FULL;
ALTER TABLE colors REPLICA IDENTITY FULL;
