/**
 * Production-grade localStorage cache with userId-namespaced keys.
 *
 * ## Cross-account safety
 * All keys are stored as `"{userId}:{key}"`.  A different userId automatically
 * produces cache misses — the next user never sees the previous account's data,
 * even if sign-out cleanup is missed.  This is the same pattern used on Android
 * (`AppDataCache`) and iOS (`DataCache`).
 *
 * ## Usage
 * ```ts
 * const cache = webCache(user.id)
 * cache.set(CacheKey.workspaces, workspaceList)
 * const workspaces = cache.get<Workspace[]>(CacheKey.workspaces)
 * cache.remove(CacheKey.workspaces)       // optional sign-out cleanup
 * cache.clearAll()                        // wipe all known keys for this user
 * ```
 *
 * ## When to call clearAll()
 * Not needed for security — userId namespace guarantees isolation.
 * Call it as a privacy/storage cleanup at sign-out if desired.
 */

// Well-known cache keys (no userId prefix — webCache() adds that at runtime)
export const CacheKey = {
  workspaces:   'kacha_workspaces',
  displayName:  'account_displayName',
  displayEmail: 'account_displayEmail',
  theme:        'kacha_theme',
} as const

export type CacheKeyValue = (typeof CacheKey)[keyof typeof CacheKey]

export function webCache(userId: string) {
  const ns = (key: string) => `${userId}:${key}`

  return {
    /**
     * Read a JSON-encoded value from localStorage.
     * Returns `null` on SSR, missing key, or JSON parse error.
     */
    get<T>(key: string): T | null {
      if (typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem(ns(key))
        return raw !== null ? (JSON.parse(raw) as T) : null
      } catch {
        return null
      }
    },

    /** JSON-encode `value` and write it to localStorage. Ignores quota errors. */
    set(key: string, value: unknown): void {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(ns(key), JSON.stringify(value))
      } catch {
        // QuotaExceededError — fail silently; network data still displays
      }
    },

    /** Remove a single key from localStorage. */
    remove(key: string): void {
      if (typeof window === 'undefined') return
      localStorage.removeItem(ns(key))
    },

    /** Remove all known CacheKey entries for this user. */
    clearAll(): void {
      if (typeof window === 'undefined') return
      Object.values(CacheKey).forEach((k) => localStorage.removeItem(ns(k)))
    },
  }
}
