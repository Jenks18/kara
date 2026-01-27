import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'))

if (typeof window !== 'undefined') {
  if (!isSupabaseConfigured) {
    console.error('⚠️ Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    console.error('URL:', supabaseUrl || 'missing')
    console.error('Key:', supabaseAnonKey ? 'present' : 'missing')
  } else {
    console.log('✅ Supabase configured')
  }
}

/**
 * Get an authenticated Supabase client with Clerk JWT
 * This client will pass through RLS policies
 */
export async function getSupabaseClient() {
  let authToken: string | null = null
  
  // Get Clerk session token for authentication
  if (typeof window !== 'undefined') {
    try {
      const { default: Clerk } = await import('@clerk/clerk-js')
      const clerk = (window as any).Clerk || Clerk
      authToken = await clerk?.session?.getToken({ template: 'supabase' })
      
      if (authToken) {
        console.log('✅ Got Clerk token for Supabase')
      } else {
        console.warn('⚠️ No Clerk token available')
      }
    } catch (error) {
      console.error('Failed to get Clerk token:', error)
    }
  }
  
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      global: {
        headers: authToken ? {
          Authorization: `Bearer ${authToken}`,
        } : {},
      },
    }
  )
}

// Legacy export for backwards compatibility (not authenticated)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
