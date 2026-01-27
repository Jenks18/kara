'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { updateAvatar as updateAvatarInDB, getUserProfile } from '@/lib/api/user-profiles'

export interface Avatar {
  emoji: string
  color: string
  label?: string
}

interface AvatarContextType {
  avatar: Avatar
  setAvatar: (avatar: Avatar) => void
  isLoading: boolean
}

const defaultAvatar: Avatar = {
  emoji: '💼',
  color: 'from-emerald-500 to-emerald-600',
  label: 'Business'
}

const AvatarContext = createContext<AvatarContextType>({
  avatar: defaultAvatar,
  setAvatar: () => {},
  isLoading: true,
})

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatarState] = useState<Avatar>(() => {
    // Initialize from localStorage immediately (before hydration)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user-avatar')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved avatar:', e)
        }
      }
    }
    return defaultAvatar
  })
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoaded } = useUser()

  // Load avatar from database on mount (only once)
  useEffect(() => {
    async function loadAvatar() {
      if (!isLoaded) return
      
      console.log('🎨 Loading avatar from database...', { userId: user?.id })
      
      // Try database if user is logged in
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id)
          if (profile && profile.avatar_emoji) {
            console.log('✅ Loaded from database:', { emoji: profile.avatar_emoji, color: profile.avatar_color })
            const dbAvatar = {
              emoji: profile.avatar_emoji,
              color: profile.avatar_color,
            }
            setAvatarState(dbAvatar)
            // Also update localStorage
            localStorage.setItem('user-avatar', JSON.stringify(dbAvatar))
          }
        } catch (error) {
          console.log('ℹ️ Database not ready yet, using localStorage/default avatar')
        }
      }
      
      setIsLoading(false)
    }

    loadAvatar()
  }, [isLoaded, user?.id])

  // Save avatar to database and localStorage when it changes
  const setAvatar = async (newAvatar: Avatar) => {
    console.log('💾 Saving avatar:', newAvatar)
    setAvatarState(newAvatar)
    localStorage.setItem('user-avatar', JSON.stringify(newAvatar))
    console.log('✅ Saved to localStorage')
    
    // Save to database if user is logged in
    if (user?.id) {
      try {
        const userEmail = user.emailAddresses[0]?.emailAddress || ''
        await updateAvatarInDB(user.id, newAvatar, userEmail)
        console.log('✅ Saved to database')
      } catch (error) {
        console.error('Error saving avatar to database:', error)
      }
    }
  }

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar, isLoading }}>
      {children}
    </AvatarContext.Provider>
  )
}

export function useAvatar() {
  const context = useContext(AvatarContext)
  if (!context) {
    throw new Error('useAvatar must be used within AvatarProvider')
  }
  return context
}
