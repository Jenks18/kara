'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function UserProfileInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    async function initProfile() {
      if (!isLoaded || !user) return

      try {
        const response = await fetch('/api/user-profile/init', {
          method: 'POST',
        })
        
        if (!response.ok) {
          console.error('Profile init failed:', response.status)
        }
      } catch (error) {
        console.error('Error initializing user profile:', error)
        // Don't block UI - continue silently
      }
    }

    initProfile()
  }, [user, isLoaded])

  return null
}
