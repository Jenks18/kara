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
  const { getToken } = await auth()
  
  // Get Clerk's JWT token configured for Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  if (!supabaseAccessToken) {
    throw new Error(
      'Clerk JWT template "supabase" not found. ' +
      'Create it at: https://dashboard.clerk.com/last-active?path=jwt-templates'
    )
  }

  // Debug: Decode JWT to see what's in it
  try {
    const payload = JSON.parse(Buffer.from(supabaseAccessToken.split('.')[1], 'base64').toString())
    console.log('🔐 JWT Payload:', JSON.stringify(payload, null, 2))
    console.log('🔐 JWT Email claim:', payload.email)
    console.log('🔐 JWT Role claim:', payload.role)
    console.log('🔐 JWT Aud claim:', payload.aud)
  } catch (e) {
    console.error('❌ Failed to decode JWT:', e)
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
