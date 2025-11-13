/**
 * Storage Tests
 */

import { StorageManager, appointmentStorage } from "@/lib/storage"

describe("StorageManager", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== "undefined") {
      localStorage.clear()
    }
  })

  describe("set and get", () => {
    it("should store and retrieve data", () => {
      const testData = { name: "John", age: 30 }
      StorageManager.set("test", testData)

      const retrieved = StorageManager.get("test")

      expect(retrieved).toEqual(testData)
    })

    it("should return default value for missing key", () => {
      const defaultValue = { default: true }
      const result = StorageManager.get("nonexistent", defaultValue)

      expect(result).toEqual(defaultValue)
    })
  })

  describe("remove", () => {
    it("should remove data from storage", () => {
      StorageManager.set("test", { value: "data" })
      StorageManager.remove("test")

      const retrieved = StorageManager.get("test")

      expect(retrieved).toBeNull()
    })
  })
})

describe("Appointment Storage", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear()
    }
  })

  describe("addAppointment", () => {
    it("should add appointment with generated id", () => {
      const appointment = {
        patientId: "p1",
        doctorId: "d1",
        dateTime: new Date(),
        reason: "Checkup",
      }

      appointmentStorage.addAppointment(appointment)
      const saved = appointmentStorage.getAppointments()

      expect(saved.length).toBe(1)
      expect(saved[0].id).toBeDefined()
      expect(saved[0].patientId).toBe("p1")
    })
  })

  describe("updateAppointment", () => {
    it("should update existing appointment", () => {
      const appointment = {
        patientId: "p1",
        doctorId: "d1",
        dateTime: new Date(),
        reason: "Checkup",
      }

      appointmentStorage.addAppointment(appointment)
      const saved = appointmentStorage.getAppointments()
      const appointmentId = saved[0].id

      appointmentStorage.updateAppointment(appointmentId, { status: "cancelled" })
      const updated = appointmentStorage.getAppointments()

      expect(updated[0].status).toBe("cancelled")
    })
  })
})
