'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function UserProfileInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    async function initProfile() {
      if (!isLoaded || !user) return

      try {
        await fetch('/api/user-profile/init', {
          method: 'POST',
        })
      } catch (error) {
        console.error('Error initializing user profile:', error)
      }
    }

    initProfile()
  }, [user, isLoaded])

  return null
}
