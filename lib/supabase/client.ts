import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))

// Single shared client instance - use Map to store different authenticated clients
const clientCache = new Map<string, ReturnType<typeof createClient>>()
const BASE_CLIENT_KEY = '__base__'

function getSharedClient() {
  if (!clientCache.has(BASE_CLIENT_KEY)) {
    clientCache.set(BASE_CLIENT_KEY, createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          storage: undefined, // Disable storage to prevent conflicts
          storageKey: 'sb-client', // Use consistent storage key
        },
      }
    ))
  }
  return clientCache.get(BASE_CLIENT_KEY)!
}

/**
 * Get an authenticated Supabase client with Clerk JWT
 * This client will pass through RLS policies
 * Always creates fresh client with current token to avoid expiration issues
 */
export async function getSupabaseClient() {
  // Try to get Clerk auth token and create authenticated client
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk
      if (clerk && clerk.session) {
        const authToken = await clerk.session.getToken({ template: 'supabase' })
        if (authToken) {
          // Always create fresh client with current token (don't cache)
          return createClient(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseAnonKey || 'placeholder-key',
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                storage: undefined,
                storageKey: 'sb-auth-client',
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
      console.error('Error getting Clerk token:', error)
      // Silent fail - return unauthenticated client
    }
  }
  
  return getSharedClient()
}

// Legacy export - uses the same shared instance
export const supabase = getSharedClient()
