"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X, Plus } from "lucide-react"

interface CheckedInPatient {
  id: string
  name: string
  email: string
  checkinTime: string
  status: "waiting" | "in-consultation" | "completed"
  department?: string
}

export default function ReceptionistCheckInPage() {
  const [submitting, setSubmitting] = useState(false)
  const [patients, setPatients] = useState<CheckedInPatient[]>([])
  const [doctors, setDoctors] = useState<Array<{ doctor_id: number; name: string; specialization?: string; status?: string }>>([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const searchParams = useSearchParams()
  useEffect(() => {
    try {
      const open = searchParams?.get('open')
      if (open === '1' || open === 'true' || open === 'yes') {
        setShowCheckInModal(true)
      }
    } catch {}
  }, [searchParams])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    doctorId: "" as number | "",
    doctorName: "",
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
          .filter((r: any) => ['waiting','pending','called','in-consultation'].includes(String(r.status || '')))
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

 useEffect(() => {
   if (showCheckInModal) {
     const run = async () => {
       try {
         setLoadingDoctors(true)
         const base = (process.env.NEXT_PUBLIC_PHP_API_BASE || "").trim() || "http://localhost/SMQS/db_samp/api/index.php"
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
 }, [showCheckInModal])

  const norm = (s: string) =>
    (s || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")

  const filteredPatients = patients.filter((p) => {
    const name = norm(p.name)
    const email = norm(p.email)
    const q = norm(searchTerm)
    if (!q) return true
    // If query looks like an email, match email only
    if (q.includes("@")) return email.includes(q)
    // Otherwise, require all tokens to be present in the name
    const tokens = q.split(" ").filter(Boolean)
    return tokens.every((t) => name.includes(t))
  })

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

  const handleSubmitCheckIn = async () => {
    if (!formData.name || !formData.email) {
      alert("Please fill in required fields")
      return
    }
    if (!formData.doctorId) {
      alert("Please select a doctor")
      return
    }

    try {
      setSubmitting(true)
      // Schedule slightly in the future to avoid 'past' validation on the server
      const now = new Date(Date.now() + 60 * 1000)
      const pad = (n: number) => String(n).padStart(2, '0')
      const scheduled = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

      const res = await fetch('/api/php/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          doctor_id: Number(formData.doctorId),
          scheduled_time: scheduled,
          reason: formData.reason || undefined,
        }),
      })
      const out = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = (out && (out.error || out.message || out.details)) || 'Failed to check-in patient'
        alert(msg)
        return
      }

      // Refresh list
      try {
        const resList = await fetch('/api/php/appointments', { cache: 'no-store' })
        const body = await resList.json().catch(() => [])
        if (Array.isArray(body)) {
          const mapped: CheckedInPatient[] = body
            .filter((r: any) => ['waiting','pending','called','in-consultation'].includes(String(r.status || '')))
            .map((r: any) => ({
              id: String(r.appointment_id ?? ''),
              name: String(r.patient_name || r.patient_id || ''),
              email: String(r.patient_email || ''),
              checkinTime: toTime(String(r.scheduled_time || '')),
              status: String(r.status || 'pending') as any,
            }))
          setPatients(mapped)
        }
      } catch {}

      setFormData({ name: "", email: "", doctorId: "" as any, doctorName: "", reason: "" })
      setShowCheckInModal(false)
    } catch (e) {
      console.error('check-in submit error', e)
      alert('Failed to check-in patient')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Check-in</h1>
          <p className="text-gray-600 mt-1">Manage patient check-ins and queue</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
          onClick={handleCheckIn}
        >
          <Plus className="w-4 h-4" />
          Check In
        </Button>
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
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50" onClick={() => setShowCheckInModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  value={String(formData.doctorId)}
                  onChange={(e) => {
                    const val = e.target.value
                    const num = val ? Number(val) : ""
                    const d = doctors.find((x) => String(x.doctor_id) === val)
                    setFormData({ ...formData, doctorId: num as any, doctorName: d?.name || "" })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{loadingDoctors ? 'Loading doctors...' : (formData.department ? 'Select a doctor' : 'Select a department first')}</option>
                  {doctors
                    .filter((d) => !formData.department || d.specialization === formData.department)
                    .map((d) => (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitCheckIn} disabled={submitting} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60">
                  {submitting ? 'Checking In...' : 'Check In'}
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
