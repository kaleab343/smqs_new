/**
 * Notification System
 * Manages toast notifications for real-time updates
 */

export type NotificationType = "success" | "error" | "info" | "warning"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
}

// In-memory notification store (TODO: Replace with real notification service)
let notifications: Notification[] = []
let notificationCallbacks: ((notifications: Notification[]) => void)[] = []

/**
 * Add notification
 */
export function addNotification(type: NotificationType, title: string, message: string): Notification {
  const notification: Notification = {
    id: `notif-${Date.now()}`,
    type,
    title,
    message,
    timestamp: new Date(),
  }

  notifications.push(notification)
  notifySubscribers()

  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeNotification(notification.id)
  }, 5000)

  return notification
}

/**
 * Remove notification
 */
export function removeNotification(id: string): void {
  notifications = notifications.filter((n) => n.id !== id)
  notifySubscribers()
}

/**
 * Get all notifications
 */
export function getNotifications(): Notification[] {
  return [...notifications]
}

/**
 * Subscribe to notification changes
 */
export function subscribeToNotifications(callback: (notifications: Notification[]) => void): () => void {
  notificationCallbacks.push(callback)

  // Return unsubscribe function
  return () => {
    notificationCallbacks = notificationCallbacks.filter((cb) => cb !== callback)
  }
}

/**
 * Notify all subscribers
 */
function notifySubscribers(): void {
  notificationCallbacks.forEach((cb) => cb(getNotifications()))
}

/**
 * Notification templates for common events
 */
export const notificationTemplates = {
  patientJoinedQueue: (name: string, position: number) => ({
    type: "success" as const,
    title: "Patient Added to Queue",
    message: `${name} has been added to queue at position ${position}`,
  }),

  patientCalled: (name: string) => ({
    type: "info" as const,
    title: "Patient Called",
    message: `${name} has been called for consultation`,
  }),

  consultationStarted: (doctorName: string) => ({
    type: "info" as const,
    title: "Consultation Started",
    message: `Your consultation with ${doctorName} is starting`,
  }),

  consultationCompleted: (name: string, duration: number) => ({
    type: "success" as const,
    title: "Consultation Completed",
    message: `${name}'s consultation completed in ${duration} minutes`,
  }),

  queueError: (message: string) => ({
    type: "error" as const,
    title: "Queue Error",
    message,
  }),

  appointmentReminder: (doctorName: string, time: string) => ({
    type: "warning" as const,
    title: "Appointment Reminder",
    message: `Your appointment with ${doctorName} is at ${time}`,
  }),
}
