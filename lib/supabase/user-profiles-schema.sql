-- User Profiles Table
-- Stores extended user profile information linked to Clerk user_id

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL, -- Clerk user ID
  user_email TEXT NOT NULL,
  
  -- Public Profile Information
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_emoji TEXT DEFAULT '💼',
  avatar_color TEXT DEFAULT 'from-emerald-500 to-emerald-600',
  avatar_image_url TEXT, -- URL to uploaded profile picture
  
  -- Contact Information
  phone_number TEXT,
  
  -- Private Information
  legal_first_name TEXT,
  legal_last_name TEXT,
  date_of_birth DATE,
  
  -- Address Information
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_email CHECK (user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(user_email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- RLS Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (
    user_email = auth.jwt() ->> 'email'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (
    user_email = auth.jwt() ->> 'email'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (
    user_email = auth.jwt() ->> 'email'
    OR user_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    user_email = auth.jwt() ->> 'email'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- RLS Policy: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  USING (
    user_email = auth.jwt() ->> 'email'
    OR user_id = auth.jwt() ->> 'sub'
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Trigger to call the function before update
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create or update user profile function (upsert)
CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id TEXT,
  p_user_email TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_avatar_emoji TEXT DEFAULT NULL,
  p_avatar_color TEXT DEFAULT NULL,
  p_avatar_image_url TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_legal_first_name TEXT DEFAULT NULL,
  p_legal_last_name TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_address_line1 TEXT DEFAULT NULL,
  p_address_line2 TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip_code TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL
)
RETURNS user_profiles AS $$
DECLARE
  v_profile user_profiles;
BEGIN
  INSERT INTO user_profiles (
    user_id,
    user_email,
    display_name,
    first_name,
    last_name,
    avatar_emoji,
    avatar_color,
    avatar_image_url,
    phone_number,
    legal_first_name,
    legal_last_name,
    date_of_birth,
    address_line1,
    address_line2,
    city,
    state,
    zip_code,
    country
  )
  VALUES (
    p_user_id,
    p_user_email,
    p_display_name,
    p_first_name,
    p_last_name,
    COALESCE(p_avatar_emoji, '💼'),
    COALESCE(p_avatar_color, 'from-emerald-500 to-emerald-600'),
    p_avatar_image_url,
    p_phone_number,
    p_legal_first_name,
    p_legal_last_name,
    p_date_of_birth,
    p_address_line1,
    p_address_line2,
    p_city,
    p_state,
    p_zip_code,
    p_country
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    avatar_emoji = COALESCE(EXCLUDED.avatar_emoji, user_profiles.avatar_emoji),
    avatar_color = COALESCE(EXCLUDED.avatar_color, user_profiles.avatar_color),
    avatar_image_url = COALESCE(EXCLUDED.avatar_image_url, user_profiles.avatar_image_url),
    phone_number = COALESCE(EXCLUDED.phone_number, user_profiles.phone_number),
    legal_first_name = COALESCE(EXCLUDED.legal_first_name, user_profiles.legal_first_name),
    legal_last_name = COALESCE(EXCLUDED.legal_last_name, user_profiles.legal_last_name),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, user_profiles.date_of_birth),
    address_line1 = COALESCE(EXCLUDED.address_line1, user_profiles.address_line1),
    address_line2 = COALESCE(EXCLUDED.address_line2, user_profiles.address_line2),
    city = COALESCE(EXCLUDED.city, user_profiles.city),
    state = COALESCE(EXCLUDED.state, user_profiles.state),
    zip_code = COALESCE(EXCLUDED.zip_code, user_profiles.zip_code),
    country = COALESCE(EXCLUDED.country, user_profiles.country),
    updated_at = NOW()
  RETURNING * INTO v_profile;
  
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql;
