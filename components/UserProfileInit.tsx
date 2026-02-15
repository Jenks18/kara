'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export function UserProfileInit() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    async function initProfile() {
      if (!isLoaded || !user) return

      try {
        // Add timeout to prevent hanging auth process
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch('/api/user-profile/init', {
          method: 'POST',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          console.error('Profile init failed:', response.status)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error initializing user profile:', error)  
        }
        // Don't block UI - continue silently
      }
    }

    initProfile()
  }, [user, isLoaded])

  return null
}
