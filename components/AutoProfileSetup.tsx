'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

/**
 * Auto-creates user profile in Supabase when user signs in for the first time
 * This runs in the layout so profiles are created automatically
 */
export function AutoProfileSetup() {
  const { user, isLoaded } = useUser()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!isLoaded || !user || hasRun.current) return
    
    hasRun.current = true

    const createProfile = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            display_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
            user_email: user.primaryEmailAddress?.emailAddress || '',
          }),
        })

        if (!response.ok) {
          console.error('Failed to create profile:', await response.text())
        } else {
          console.log('✅ Profile created/updated successfully')
        }
      } catch (error) {
        console.error('Error creating profile:', error)
      }
    }

    createProfile()
  }, [user, isLoaded])

  return null
}
