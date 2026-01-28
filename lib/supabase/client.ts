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
  
  // Try to get Clerk auth token and set it on the client
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk
      if (clerk && clerk.session) {
        const authToken = await clerk.session.getToken({ template: 'supabase' })
        if (authToken) {
          // Set the auth header on existing client using set method
          client.rest.headers.set('Authorization', `Bearer ${authToken}`)
        }
      }
    } catch (error) {
      // Silent fail - client still works without auth
    }
  }
  
  return client
}

// Legacy export - uses the same shared instance
export const supabase = getSharedClient()
