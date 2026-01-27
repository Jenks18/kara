'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Avatar {
  emoji: string
  color: string
}

interface AvatarContextType {
  avatar: Avatar
  setAvatar: (avatar: Avatar) => void
}

const defaultAvatar: Avatar = {
  emoji: '🦁',
  color: 'from-emerald-500 to-emerald-600'
}

const AvatarContext = createContext<AvatarContextType>({
  avatar: defaultAvatar,
  setAvatar: () => {},
})

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatar, setAvatarState] = useState<Avatar>(defaultAvatar)

  // Load avatar from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('user-avatar')
    if (saved) {
      try {
        setAvatarState(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load avatar:', e)
      }
    }
  }, [])

  // Save avatar to localStorage when it changes
  const setAvatar = (newAvatar: Avatar) => {
    setAvatarState(newAvatar)
    localStorage.setItem('user-avatar', JSON.stringify(newAvatar))
  }

  return (
    <AvatarContext.Provider value={{ avatar, setAvatar }}>
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
