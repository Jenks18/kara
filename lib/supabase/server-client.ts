import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Create a Supabase client with Clerk JWT authentication
 * RLS policies will automatically filter by authenticated user
 * No manual .eq('user_email', email) filtering needed!
 * 
 * REQUIRES: Clerk JWT template named "supabase" to be configured
 */
export async function createServerClient() {
  const { getToken } = await auth()
  
  // Get Clerk's JWT token configured for Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  if (!supabaseAccessToken) {
    console.warn('⚠️ No Clerk "supabase" JWT template found. Setup incomplete!')
    console.warn('Falling back to service role for now...')
    // Fallback to service role until JWT is configured
    return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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
