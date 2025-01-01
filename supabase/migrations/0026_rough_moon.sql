/*
  # Update color changes table structure
  
  1. Changes
    - Drop existing color_changes table
    - Create new table with proper references to design_default_colors and colors tables
    - Add indexes for performance
    - Enable RLS with public access policies
*/

-- Drop existing table
DROP TABLE IF EXISTS color_changes;

-- Create new table with proper references
CREATE TABLE color_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_match_id uuid REFERENCES design_matches(id) ON DELETE CASCADE NOT NULL,
  default_color_id uuid REFERENCES design_default_colors(id) ON DELETE CASCADE NOT NULL,
  selected_color_id uuid REFERENCES colors(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE color_changes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access"
ON color_changes FOR SELECT
USING (true);

CREATE POLICY "Public insert access"
ON color_changes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access"
ON color_changes FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access"
ON color_changes FOR DELETE
USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS color_changes_design_match_id_idx ON color_changes(design_match_id);
CREATE INDEX IF NOT EXISTS color_changes_default_color_id_idx ON color_changes(default_color_id);
CREATE INDEX IF NOT EXISTS color_changes_selected_color_id_idx ON color_changes(selected_color_id);

-- Add unique constraint to prevent duplicate color changes for same match
ALTER TABLE color_changes 
ADD CONSTRAINT unique_color_change_per_match 
UNIQUE (design_match_id, default_color_id);