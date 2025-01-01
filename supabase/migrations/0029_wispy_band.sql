/*
  # Add admin user
  
  1. Changes
    - Create admin user with specified credentials
    - Set admin user settings
*/

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS void AS $$
DECLARE
  admin_uid uuid;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_uid
  FROM auth.users
  WHERE email = 'admin@matchingmaster.com';

  -- Only create if admin doesn't exist
  IF admin_uid IS NULL THEN
    -- Insert admin into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@matchingmaster.com',
      crypt('TechInfoCado', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      encode(gen_random_bytes(32), 'hex'),
      encode(gen_random_bytes(32), 'hex')
    )
    RETURNING id INTO admin_uid;

    -- Insert admin settings
    IF admin_uid IS NOT NULL THEN
      INSERT INTO public.user_settings (id, username)
      VALUES (admin_uid, 'admin')
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute function to create admin
SELECT create_admin_user();

-- Drop function after use
DROP FUNCTION create_admin_user();
