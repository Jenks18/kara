import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))

// Single shared client instance - use Map to cache by user/token combo
const clientCache = new Map<string, { client: ReturnType<typeof createClient>, timestamp: number }>()
const BASE_CLIENT_KEY = '__base__'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getSharedClient() {
  const cached = clientCache.get(BASE_CLIENT_KEY)
  if (cached) {
    return cached.client
  }
  
  const client = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined, // Disable storage to prevent conflicts
      },
    }
  )
  
  clientCache.set(BASE_CLIENT_KEY, { client, timestamp: Date.now() })
  return client
}

/**
 * Get an authenticated Supabase client with Clerk JWT
 * This client will pass through RLS policies
 * Caches clients for 5 minutes to avoid multiple instances
 */
export async function getSupabaseClient() {
  // Try to get Clerk auth token and create authenticated client
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk
      if (clerk && clerk.session) {
        const authToken = await clerk.session.getToken({ template: 'supabase' })
        if (authToken) {
          // Use user ID as cache key to avoid multiple instances per user
          const userId = clerk.user?.id || 'unknown'
          const cacheKey = `auth_${userId}`
          const now = Date.now()
          
          // Check if we have a valid cached client
          const cached = clientCache.get(cacheKey)
          if (cached && (now - cached.timestamp) < CACHE_DURATION) {
            return cached.client
          }
          
          // Create new authenticated client
          const client = createClient(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseAnonKey || 'placeholder-key',
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                storage: undefined,
              },
              global: {
                headers: {
                  Authorization: `Bearer ${authToken}`,
                },
              },
            }
          )
          
          clientCache.set(cacheKey, { client, timestamp: now })
          return client
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
