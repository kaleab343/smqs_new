"use client"

import { useEffect, useState } from "react"

/**
 * Database Initializer Component
 * Automatically initializes database tables when the app starts
 */
export function DBInitializer() {
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only run once
    if (initialized) return

    const initDB = async () => {
      try {
        console.log('[SMQS] Initializing database...')
        
        const response = await fetch('/api/php/init-db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          console.log('[SMQS] ✓ Database initialized successfully')
          console.log('[SMQS] Tables status:', data.tables)
          setInitialized(true)
        } else {
          console.warn('[SMQS] Database initialization warning:', data.message)
          // Don't set error - just log the warning and continue
          setInitialized(true)
        }
      } catch (err: any) {
        console.error('[SMQS] Database initialization error:', err)
        // Don't block the app - just log the error
        setError(err?.message || 'Unknown error')
        setInitialized(true)
      }
    }

    // Run initialization after a short delay to avoid blocking initial render
    const timer = setTimeout(initDB, 500)
    
    return () => clearTimeout(timer)
  }, [initialized])

  // This component doesn't render anything visible
  return null
}
