/**
 * Database Initialization Utility
 * Automatically initializes database tables on app startup
 */

let initializationAttempted = false
let initializationSuccess = false

export async function initializeDatabase(): Promise<boolean> {
  // Only attempt once per app lifecycle
  if (initializationAttempted) {
    return initializationSuccess
  }
  
  initializationAttempted = true
  
  try {
    console.log('[DB-Init] Starting database initialization...')
    
    const response = await fetch('/api/php/init-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      console.log('[DB-Init] ✓ Database initialized successfully')
      console.log('[DB-Init] Tables:', data.tables)
      initializationSuccess = true
      return true
    } else {
      console.error('[DB-Init] ✗ Database initialization failed:', data.message)
      initializationSuccess = false
      return false
    }
  } catch (error) {
    console.error('[DB-Init] ✗ Database initialization error:', error)
    initializationSuccess = false
    return false
  }
}

/**
 * Initialize database with retry logic
 */
export async function initializeDatabaseWithRetry(maxRetries = 3, delayMs = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DB-Init] Attempt ${attempt}/${maxRetries}`)
    
    const success = await initializeDatabase()
    if (success) {
      return true
    }
    
    if (attempt < maxRetries) {
      console.log(`[DB-Init] Retrying in ${delayMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  console.error('[DB-Init] Failed after all retry attempts')
  return false
}

/**
 * Check if database tables exist
 */
export async function checkDatabaseTables(): Promise<{ allExist: boolean; tables: Record<string, boolean> }> {
  try {
    const response = await fetch('/api/php/ping', {
      method: 'GET',
    })
    
    if (response.ok) {
      return { allExist: true, tables: {} }
    }
    
    return { allExist: false, tables: {} }
  } catch (error) {
    console.error('[DB-Init] Error checking database tables:', error)
    return { allExist: false, tables: {} }
  }
}
