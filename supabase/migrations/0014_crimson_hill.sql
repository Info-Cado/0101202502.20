/*
  # Create default colors table

  1. New Tables
    - `design_default_colors`
      - `id` (uuid, primary key)
      - `design_id` (uuid, references designs)
      - `hex` (text)
      - `name` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `design_default_colors` table
    - Add policies for public access
*/

-- Create default colors table
CREATE TABLE design_default_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id uuid REFERENCES designs(id) ON DELETE CASCADE NOT NULL,
  hex text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE design_default_colors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
ON design_default_colors FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON design_default_colors FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
ON design_default_colors FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_design_default_colors_design_id ON design_default_colors(design_id);

-- Add hex color validation
CREATE OR REPLACE FUNCTION validate_hex_color()
RETURNS trigger AS $$
BEGIN
  IF NOT (NEW.hex ~ '^#[0-9A-Fa-f]{6}$') THEN
    RAISE EXCEPTION 'Invalid hex color format. Must be #RRGGBB';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_hex_color_trigger
  BEFORE INSERT OR UPDATE ON design_default_colors
  FOR EACH ROW
  EXECUTE FUNCTION validate_hex_color();
