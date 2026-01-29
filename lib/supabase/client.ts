import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))

// Single global Supabase client - TRUE SINGLETON
let globalClient: any = null

/**
 * Get or create the single global Supabase client
 */
function getGlobalClient() {
  if (!globalClient) {
    globalClient = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      }
    )
  }
  return globalClient
}

/**
 * Get authenticated Supabase client with fresh Clerk JWT
 * 
 * TRUE SINGLETON APPROACH:
 * - Only ONE Supabase client instance ever created
 * - ONE GoTrueClient = no multiple instance warnings
 * - Gets fresh Clerk JWT on each call via await
 * - Sets Authorization header on the client's fetch wrapper
 * - Properly integrates with Clerk auth lifecycle
 */
export async function getSupabaseClient() {
  const client = getGlobalClient()
  
  // Get fresh Clerk token and set on client
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk
      if (clerk && clerk.session) {
        const token = await clerk.session.getToken({ template: 'supabase' })
        if (token) {
          // Set authorization header on the client's internal fetch
          // This works because Supabase uses a wrapped fetch internally
          const originalFetch = client.rest.fetch
          client.rest.fetch = async (url: string, options: any = {}) => {
            return originalFetch.call(client.rest, url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
              },
            })
          }
        }
      }
    } catch (error) {
      console.error('Error getting Clerk token:', error)
    }
  }
  
  return client
}

// Export the same global instance
export const supabase = getGlobalClient()
