/*
  # Create admin user

  1. Changes
    - Create admin user in auth.users with correct structure
    - Add corresponding user_settings entry
*/

-- Create admin user
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  -- Create admin user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    confirmation_sent_at
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@matchingmaster.com',
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "admin"}',
    false,
    crypt('TechInfoCado', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@matchingmaster.com'
  )
  RETURNING id INTO admin_uid;

  -- Create user settings if admin was created
  IF admin_uid IS NOT NULL THEN
    INSERT INTO user_settings (id, username)
    VALUES (admin_uid, 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
