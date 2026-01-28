import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))

// Single shared client instance
let sharedClient: ReturnType<typeof createClient> | null = null

function getSharedClient() {
  if (!sharedClient) {
    sharedClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }
  return sharedClient
}

/**
 * Get an authenticated Supabase client with Clerk JWT
 * This client will pass through RLS policies
 */
export async function getSupabaseClient() {
  const client = getSharedClient()
  
  // Try to get Clerk auth token and create authenticated client
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk
      if (clerk && clerk.session) {
        const authToken = await clerk.session.getToken({ template: 'supabase' })
        if (authToken) {
          // Create a new client with the auth token in global headers
          return createClient(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseAnonKey || 'placeholder-key',
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
              global: {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                },
              },
            }
          )
        }
      }
    } catch (error) {
      // Silent fail - return unauthenticated client
    }
  }
  
  return client
}

// Legacy export - uses the same shared instance
export const supabase = getSharedClient()
