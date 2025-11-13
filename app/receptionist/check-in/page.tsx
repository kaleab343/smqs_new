"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

interface CheckedInPatient {
  id: string
  name: string
  email: string
  checkinTime: string
  status: "waiting" | "in-consultation" | "completed"
}

export default function ReceptionistCheckInPage() {
  const [patients, setPatients] = useState<CheckedInPatient[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    reason: "",
  })

  const toTime = (scheduled: string) => {
    const s = (scheduled || '').replace('T', ' ')
    const timePart = (s.split(' ')[1] || '').slice(0,5)
    // convert 24h HH:MM to locale short if possible
    try {
      const [hh, mm] = timePart.split(':').map((x) => parseInt(x, 10))
      if (!isNaN(hh) && !isNaN(mm)) {
        const d = new Date()
        d.setHours(hh, mm, 0, 0)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    } catch {}
    return timePart || '—'
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/php/appointments', { cache: 'no-store' })
        if (!res.ok) { setPatients([]); return }
        const body = await res.json().catch(() => [])
        if (!Array.isArray(body)) { setPatients([]); return }
        const mapped: CheckedInPatient[] = body
          .filter((r: any) => ['pending','called','in-consultation'].includes(String(r.status || '')))
          .map((r: any) => ({
            id: String(r.appointment_id ?? ''),
            name: String(r.patient_name || r.patient_id || ''),
            email: String(r.patient_email || ''),
            checkinTime: toTime(String(r.scheduled_time || '')),
            status: String(r.status || 'pending') as any,
          }))
        setPatients(mapped)
      } catch (e) {
        console.error('load checked-in patients error', e)
        setPatients([])
      }
    }
    load()
  }, [])

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-consultation":
        return "bg-green-100 text-green-800"
      case "waiting":
        return "bg-yellow-100 text-yellow-800"
      case "called":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCheckIn = () => {
    setShowCheckInModal(true)
  }

  const handleSubmitCheckIn = () => {
    if (!formData.name || !formData.email) {
      alert("Please fill in required fields")
      return
    }

    const newPatient: CheckedInPatient = {
      id: String(patients.length + 1),
      name: formData.name,
      email: formData.email,
      checkinTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "waiting",
    }

    setPatients([...patients, newPatient])
    setFormData({ name: "", email: "", phone: "", reason: "" })
    setShowCheckInModal(false)
    console.log("[v0] Patient checked in:", newPatient)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Check-in</h1>
          <p className="text-gray-600 mt-1">Manage patient check-ins and queue</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by patient name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{patients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {patients.filter((p) => p.status === "waiting").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {patients.filter((p) => p.status === "in-consultation").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check-in List */}
      <Card>
        <CardHeader>
          <CardTitle>Checked In Patients</CardTitle>
          <CardDescription>{filteredPatients.length} patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
                    {patient.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-600">{patient.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{patient.checkinTime}</span>
                  <Badge className={getStatusColor(patient.status)}>
                    {patient.status === "in-consultation"
                      ? "Serving"
                      : patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Check In New Patient</CardTitle>
                <CardDescription>Enter patient details</CardDescription>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Visit</label>
                <Input
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Enter reason for visit"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitCheckIn} className="flex-1 bg-amber-600 hover:bg-amber-700">
                  Check In
                </Button>
                <Button onClick={() => setShowCheckInModal(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
