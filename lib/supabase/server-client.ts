import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Create a Supabase client with Clerk JWT authentication
 * RLS policies will automatically filter by authenticated user
 * No manual .eq('user_email', email) filtering needed!
 */
export async function createServerClient() {
  const { getToken } = await auth()
  
  // Get Clerk's JWT token configured for Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  if (!supabaseAccessToken) {
    throw new Error('No Clerk session found. User must be authenticated.')
  }

  // Create Supabase client with Clerk JWT as auth token
  // This token contains user_id and email claims that RLS policies can read
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
    },
  })
}
