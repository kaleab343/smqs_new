/**
 * Queue Engine - Manages patient queue state and operations
 * Handles queue logic, position tracking, and status management
 */

export interface QueuedPatient {
  id: string
  patientId: string
  name: string
  email: string
  reason: string
  position: number
  status: "waiting" | "called" | "in-consultation" | "completed" | "no-show"
  joinedAt: Date
  startTime?: Date
  endTime?: Date
  estimatedWaitTime: number
  actualWaitTime?: number
  doctorId?: string
}

export interface QueueState {
  patients: QueuedPatient[]
  currentlyServing?: QueuedPatient
  lastUpdated: Date
}

// In-memory queue store (TODO: Replace with database)
const queueState: QueueState = {
  patients: [],
  lastUpdated: new Date(),
}

/**
 * Add patient to queue
 */
export function addPatientToQueue(patientId: string, name: string, email: string, reason: string): QueuedPatient {
  const position = queueState.patients.length + 1
  const estimatedWaitTime = calculateEstimatedWaitTime(position)

  const queuedPatient: QueuedPatient = {
    id: `queue-${Date.now()}`,
    patientId,
    name,
    email,
    reason,
    position,
    status: "waiting",
    joinedAt: new Date(),
    estimatedWaitTime,
  }

  queueState.patients.push(queuedPatient)
  queueState.lastUpdated = new Date()

  return queuedPatient
}

/**
 * Remove patient from queue
 */
export function removePatientFromQueue(id: string): void {
  const index = queueState.patients.findIndex((p) => p.id === id)
  if (index > -1) {
    queueState.patients.splice(index, 1)
    // Recalculate positions and wait times
    updateQueuePositions()
  }
  queueState.lastUpdated = new Date()
}

/**
 * Call next patient in queue
 */
export function callNextPatient(doctorId: string): QueuedPatient | null {
  const nextPatient = queueState.patients.find((p) => p.status === "waiting")
  if (nextPatient) {
    nextPatient.status = "called"
    nextPatient.doctorId = doctorId
    return nextPatient
  }
  return null
}

/**
 * Start consultation with patient
 */
export function startConsultation(patientId: string): QueuedPatient | null {
  const patient = queueState.patients.find((p) => p.id === patientId)
  if (patient) {
    patient.status = "in-consultation"
    patient.startTime = new Date()
    queueState.currentlyServing = patient
    return patient
  }
  return null
}

/**
 * Complete consultation
 */
export function completeConsultation(patientId: string): QueuedPatient | null {
  const patient = queueState.patients.find((p) => p.id === patientId)
  if (patient) {
    patient.status = "completed"
    patient.endTime = new Date()
    if (patient.startTime) {
      patient.actualWaitTime = Math.floor((patient.endTime.getTime() - patient.startTime.getTime()) / 1000 / 60)
    }
    removePatientFromQueue(patientId)
    queueState.currentlyServing = undefined
    return patient
  }
  return null
}

/**
 * Mark patient as no-show
 */
export function markNoShow(patientId: string): QueuedPatient | null {
  const patient = queueState.patients.find((p) => p.id === patientId)
  if (patient) {
    patient.status = "no-show"
    removePatientFromQueue(patientId)
    return patient
  }
  return null
}

/**
 * Get current queue state
 */
export function getQueueState(): QueueState {
  return queueState
}

/**
 * Get patient position in queue
 */
export function getPatientPosition(patientId: string): QueuedPatient | null {
  return queueState.patients.find((p) => p.patientId === patientId && p.status === "waiting") || null
}

/**
 * Update queue positions after patient removal
 */
function updateQueuePositions(): void {
  queueState.patients.forEach((patient, index) => {
    patient.position = index + 1
    patient.estimatedWaitTime = calculateEstimatedWaitTime(patient.position)
  })
}

/**
 * Calculate estimated wait time based on position
 * Assumes average 15 minutes per consultation
 */
function calculateEstimatedWaitTime(position: number): number {
  const AVG_CONSULTATION_TIME = 15
  return (position - 1) * AVG_CONSULTATION_TIME
}

/**
 * Get queue analytics
 */
export function getQueueAnalytics() {
  const total = queueState.patients.length
  const waiting = queueState.patients.filter((p) => p.status === "waiting").length
  const inConsultation = queueState.patients.filter((p) => p.status === "in-consultation").length
  const completed = queueState.patients.filter((p) => p.status === "completed").length

  const avgWaitTime =
    completed > 0
      ? Math.floor(
          queueState.patients
            .filter((p) => p.status === "completed" && p.actualWaitTime)
            .reduce((sum, p) => sum + (p.actualWaitTime || 0), 0) / completed,
        )
      : 0

  return {
    total,
    waiting,
    inConsultation,
    completed,
    avgWaitTime,
    currentlyServing: queueState.currentlyServing,
  }
}
