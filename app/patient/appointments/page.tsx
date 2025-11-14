"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Edit2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Appointment {
  id: string
  date: string
  time: string
  doctor: string
  specialty: string
  status: "confirmed" | "completed" | "cancelled"
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null)

  const [showBookModal, setShowBookModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [doctorSearch, setDoctorSearch] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [doctors, setDoctors] = useState<Array<{ doctor_id: number; name: string; specialization?: string; status?: string }>>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  const handleEditAppointment = (id: string) => {
    console.log("[v0] Editing appointment:", id)
    const apt = appointments.find((a) => a.id === id)
    if (apt) {
      setEditingId(id)
      setDoctorSearch(apt.doctor)
      setSelectedDate(apt.date)
      setSelectedTime(apt.time)
      setShowEditModal(true)
    }
  }

  const handleSaveEditedAppointment = () => {
    if (editingId && doctorSearch && selectedDate && selectedTime) {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === editingId ? { ...apt, doctor: doctorSearch, date: selectedDate, time: selectedTime } : apt,
        ),
      )
      setShowEditModal(false)
      setEditingId(null)
      setDoctorSearch("")
      setSelectedDate("")
      setSelectedTime("")
      console.log("[v0] Appointment updated successfully")
    }
  }

  const handleCancel = (id: string) => {
    setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status: "cancelled" as const } : apt)))
  }

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingDoctors(true)
        const res = await fetch('/api/php/doctors', { cache: 'no-store' })
        const data = await res.json().catch(() => [])
        if (Array.isArray(data)) {
          setDoctors(data.filter((d: any) => String(d.status || 'ACTIVE').toUpperCase() === 'ACTIVE'))
        }
      } catch (e) {
        setDoctors([])
      } finally {
        setLoadingDoctors(false)
      }
    }
    run()
  }, [])

  const handleBookAppointment = async () => {
    try {
      if (!doctorSearch || !selectedDate || !selectedTime) {
        alert('Please select a doctor, date, and time')
        return
      }
      // Build local scheduled_time as YYYY-MM-DD HH:MM:SS
      const pad = (n: number) => String(n).padStart(2, '0')
      const [y,m,d] = selectedDate.split('-').map(Number)
      const [hh,mm] = selectedTime.split(':').map(Number)
      const dt = new Date(y, (m||1)-1, d||1, hh||0, mm||0, 0)
      const scheduled_time = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`

      // Enforce not in the past on client as well
      if (dt.getTime() < Date.now()) {
        alert('Cannot schedule in the past')
        return
      }

      const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
      const user_id = stored?.id ? Number(stored.id) : 0
      if (!user_id) {
        alert('Missing logged-in user. Please sign in again.')
        return
      }

      const payload = { user_id, doctor_id: Number(doctorSearch), scheduled_time }
      const res = await fetch('/api/php/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || data?.message || 'Failed to create appointment'
        alert(msg)
        return
      }
      // Success
      alert('Appointment booked successfully')
      setShowBookModal(false)
      setDoctorSearch('')
      setSelectedDate('')
      setSelectedTime('')
      // Optionally update local list (append)
      setAppointments(prev => [{
        id: String(data?.appointment_id || Date.now()),
        date: scheduled_time.slice(0,10),
        time: scheduled_time.slice(11,16),
        doctor: String(doctorSearch),
        specialty: '',
        status: 'confirmed'
      }, ...prev])
    } catch (e: any) {
      alert(e?.message || 'Unexpected error')
    }
  }

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const parseSqlDateTime = (s: string) => {
    // Parse 'YYYY-MM-DD HH:MM:SS' without timezone shifts
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})[ T]([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?/.exec(s || '')
    if (!m) return null
    const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3])
    const h = Number(m[4]), mi = Number(m[5]), se = Number(m[6] || '0')
    return new Date(y, mo, d, h, mi, se)
  }

  // Backend already filters to future-only when loading; use as-is
  const upcomingAppointments = appointments
  const pastAppointments = appointments.filter((apt) => {
    const s = `${apt.date}${apt.time ? ' ' + apt.time + ':00' : ''}`
    const dt = parseSqlDateTime(s) || (apt.date ? new Date(apt.date) : new Date())
    return apt.status !== 'cancelled' && dt.getTime() <= Date.now()
  })

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingAppointments(true)
        setAppointmentsError(null)
        const base = '/api/php'
        const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
        const user_id = stored?.id
        if (!user_id) return
        // Fetch all appointments and filter by this patient and future times
        const resCur = await fetch(`${base}/appointments/current?user_id=${encodeURIComponent(user_id)}`, { cache: 'no-store' })
        const cur = await resCur.json().catch(() => ({}))
        const patient_id = cur?.patient_id
        let url = ''
        if (patient_id) {
          url = `${base}/appointments?patient_id=${encodeURIComponent(patient_id)}&future_only=1`
        } else {
          // Fallback: filter by user_id if patient mapping is missing
          url = `${base}/appointments?user_id=${encodeURIComponent(user_id)}&future_only=1`
        }
        const resAll = await fetch(url, { cache: 'no-store' })
        const all = await resAll.json().catch(() => [])
        const nowTs = Date.now()
        const items: Appointment[] = (Array.isArray(all) ? all : [])
          .map((r: any) => ({
            id: String(r.appointment_id),
            doctor: r.doctor_name || `#${r.doctor_id}`,
            specialty: r.specialization || '',
            date: String(r.scheduled_time || '').slice(0,10),
            time: String(r.scheduled_time || '').slice(11,16),
            status: String(r.status || 'confirmed') as any,
          }))
          .filter((apt) => {
            const dt = (apt.date && apt.time) ? new Date(`${apt.date} ${apt.time}`) : new Date(apt.date)
            return dt.getTime() > nowTs && apt.status !== 'cancelled'
          })
          .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime())
        setAppointments(items)
      } catch (e: any) {
        setAppointmentsError(e?.message || 'Failed to load appointments')
      } finally {
        setLoadingAppointments(false)
      }
    }
    run()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 mt-1">Manage your medical appointments</p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          onClick={() => setShowBookModal(true)}
        >
          <Plus className="w-4 h-4" />
          Book Appointment
        </Button>
      </div>

      {upcomingAppointments.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Doctor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Specialty</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {apt.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{apt.doctor}</td>
                        <td className="py-3 px-4 text-gray-600">{apt.specialty}</td>
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
                              onClick={() => handleCancel(apt.id)}
                              className="text-red-600 hover:bg-red-50"
                              title="Cancel appointment"
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
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600">No schedule yet</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Appointments</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full opacity-75">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Doctor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Specialty</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-gray-100">
                        <td className="py-3 px-4 font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {apt.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{apt.doctor}</td>
                        <td className="py-3 px-4 text-gray-600">{apt.specialty}</td>
                        <td className="py-3 px-4 text-gray-600">{apt.date}</td>
                        <td className="py-3 px-4 text-gray-600">{apt.time}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(apt.status)}>Completed</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Book Appointment Modal */}
      <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book New Appointment</DialogTitle>
            <DialogDescription>Fill in the details to book a new appointment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{loadingDoctors ? 'Loading doctors...' : (doctors.length ? 'Select a doctor' : 'No active doctors')}</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={String(d.doctor_id)}>
                    {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().slice(0,10)}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowBookModal(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleBookAppointment}>
                Book Appointment
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{loadingDoctors ? 'Loading doctors...' : (doctors.length ? 'Select a doctor' : 'No active doctors')}</option>
                {doctors.map((d) => (
                  <option key={d.doctor_id} value={String(d.doctor_id)}>
                    {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEditedAppointment}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
