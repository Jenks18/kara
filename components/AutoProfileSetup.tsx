'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

/**
 * Auto-syncs Clerk user data to Supabase user_profiles on sign-in.
 * Uses direct Supabase client with Clerk-minted JWT — RLS enforces access.
 * No service role key, no server-side bypass.
 */
export function AutoProfileSetup() {
  const { user, isLoaded } = useUser()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!isLoaded || !user || hasRun.current) return
    
    hasRun.current = true

    const syncProfile = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { error } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: user.id,
              first_name: user.firstName || '',
              last_name: user.lastName || '',
              display_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
              user_email: user.primaryEmailAddress?.emailAddress || '',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id', ignoreDuplicates: false }
          )

        if (error) {
          console.error('Failed to sync profile:', error)
        }
      } catch (error) {
        console.error('Error syncing profile:', error)
      }
    }

    syncProfile()
  }, [user, isLoaded])

  return null
}
