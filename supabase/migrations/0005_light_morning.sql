/*
  # Add matching designs support
  
  1. New Tables
    - `design_matches`
      - `id` (uuid, primary key)
      - `original_design_id` (uuid, references designs)
      - `matching_image_url` (text)
      - `created_at` (timestamp)
  
  2. Changes
    - Add foreign key constraint to link matches with original designs
  
  3. Security
    - Enable RLS
    - Add policies for public access
*/

CREATE TABLE design_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_design_id uuid REFERENCES designs(id) NOT NULL,
  matching_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE design_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
ON design_matches FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON design_matches FOR INSERT
WITH CHECK (true);
