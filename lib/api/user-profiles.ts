import { supabase } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  user_id: string
  user_email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_emoji: string
  avatar_color: string
  avatar_image_url: string | null
  phone_number: string | null
  legal_first_name: string | null
  legal_last_name: string | null
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string
  created_at: string
  updated_at: string
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...updates,
    })
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

export async function updateAvatar(
  userId: string,
  avatar: { emoji: string; color: string },
  userEmail?: string
): Promise<boolean> {
  const updateData: any = {
    user_id: userId,
    avatar_emoji: avatar.emoji,
    avatar_color: avatar.color,
  }
  
  if (userEmail) {
    updateData.user_email = userEmail
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(updateData)

  if (error) {
    console.error('Error updating avatar:', error)
    return false
  }

  return true
}
