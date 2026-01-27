import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/client'

export async function POST() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient()
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile })
    }

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
        avatar_emoji: '💼',
        avatar_color: 'from-emerald-500 to-emerald-600',
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
