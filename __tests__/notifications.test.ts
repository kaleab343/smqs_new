/**
 * Notifications Tests
 */

import { addNotification, removeNotification, getNotifications, subscribeToNotifications } from "@/lib/notifications"
import { jest } from "@jest/globals"

describe("Notifications", () => {
  beforeEach(() => {
    // Clear notifications before each test
    const notifications = getNotifications()
    notifications.forEach((n) => removeNotification(n.id))
  })

  describe("addNotification", () => {
    it("should add notification with unique id", () => {
      const notif = addNotification("success", "Test", "Test message")

      expect(notif.id).toBeDefined()
      expect(notif.type).toBe("success")
      expect(notif.title).toBe("Test")
    })

    it("should be available in getNotifications", () => {
      addNotification("info", "Info", "Info message")
      const notifications = getNotifications()

      expect(notifications.length).toBeGreaterThan(0)
    })
  })

  describe("removeNotification", () => {
    it("should remove notification by id", () => {
      const notif = addNotification("success", "Test", "Test message")
      removeNotification(notif.id)

      const notifications = getNotifications()
      expect(notifications.find((n) => n.id === notif.id)).toBeUndefined()
    })
  })

  describe("subscribeToNotifications", () => {
    it("should notify subscribers of changes", (done) => {
      const callback = jest.fn()
      subscribeToNotifications(callback)

      addNotification("success", "Test", "Test message")

      // Give callback time to execute
      setTimeout(() => {
        expect(callback).toHaveBeenCalled()
        done()
      }, 10)
    })
  })
})
