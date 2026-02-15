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
 * Extract headers into a plain Record, handling both Headers instances
 * and plain objects. This prevents the bug where spreading a Headers
 * instance produces {} and drops Content-Type (causing PGRST102).
 */
function headersToRecord(headers: any): Record<string, string> {
  const result: Record<string, string> = {}
  if (!headers) return result
  if (headers instanceof Headers) {
    headers.forEach((value: string, key: string) => {
      result[key] = value
    })
  } else if (typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) result[key] = String(value)
    })
  }
  return result
}

/**
 * Get authenticated Supabase client with fresh Clerk JWT.
 *
 * TRUE SINGLETON + RLS APPROACH:
 * - Only ONE Supabase client instance ever created
 * - Gets fresh Clerk-minted Supabase JWT on EVERY request
 * - Properly preserves ALL headers (Content-Type, Prefer, etc.)
 * - RLS policies enforce access at the database level
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
          // Get FRESH Supabase-compatible JWT from Clerk
          const token = await clerk.session.getToken({ template: 'supabase' })
          if (token) {
            // Safely merge all existing headers + auth token
            const existingHeaders = headersToRecord(options.headers)
            return originalFetch.call(client.rest, url, {
              ...options,
              headers: {
                ...existingHeaders,
                Authorization: `Bearer ${token}`,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error getting Clerk token:', error)
        // Continue without token instead of hanging
      }
      
      // Fallback without token
      return originalFetch.call(client.rest, url, options)
    }
  }
  
  return client
}

// Export the same global instance
export const supabase = getGlobalClient()
