/*
  # Create designs table

  1. New Tables
    - `designs`
      - `id` (uuid, primary key)
      - `design_number` (text, unique)
      - `image_url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `designs` table
    - Add policies for public access
*/

CREATE TABLE designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_number text UNIQUE NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
ON designs FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON designs FOR INSERT
WITH CHECK (true);
