/**
 * Database type definitions and schemas
 * Ready for integration with Supabase, Neon, or other SQL databases
 */

export interface User {
  id: string
  email: string
  name: string
  role: "patient" | "doctor" | "admin" | "receptionist"
  status: "active" | "inactive" | "suspended"
  createdAt: Date
  updatedAt: Date
}

export interface Patient extends User {
  role: "patient"
  phone?: string
  dateOfBirth?: Date
  medicalHistory?: string
}

export interface Doctor extends User {
  role: "doctor"
  specialization: string
  license: string
  availableHours: string
  phone?: string
}

export interface QueueEntry {
  id: string
  patientId: string
  doctorId?: string
  status: "waiting" | "called" | "in-consultation" | "completed" | "no-show"
  reason: string
  position: number
  joinedAt: Date
  startTime?: Date
  endTime?: Date
  estimatedWaitTime: number
  actualWaitTime?: number
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  dateTime: Date
  duration: number
  status: "confirmed" | "pending" | "cancelled"
  reason: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  details: Record<string, any>
  result: "success" | "failure"
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

/**
 * SQL Schema (for future database setup)
 */
export const SQL_SCHEMA = `
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queue Entries Table
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  reason VARCHAR(255),
  position INT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  estimated_wait_time INT,
  actual_wait_time INT
);

-- Appointments Table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  date_time TIMESTAMP NOT NULL,
  duration INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  details JSONB,
  result VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_queue_patient ON queue_entries(patient_id);
CREATE INDEX idx_queue_doctor ON queue_entries(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
`
