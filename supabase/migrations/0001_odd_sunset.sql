/*
  # Create colors table and policies

  1. New Tables
    - `colors`
      - `id` (uuid, primary key)
      - `hex` (text, color hex code)
      - `name` (text, color name)
      - `categories` (text[], array of category names)
      - `created_at` (timestamptz)
      - `position` (integer, for ordering)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `colors` table
    - Add policies for:
      - Select: Allow authenticated users to read all colors
      - Insert: Allow authenticated users to insert their own colors
      - Update: Allow users to update their own colors
      - Delete: Allow users to delete their own colors
*/

-- Create colors table
CREATE TABLE IF NOT EXISTS colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hex text NOT NULL,
  name text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  position integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view colors"
  ON colors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own colors"
  ON colors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own colors"
  ON colors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own colors"
  ON colors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS colors_position_idx ON colors (position);
