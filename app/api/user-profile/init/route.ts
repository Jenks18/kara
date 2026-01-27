import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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
      console.log('Profile already exists for user:', userId)
      return NextResponse.json({ profile: existingProfile })
    }

    console.log('Creating new profile for user:', userId)
    
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

    console.log('Successfully created profile for user:', userId)
    return NextResponse.json({ profile: newProfile })
  } catch (error) {
    console.error('Error in user profile init:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
