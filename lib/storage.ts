/**
 * Data Persistence Layer
 * Handles localStorage and future database integration
 */

const STORAGE_KEYS = {
  QUEUE_STATE: "smqs-queue-state",
  USER_SESSIONS: "smqs-user-sessions",
  APPOINTMENTS: "smqs-appointments",
  AUDIT_LOG: "smqs-audit-log",
}

/**
 * Generic storage manager
 */
export class StorageManager {
  static set<T>(key: string, value: T): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Failed to set ${key}:`, error)
      }
    }
  }

  static get<T>(key: string, defaultValue?: T): T | null {
    if (typeof window !== "undefined") {
      try {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : defaultValue || null
      } catch (error) {
        console.error(`Failed to get ${key}:`, error)
        return defaultValue || null
      }
    }
    return defaultValue || null
  }

  static remove(key: string): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`Failed to remove ${key}:`, error)
      }
    }
  }

  static clear(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.clear()
      } catch (error) {
        console.error("Failed to clear storage:", error)
      }
    }
  }
}

/**
 * Queue state persistence
 */
export const queueStorage = {
  saveState: (state: any) => StorageManager.set(STORAGE_KEYS.QUEUE_STATE, state),
  getState: () => StorageManager.get(STORAGE_KEYS.QUEUE_STATE),
  clear: () => StorageManager.remove(STORAGE_KEYS.QUEUE_STATE),
}

/**
 * User sessions persistence
 */
export const sessionStorage = {
  saveSessions: (sessions: any[]) => StorageManager.set(STORAGE_KEYS.USER_SESSIONS, sessions),
  getSessions: () => StorageManager.get<any[]>(STORAGE_KEYS.USER_SESSIONS, []),
  addSession: (session: any) => {
    const sessions = sessionStorage.getSessions() || []
    sessions.push(session)
    sessionStorage.saveSessions(sessions)
  },
  removeSession: (userId: string) => {
    const sessions = sessionStorage.getSessions() || []
    const filtered = sessions.filter((s) => s.userId !== userId)
    sessionStorage.saveSessions(filtered)
  },
}

/**
 * Appointments persistence
 */
export const appointmentStorage = {
  saveAppointments: (appointments: any[]) => StorageManager.set(STORAGE_KEYS.APPOINTMENTS, appointments),
  getAppointments: () => StorageManager.get<any[]>(STORAGE_KEYS.APPOINTMENTS, []),
  addAppointment: (appointment: any) => {
    const appointments = appointmentStorage.getAppointments() || []
    appointments.push({ ...appointment, id: `apt-${Date.now()}`, createdAt: new Date() })
    appointmentStorage.saveAppointments(appointments)
  },
  updateAppointment: (id: string, updates: any) => {
    const appointments = appointmentStorage.getAppointments() || []
    const index = appointments.findIndex((a) => a.id === id)
    if (index > -1) {
      appointments[index] = { ...appointments[index], ...updates, updatedAt: new Date() }
      appointmentStorage.saveAppointments(appointments)
    }
  },
}

/**
 * Audit log persistence
 */
export const auditLogStorage = {
  saveAuditLog: (logs: any[]) => StorageManager.set(STORAGE_KEYS.AUDIT_LOG, logs),
  getAuditLog: () => StorageManager.get<any[]>(STORAGE_KEYS.AUDIT_LOG, []),
  addLog: (action: string, userId: string, details: any, result: "success" | "failure") => {
    const logs = auditLogStorage.getAuditLog() || []
    logs.push({
      id: `log-${Date.now()}`,
      action,
      userId,
      details,
      result,
      timestamp: new Date(),
    })
    auditLogStorage.saveAuditLog(logs)
  },
}
