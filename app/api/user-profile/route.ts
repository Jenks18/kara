import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function PATCH(request: NextRequest) {
  try {
    // Get userId from Clerk session (webapp only)
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await request.json()
    const { first_name, last_name, display_name, user_email } = body

    console.log('📝 Updating user profile for:', userId)
    console.log('Updates:', { first_name, last_name, display_name, user_email })

    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const updates: any = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updates.first_name = first_name
    if (last_name !== undefined) updates.last_name = last_name
    if (display_name !== undefined) updates.display_name = display_name
    if (user_email !== undefined) updates.user_email = user_email

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(updates, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating profile:', error)
      return NextResponse.json(
        { error: 'Failed to update profile', details: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('✅ Profile updated successfully')

    return NextResponse.json(
      { success: true, profile: data },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('❌ Error in profile update:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
