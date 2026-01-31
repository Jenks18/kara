import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Animal avatars for random selection
const ANIMAL_AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎',
  '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟',
  '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧'
]

function getRandomAnimalAvatar() {
  return ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)]
}

export async function POST() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Don't throw error if no rows

    if (fetchError) {
      console.error('Error checking for existing profile:', fetchError)
    }

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile })
    }

    
    // Get Gmail profile picture if available
    const gmailImage = user.imageUrl || null
    
    // Create new profile with default values
    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        user_email: user.emailAddresses[0]?.emailAddress || '',
        display_name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.username || '',
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        avatar_emoji: gmailImage ? '' : getRandomAnimalAvatar(),
        avatar_color: 'from-emerald-500 to-emerald-600',
        avatar_image_url: gmailImage,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: newProfile })
  } catch (error) {
    console.error('Error in user profile init:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
