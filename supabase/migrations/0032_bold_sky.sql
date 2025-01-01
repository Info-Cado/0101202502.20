/*
  # Add activity logging system
  
  1. New Tables
    - `activity_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_settings)
      - `action` (text)
      - `details` (jsonb)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on activity_log table
    - Add policies for read/write access
*/

-- Create activity log table
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_settings(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own activity"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for all authenticated users"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- Add GIN index for JSON search
CREATE INDEX idx_activity_log_details ON activity_log USING GIN (details);

COMMENT ON TABLE activity_log IS 'Stores user activity events';
