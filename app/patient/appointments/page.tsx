"use client"

import { useState } from "react"
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
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "ID0001",
      date: "Nov 15, 2025",
      time: "10:00 AM",
      doctor: "Dr. Sarah Johnson",
      specialty: "General Practice",
      status: "confirmed",
    },
    {
      id: "ID0002",
      date: "Nov 8, 2025",
      time: "2:30 PM",
      doctor: "Dr. Michael Chen",
      specialty: "Cardiology",
      status: "completed",
    },
    {
      id: "ID0003",
      date: "Oct 25, 2025",
      time: "11:00 AM",
      doctor: "Dr. Emily Roberts",
      specialty: "Dermatology",
      status: "cancelled",
    },
  ])

  const [showBookModal, setShowBookModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [doctorSearch, setDoctorSearch] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")

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

  const handleBookAppointment = () => {
    console.log("[v0] Book appointment clicked", { doctor: doctorSearch, date: selectedDate, time: selectedTime })
    if (doctorSearch && selectedDate && selectedTime) {
      const newId = Math.max(...appointments.map((a) => Number.parseInt(a.id.replace("ID", "")))) + 1
      const appointmentId = `ID${String(newId).padStart(4, "0")}`
      const newAppointment: Appointment = {
        id: appointmentId,
        date: selectedDate,
        time: selectedTime,
        doctor: doctorSearch,
        specialty: "General Practice",
        status: "confirmed",
      }
      setAppointments([newAppointment, ...appointments])
      setShowBookModal(false)
      setDoctorSearch("")
      setSelectedDate("")
      setSelectedTime("")
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

  const upcomingAppointments = appointments.filter((apt) => apt.status === "confirmed")
  const pastAppointments = appointments.filter((apt) => apt.status === "completed")

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

      {upcomingAppointments.length > 0 && (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
              <input
                type="text"
                placeholder="Enter doctor name"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
              <input
                type="text"
                placeholder="Enter doctor name"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
