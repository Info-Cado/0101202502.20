/*
  # Remove matching limit

  1. Changes
    - Drop the trigger and function that enforces the one matching per design limit
    - This allows users to create multiple matchings for each design
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS enforce_matching_limit ON design_matches;

-- Then drop the function
DROP FUNCTION IF EXISTS check_matching_limit;
