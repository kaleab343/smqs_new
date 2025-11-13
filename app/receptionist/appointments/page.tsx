"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Appointment {
  id: string
  patient: string
  patientEmail?: string
  doctor: string
  date: string
  time: string
  status: "pending" | "called" | "in-consultation" | "completed" | "cancelled"
}

export default function ReceptionistAppointmentsPage() {
  const toDateTimeParts = (scheduled: string) => {
    const s = (scheduled || '').replace('T', ' ')
    // expected: YYYY-MM-DD HH:MM:SS
    const [datePart, timePartRaw] = s.split(' ')
    const timePart = (timePartRaw || '').slice(0,5)
    return { date: datePart || '', time: timePart || '' }
  }

  const refetchAppointments = async () => {
    try {
      const res = await fetch('/api/php/appointments', { cache: 'no-store' })
      if (!res.ok) { setAppointments([]); return }
      const body = await res.json().catch(() => [])
      if (!Array.isArray(body)) { setAppointments([]); return }
      const mapped: Appointment[] = body.map((r: any) => {
        const { date, time } = toDateTimeParts(String(r.scheduled_time || ''))
        return {
          id: String(r.appointment_id ?? ''),
          patient: String(r.patient_name || r.patient_id || ''),
          patientEmail: r.patient_email || undefined,
          doctor: String(r.doctor_name || r.doctor_id || ''),
          date,
          time,
          status: String(r.status || 'pending') as any,
        }
      })
      setAppointments(mapped)
    } catch (e) {
      console.error('load appointments error', e)
      setAppointments([])
    }
  }
  const [doctors, setDoctors] = useState<Array<{ doctor_id: number; name: string; specialization?: string; status?: string }>>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [appointments, setAppointments] = useState<Appointment[]>([])

  const [showNewModal, setShowNewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [patientName, setPatientName] = useState("")
  const [patientEmail, setPatientEmail] = useState("")
  const [doctorName, setDoctorName] = useState("")
  const [doctorId, setDoctorId] = useState<number | "">("")
  const [appointmentDate, setAppointmentDate] = useState("")
  const [appointmentTime, setAppointmentTime] = useState("")
  const [appointmentStatus, setAppointmentStatus] = useState<"pending" | "called" | "in-consultation" | "completed" | "cancelled">("pending")

  const handleNewAppointment = async () => {
    console.log("[v0] Creating new appointment")
    if (patientName && (doctorId || doctorName) && appointmentDate && appointmentTime) {
      try {
        // Front-end guard: if patientEmail belongs to a user with doctor role, block
        if (patientEmail) {
          try {
            const resUsers = await fetch('/api/php/users', { cache: 'no-store' })
            if (resUsers.ok) {
              const users = await resUsers.json().catch(() => [])
              if (Array.isArray(users)) {
                const match = users.find((u: any) => String(u.email || '').toLowerCase() === String(patientEmail).toLowerCase())
                if (match && String(match.role || '').toLowerCase() === 'doctor') {
                  alert('This email belongs to a doctor. Doctors cannot be booked as patients.')
                  return
                }
              }
            }
          } catch (e) {
            // If user check fails, continue; backend will enforce as well
            console.warn('User role check failed', e)
          }
        }

        const scheduled_time = `${appointmentDate} ${appointmentTime}:00`
        const payload: any = {
          doctor_id: doctorId || undefined,
          scheduled_time,
          name: patientName,
          email: patientEmail || undefined,
        }
        // If doctorId not selected but name selected (fallback), we will try to match by name client-side
        if (!doctorId && doctorName) {
          const match = doctors.find((d) => d.name === doctorName)
          if (match) payload.doctor_id = match.doctor_id
        }
        if (!payload.doctor_id) {
          alert('Please select a doctor')
          return
        }
        const res = await fetch('/api/php/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          console.error('Create appointment failed', res.status, body)
          alert(body?.error || 'Failed to create appointment')
          return
        }
        const apptId = String(body?.appointment_id ?? Date.now())
        const newAppointment: Appointment = {
          id: apptId,
          patient: patientName,
          patientEmail: patientEmail || undefined,
          doctor: doctors.find((d) => d.doctor_id === (payload.doctor_id as number))?.name || doctorName || '',
          date: appointmentDate,
          time: appointmentTime,
          status: 'pending',
        }
        // Update UI and refetch from server to ensure consistency
        setAppointments([newAppointment, ...appointments])
        refetchAppointments()
        setShowNewModal(false)
        setPatientName("")
        setPatientEmail("")
        setDoctorName("")
        setDoctorId("")
        setAppointmentDate("")
        setAppointmentTime("")
        setAppointmentStatus("pending")
        console.log("[v0] New appointment created:", apptId, body)
      } catch (e) {
        console.error('Create appointment error', e)
        alert('Failed to create appointment')
      }
    }
  }

  const handleEditAppointment = (id: string) => {
    console.log("[v0] Editing appointment:", id)
    const apt = appointments.find((a) => a.id === id)
    if (apt) {
      setEditingId(id)
      setPatientName(apt.patient)
      setDoctorName(apt.doctor)
      setPatientEmail(apt.patientEmail || "")
      setAppointmentDate(apt.date)
      setAppointmentTime(apt.time)
      setAppointmentStatus(apt.status)
      setShowEditModal(true)
    }
  }

  const handleSaveEditedAppointment = async () => {
    if (editingId) {
      try {
        // Update status in DB like Admin Users update pattern
        const res = await fetch(`/api/php/appointments/status?id=${encodeURIComponent(editingId)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: appointmentStatus }) })
        if (!res.ok) {
          const body = await res.json().catch(()=>null)
          console.error('status update failed', res.status, body)
        }
        // Optimistic UI update
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === editingId
              ? {
                  ...apt,
                  patient: patientName,
                  doctor: doctorName,
                  patientEmail: patientEmail || undefined,
                  date: appointmentDate,
                  time: appointmentTime,
                  status: appointmentStatus,
                }
              : apt,
          ),
        )
      } catch (e) {
        console.error('status update error', e)
      } finally {
        setShowEditModal(false)
        setEditingId(null)
        setPatientName("")
        setPatientEmail("")
        setDoctorName("")
        setAppointmentDate("")
        setAppointmentTime("")
        setAppointmentStatus("pending")
        await refetchAppointments()
      }
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    console.log("[v0] Deleting appointment:", id)
    try {
      // Mirror Admin Users delete pattern (permissive POST)
      const res = await fetch(`/api/php/appointments/delete?id=${encodeURIComponent(id)}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        console.error('delete failed', res.status, body)
      }
    } catch (e) {
      console.error('delete error', e)
    } finally {
      await refetchAppointments()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "called":
        return "bg-blue-100 text-blue-800"
      case "in-consultation":
        return "bg-purple-100 text-purple-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  useEffect(() => {
    // initial load
    refetchAppointments()

    if (showNewModal) {
      const run = async () => {
        try {
          setLoadingDoctors(true)
          const base = (process.env.NEXT_PUBLIC_PHP_API_BASE || "").trim() || "http://127.0.0.1/code_(1)/db_samp/api/index.php"
          const url = `${base}?r=/doctors`
          const res = await fetch(url)
          const data = await res.json()
          if (Array.isArray(data)) setDoctors(data.filter((d: any) => String(d.status || 'ACTIVE').toUpperCase() === 'ACTIVE'))
        } catch (e) {
          console.error("Failed to load doctors", e)
        } finally {
          setLoadingDoctors(false)
        }
      }
      run()
    }
  }, [showNewModal])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Manage all appointments</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
          onClick={() => setShowNewModal(true)}
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      {/* Appointment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{appointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {appointments.filter((a) => a.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {appointments.filter((a) => a.status === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>View and manage all scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Patient</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Doctor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {apt.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{apt.patient}</td>
                    <td className="py-3 px-4 text-gray-600">{apt.doctor}</td>
                    <td className="py-3 px-4 text-gray-600">{apt.date}</td>
                    <td className="py-3 px-4 text-gray-600">{apt.time}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAppointment(apt.id)}
                          className="text-blue-600 hover:bg-blue-50"
                          title="Edit appointment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="text-red-600 hover:bg-red-50"
                          title="Delete appointment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Appointment Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>Add a new appointment to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient Email</label>
              <input
                type="email"
                placeholder="Enter patient email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => {
                  const val = e.target.value
                  setDoctorId(val ? Number(val) : "")
                  const d = doctors.find((x) => String(x.doctor_id) === val)
                  setDoctorName(d?.name || "")
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">{loadingDoctors ? "Loading doctors..." : "Select a doctor"}</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.name}{d.specialization ? ` (${d.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={appointmentStatus}
                onChange={(e) => setAppointmentStatus(e.target.value as "confirmed" | "pending" | "cancelled")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewModal(false)}>
                Cancel
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleNewAppointment}>
                Create Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>Update the appointment details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient Name</label>
              <input
                type="text"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patient Email</label>
              <input
                type="email"
                placeholder="Enter patient email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
              <input
                type="text"
                placeholder="Enter doctor name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={appointmentStatus}
                onChange={(e) => setAppointmentStatus(e.target.value as "confirmed" | "pending" | "cancelled")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveEditedAppointment}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
