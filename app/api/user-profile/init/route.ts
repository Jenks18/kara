import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server-client'

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
    
    // Clerk-authenticated Supabase client — RLS enforced, no service role bypass
    const supabase = await createServerClient()
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // Don't throw error if no rows

    if (fetchError) {
      console.error('Error checking for existing profile:', fetchError?.message || fetchError)
    }

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile })
    }

    
    // Get Gmail profile picture if available
    const gmailImage = user.imageUrl || null
    
    // Use username as display name, leave first/last name blank for user to fill
    const displayName = user.username || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'
    
    // Create new profile with default values
    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        user_email: user.emailAddresses[0]?.emailAddress || '',
        display_name: displayName,
        first_name: '',  // Leave blank - user will fill manually
        last_name: '',   // Leave blank - user will fill manually
        avatar_emoji: gmailImage ? '' : getRandomAnimalAvatar(),
        avatar_color: 'from-blue-500 to-blue-600',
        avatar_image_url: gmailImage,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user profile:', error instanceof Error ? error.message : String(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create a default "Personal" workspace for the new user
    try {
      const { data: existingWorkspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (!existingWorkspaces || existingWorkspaces.length === 0) {
        const { error: wsError } = await supabase
          .from('workspaces')
          .insert({
            user_id: userId,
            owner_id: userId,
            name: 'Personal',
            avatar: '💼',
            currency: 'KES',
            currency_symbol: 'KSh',
            is_active: true,
            is_default: true,
          })

        if (wsError) {
          // Non-fatal: log but don't fail the profile init
          console.warn('Could not create default workspace:', wsError.message)
        }
      }
    } catch (wsErr) {
      console.warn('Default workspace creation failed:', wsErr)
    }

    return NextResponse.json({ profile: newProfile })
  } catch (error) {
    console.error('Error in user profile init:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
