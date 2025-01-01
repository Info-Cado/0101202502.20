/*
  # Add color changes tracking table

  1. New Tables
    - `color_changes`
      - `id` (uuid, primary key)
      - `design_match_id` (uuid, references design_matches)
      - `original_color` (text, hex color)
      - `new_color` (text, hex color)
      - `name` (text, screen name)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `color_changes` table
    - Add policies for public access
*/

-- Create color changes table
CREATE TABLE color_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_match_id uuid REFERENCES design_matches(id) ON DELETE CASCADE NOT NULL,
  original_color text NOT NULL,
  new_color text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add hex color validation
CREATE OR REPLACE FUNCTION validate_hex_colors()
RETURNS trigger AS $$
BEGIN
  -- Validate original color hex format
  IF NOT (NEW.original_color ~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Invalid original hex color format. Must be #RRGGBB';
  END IF;

  -- Validate new color hex format
  IF NOT (NEW.new_color ~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Invalid new hex color format. Must be #RRGGBB';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hex validation
CREATE TRIGGER validate_hex_colors_trigger
  BEFORE INSERT OR UPDATE ON color_changes
  FOR EACH ROW
  EXECUTE FUNCTION validate_hex_colors();

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

-- Create index for faster lookups
CREATE INDEX idx_color_changes_design_match_id ON color_changes(design_match_id);
