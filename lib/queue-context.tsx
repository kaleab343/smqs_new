"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import * as QueueEngine from "@/lib/queue-engine"
import { addNotification, notificationTemplates } from "@/lib/notifications"

interface QueueContextType {
  patients: QueueEngine.QueuedPatient[]
  currentlyServing: QueueEngine.QueuedPatient | undefined
  addPatientToQueue: (patientId: string, name: string, email: string, reason: string) => void
  removePatientFromQueue: (id: string) => void
  callNextPatient: (doctorId: string) => void
  startConsultation: (patientId: string) => void
  completeConsultation: (patientId: string) => void
  markNoShow: (patientId: string) => void
  getAnalytics: () => ReturnType<typeof QueueEngine.getQueueAnalytics>
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<QueueEngine.QueuedPatient[]>([])
  const [currentlyServing, setCurrentlyServing] = useState<QueueEngine.QueuedPatient | undefined>()

  const handleAddPatientToQueue = useCallback((patientId: string, name: string, email: string, reason: string) => {
    const patient = QueueEngine.addPatientToQueue(patientId, name, email, reason)
    setPatients(QueueEngine.getQueueState().patients)
    addNotification(...Object.values(notificationTemplates.patientJoinedQueue(name, patient.position)))
  }, [])

  const handleRemovePatientFromQueue = useCallback((id: string) => {
    QueueEngine.removePatientFromQueue(id)
    setPatients(QueueEngine.getQueueState().patients)
  }, [])

  const handleCallNextPatient = useCallback((doctorId: string) => {
    const patient = QueueEngine.callNextPatient(doctorId)
    setPatients(QueueEngine.getQueueState().patients)
    if (patient) {
      addNotification(...Object.values(notificationTemplates.patientCalled(patient.name)))
    }
  }, [])

  const handleStartConsultation = useCallback((patientId: string) => {
    const patient = QueueEngine.startConsultation(patientId)
    setPatients(QueueEngine.getQueueState().patients)
    setCurrentlyServing(patient || undefined)
    if (patient) {
      addNotification(...Object.values(notificationTemplates.consultationStarted("Dr. Smith")))
    }
  }, [])

  const handleCompleteConsultation = useCallback((patientId: string) => {
    const patient = QueueEngine.completeConsultation(patientId)
    setPatients(QueueEngine.getQueueState().patients)
    setCurrentlyServing(undefined)
    if (patient && patient.actualWaitTime) {
      addNotification(
        ...Object.values(notificationTemplates.consultationCompleted(patient.name, patient.actualWaitTime)),
      )
    }
  }, [])

  const handleMarkNoShow = useCallback((patientId: string) => {
    QueueEngine.markNoShow(patientId)
    setPatients(QueueEngine.getQueueState().patients)
  }, [])

  const handleGetAnalytics = useCallback(() => {
    return QueueEngine.getQueueAnalytics()
  }, [])

  return (
    <QueueContext.Provider
      value={{
        patients,
        currentlyServing,
        addPatientToQueue: handleAddPatientToQueue,
        removePatientFromQueue: handleRemovePatientFromQueue,
        callNextPatient: handleCallNextPatient,
        startConsultation: handleStartConsultation,
        completeConsultation: handleCompleteConsultation,
        markNoShow: handleMarkNoShow,
        getAnalytics: handleGetAnalytics,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (context === undefined) {
    throw new Error("useQueue must be used within a QueueProvider")
  }
  return context
}
