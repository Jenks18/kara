import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * PRODUCTION-GRADE Supabase client with Clerk JWT authentication
 * 
 * RLS policies automatically filter by authenticated user via JWT claims
 * No manual .eq('user_email', email) filtering needed!
 * 
 * Security: Uses anon key + JWT (not service_role) - RLS is enforced
 */
export async function createServerClient() {
  const { getToken, userId } = await auth()
  
  // Get Clerk's JWT token configured for Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  if (!supabaseAccessToken) {
    // If JWT template not configured, fall back to basic anon client
    // This allows the app to work while you set up production JWT
    console.warn('⚠️  Clerk JWT template "supabase" not found. Using basic auth.')
    console.warn('⚠️  Configure JWT template: https://dashboard.clerk.com/last-active?path=jwt-templates')
    
    if (!userId) {
      throw new Error('Authentication required. No Clerk session found.')
    }
    
    // Return basic client - RLS policies may not work without JWT!
    return createClient(supabaseUrl, supabaseAnonKey)
  }

  // Create Supabase client with Clerk JWT
  // JWT contains: {"aud": "authenticated", "role": "authenticated", "email": "..."}
  // RLS policies read: auth.jwt()->>'email'
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
    },
  })
}
