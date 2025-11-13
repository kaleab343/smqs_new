/**
 * Queue Engine Tests
 */

import * as QueueEngine from "@/lib/queue-engine"

describe("Queue Engine", () => {
  beforeEach(() => {
    // Reset queue state before each test
    // This would require exposing a reset function in the queue engine
  })

  describe("addPatientToQueue", () => {
    it("should add patient to queue with correct position", () => {
      const patient = QueueEngine.addPatientToQueue("p1", "John Doe", "john@example.com", "Checkup")

      expect(patient).toBeDefined()
      expect(patient.position).toBe(1)
      expect(patient.status).toBe("waiting")
      expect(patient.name).toBe("John Doe")
    })

    it("should calculate estimated wait time", () => {
      const patient1 = QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      const patient2 = QueueEngine.addPatientToQueue("p2", "Jane", "jane@example.com", "Checkup")

      expect(patient1.estimatedWaitTime).toBe(0)
      expect(patient2.estimatedWaitTime).toBeGreaterThan(0)
    })
  })

  describe("removePatientFromQueue", () => {
    it("should remove patient and recalculate positions", () => {
      QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      const patient2 = QueueEngine.addPatientToQueue("p2", "Jane", "jane@example.com", "Checkup")

      QueueEngine.removePatientFromQueue("p1")
      const state = QueueEngine.getQueueState()

      expect(state.patients.length).toBe(1)
      expect(state.patients[0].position).toBe(1)
    })
  })

  describe("callNextPatient", () => {
    it("should mark patient as called and assign doctor", () => {
      const patient = QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      const called = QueueEngine.callNextPatient("d1")

      expect(called).toBeDefined()
      expect(called?.status).toBe("called")
      expect(called?.doctorId).toBe("d1")
    })
  })

  describe("startConsultation", () => {
    it("should start consultation with patient", () => {
      const patient = QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      const state = QueueEngine.getQueueState()
      const patientId = state.patients[0].id

      QueueEngine.startConsultation(patientId)
      const updated = QueueEngine.getQueueState()

      expect(updated.patients[0].status).toBe("in-consultation")
      expect(updated.patients[0].startTime).toBeDefined()
    })
  })

  describe("completeConsultation", () => {
    it("should complete consultation and remove from queue", () => {
      const patient = QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      const state = QueueEngine.getQueueState()
      const patientId = state.patients[0].id

      QueueEngine.startConsultation(patientId)
      QueueEngine.completeConsultation(patientId)
      const updated = QueueEngine.getQueueState()

      expect(updated.patients.length).toBe(0)
    })
  })

  describe("getQueueAnalytics", () => {
    it("should return accurate queue metrics", () => {
      QueueEngine.addPatientToQueue("p1", "John", "john@example.com", "Checkup")
      QueueEngine.addPatientToQueue("p2", "Jane", "jane@example.com", "Checkup")

      const analytics = QueueEngine.getQueueAnalytics()

      expect(analytics.total).toBe(2)
      expect(analytics.waiting).toBe(2)
      expect(analytics.inConsultation).toBe(0)
      expect(analytics.completed).toBe(0)
    })
  })
})
