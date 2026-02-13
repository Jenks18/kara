-- ==========================================
-- SECURE USER PROFILE CREATION FUNCTION
-- Better alternative to service role key
-- ==========================================

-- This function runs with elevated privileges (SECURITY DEFINER)
-- but is restricted to ONLY creating user profiles
-- Much safer than using service role key with unlimited access

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_username TEXT
)
RETURNS user_profiles
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  new_profile user_profiles;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Split full_name into first and last names
  IF p_full_name IS NOT NULL THEN
    v_first_name := split_part(p_full_name, ' ', 1);
    v_last_name := CASE 
      WHEN array_length(string_to_array(p_full_name, ' '), 1) > 1 
      THEN substring(p_full_name from length(v_first_name) + 2)
      ELSE NULL
    END;
  END IF;

  -- Insert new user profile (column names match user_profiles table)
  INSERT INTO user_profiles (
    user_id,
    user_email,
    display_name,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    p_clerk_user_id,
    p_email,
    p_username,  -- Use username as display_name
    v_first_name,
    v_last_name,
    NOW(),
    NOW()
  )
  RETURNING * INTO new_profile;
  
  RETURN new_profile;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'User profile already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

-- Grant execute to anon role (for sign-up before auth)
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;

-- ==========================================
-- USAGE FROM API ENDPOINT
-- ==========================================

/*
Instead of using service role key, use regular anon client:

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // ✅ Anon key, not service role
);

// Call the secure function
const { data, error } = await supabase
  .rpc('create_user_profile', {
    p_clerk_user_id: clerkUserId,
    p_email: email,
    p_full_name: fullName,
    p_username: username,
  });

Benefits:
✅ Function has limited scope (can only create user profiles)
✅ No service role key with unlimited access
✅ Follows principle of least privilege
✅ Still bypasses RLS for initial profile creation
✅ Better security if endpoint has bugs
*/
