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

// Store original fetch once
let originalFetch: any = null

/**
 * Get authenticated Supabase client with fresh Clerk JWT
 * 
 * TRUE SINGLETON APPROACH:
 * - Only ONE Supabase client instance ever created
 * - ONE GoTrueClient = no multiple instance warnings
 * - Gets fresh Clerk JWT on EVERY request (prevents expiration)
 * - Sets Authorization header dynamically
 * - Properly integrates with Clerk auth lifecycle
 */
export async function getSupabaseClient() {
  const client = getGlobalClient()
  
  // Wrap fetch ONCE to get fresh token on every request
  if (typeof window !== 'undefined' && !originalFetch) {
    originalFetch = client.rest.fetch
    
    client.rest.fetch = async (url: string, options: any = {}) => {
      try {
        const clerk = (window as any).Clerk
        if (clerk && clerk.session) {
          // Get FRESH token for this request
          const token = await clerk.session.getToken({ template: 'supabase' })
          if (token) {
            return originalFetch.call(client.rest, url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error getting Clerk token:', error)
      }
      
      // Fallback without token
      return originalFetch.call(client.rest, url, options)
    }
  }
  
  return client
}

// Export the same global instance
export const supabase = getGlobalClient()
