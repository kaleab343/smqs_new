"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle, ChevronUp, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"

interface QueuedPatient {
  id: string // display id (queue_number or appointment id)
  appointmentId: number
  position: number
  name: string
  reason: string
  waitTime: number
  status: "waiting" | "called" | "in-consultation" | "completed"
}

export default function DoctorQueuePage() {
  const { user } = useAuth()

  const [queue, setQueue] = useState<QueuedPatient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Small helper to build candidate URLs for PHP endpoints (supports pretty and index.php?r= styles)
  const buildUrls = (base: string, relPath: string) => {
    const b = base.replace(/\/$/, "")
    const isFront = /\/index\.php$/.test(b)
    const pretty = `${b}${relPath}`
    const front = isFront ? `${b}?r=${relPath}` : `${b}/index.php${relPath}`
    return Array.from(new Set([pretty, front]))
  }

  const fetchJsonWithFallback = async (relPath: string) => {
    const { getPhpApiBase } = await import("@/lib/php-api-config")
    const base = getPhpApiBase().replace(/\/$/, "")
    const urls = buildUrls(base, relPath)
    let lastErr: any = null
    for (const url of urls) {
      try {
        const r = await fetch(url)
        if (r.ok) {
          const text = await r.text()
          try { return text ? JSON.parse(text) : null } catch { return { message: text } }
        }
      } catch (e) { lastErr = e }
    }
    throw lastErr || new Error("Fetch failed: " + relPath)
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Resolve doctor_id for the logged-in doctor (robust: direct id, match by email/name, or infer from appts)
        const doctors: any[] = await fetchJsonWithFallback("/doctors").catch(() => [] as any[])
        let doctorId: number | null = null
        if (user) {
          // Try direct user.id if it matches a doctor entry
          const directId = Number(user.id)
          if (!Number.isNaN(directId) && directId > 0) {
            const byId = doctors.find((d: any) => Number(d.doctor_id) === directId)
            if (byId) doctorId = directId
          }
          // Fallback: match by email or name
          if (doctorId == null) {
            const matchByEmail = doctors.find((d: any) => (d.email || "").toLowerCase() === (user.email || "").toLowerCase())
            const matchByName = doctors.find((d: any) => (d.name || "").toLowerCase() === (user.name || "").toLowerCase())
            const d = matchByEmail || matchByName
            if (d) doctorId = Number(d.doctor_id)
          }
        }

        // Fetch all appointments and queue
        const [appts, q] = await Promise.all([
          fetchJsonWithFallback("/appointments").catch(() => [] as any[]),
          fetchJsonWithFallback("/queue").catch(() => [] as any[]),
        ])

        // Final fallback: infer doctorId from appointments by matching doctor_name to user.name
        if (doctorId == null && user?.name) {
          const byName = (appts || []).find((a: any) => (a.doctor_name || "").toLowerCase() === (user.name || "").toLowerCase())
          if (byName && byName.doctor_id) doctorId = Number(byName.doctor_id)
        }

        // Build appointment map by id
        const apptById = new Map<number, any>()
        for (const a of appts || []) {
          apptById.set(Number(a.appointment_id), a)
        }

        // Filter queue by assigned doctor AND by today's scheduled date.
        const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
        const filtered = (q || []).filter((row: any) => {
          const a = apptById.get(Number(row.appointment_id))
          if (!a) return false // cannot verify date/doctor without appointment details
          const isToday = String(a.scheduled_time || '').slice(0, 10) === todayStr
          if (!isToday) return false
          if (doctorId == null) return true
          return Number(a.doctor_id) === Number(doctorId)
        })

        // Map to UI model; fallbacks for missing fields
        const mappedFromQueue: QueuedPatient[] = filtered.map((row: any) => {
          const a = apptById.get(Number(row.appointment_id)) || {}
          const appointmentId = Number(a.appointment_id || row.appointment_id)
          const id = String(a.queue_number ?? row.queue_number ?? appointmentId ?? row.queue_id)
          const name = a.patient_name || `PID:${a.patient_id ?? "?"}`
          const reason = a.specialization || "Appointment"
          const position = Number(row.position || 0) || Number(a.queue_number || 0) || 0
          // Wait time estimate: (position-1) * 15 min
          const waitTime = Math.max(0, (position - 1) * 15)
          const status: QueuedPatient["status"] = position === 1 ? "in-consultation" : "waiting"
          return { id, appointmentId, position, name, reason, waitTime, status }
        })

        // Fallback: if no queue rows, derive queue from today's pending/scheduled appointments for this doctor
        let finalList: QueuedPatient[] = mappedFromQueue
        try {
          if ((mappedFromQueue?.length ?? 0) === 0 && doctorId != null) {
            const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
            const todaysForDoctor = (appts || []).filter((a: any) => {
              // Only appointments scheduled for today
              return String(a.scheduled_time || '').slice(0,10) === todayStr && Number(a.doctor_id) === Number(doctorId)
            })
            const active = todaysForDoctor.filter((a: any) => {
              const s = String(a.status || '').toLowerCase()
              return s === 'pending' || s === 'scheduled' || s === 'called' || s === 'in-consultation'
            })
            // Only use today's appointments; if none, show empty list (no fallback to other dates)
            const source = active
            // sort by queue_number then scheduled_time
            source.sort((a: any, b: any) => {
              const qa = a.queue_number ?? Number.MAX_SAFE_INTEGER
              const qb = b.queue_number ?? Number.MAX_SAFE_INTEGER
              if (qa !== qb) return qa - qb
              return String(a.scheduled_time || '').localeCompare(String(b.scheduled_time || ''))
            })
            finalList = source.map((a: any, idx: number) => {
              const appointmentId = Number(a.appointment_id)
              const position = (a.queue_number && Number(a.queue_number) > 0) ? Number(a.queue_number) : (idx + 1)
              const id = String(a.queue_number ?? appointmentId)
              const name = a.patient_name || `PID:${a.patient_id ?? '?'}`
              const reason = a.specialization || a.reason || 'Appointment'
              const waitTime = Math.max(0, (position - 1) * 15)
              // Reflect status if available, otherwise derive from position
              const s = String(a.status || '').toLowerCase()
              const status: QueuedPatient["status"] = (s === 'called' || s === 'in-consultation') ? (s as any) : (position === 1 ? 'in-consultation' : 'waiting')
              return { id, appointmentId, position, name, reason, waitTime, status }
            })
          }
        } catch {}

        if (!cancelled) setQueue(finalList)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load queue")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.email, user?.name])

  const filteredQueue = useMemo(() => {
    const q = (queue || [])
    const term = String(searchTerm || '').toLowerCase()
    return q.filter((patient) => {
      const name = String(patient?.name || '').toLowerCase()
      const id = String(patient?.id || '').toLowerCase()
      const reason = String(patient?.reason || '').toLowerCase()
      return name.includes(term) || id.includes(term) || reason.includes(term)
    })
  }, [queue, searchTerm])

  const handleMarkComplete = async (id: string) => {
    try {
      const p = queue.find((q) => q.id === id)
      if (!p) return

      // Fire-and-forget backend complete
      const res = await fetch(
        `/api/php/appointments/status?id=${encodeURIComponent(String(p.appointmentId))}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) }
      )
      if (!res.ok) {
        console.error('complete failed', await res.text())
      }

      // Optimistic UI update: mark as completed
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status: 'completed' as const } : q))
      )

      // Remove from list after a short delay and reindex others
      setTimeout(() => {
        setQueue((prev) =>
          prev
            .filter((q) => q.id !== id)
            .map((item, idx) => ({
              ...item,
              position: idx + 1,
              waitTime: Math.max(0, item.waitTime - 15),
            }))
        )
      }, 800)
    } catch (e) {
      console.error('complete error', e)
    }
  }

  const handleCallNext = (id: string) => {
    // Placeholder: would call backend to mark as called
    setQueue((prev) => prev.map((p) => (p.id === id ? { ...p, status: "called" as const } : p)))
  }

  const handleMoveUp = (id: string, currentPos: number) => {
    if (currentPos <= 1) return
    const idx = queue.findIndex((p) => p.id === id)
    const newQueue = [...queue]
    ;[newQueue[idx], newQueue[idx - 1]] = [newQueue[idx - 1], newQueue[idx]]
    setQueue(newQueue.map((p, i) => ({ ...p, position: i + 1 })))
  }

  const getStatusColor = (status: QueuedPatient["status"]) => {
    switch (status) {
      case "in-consultation":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-emerald-100 text-emerald-800"
      case "called":
        return "bg-blue-100 text-blue-800"
      case "waiting":
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getStatusIcon = (status: QueuedPatient["status"]) => {
    switch (status) {
      case "in-consultation":
        return <CheckCircle2 className="w-4 h-4" />
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />
      case "called":
        return <AlertCircle className="w-4 h-4" />
      case "waiting":
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Queue Management</h1>
        <p className="text-gray-600 mt-1">Manage patient queue and consultations</p>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total in Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{filteredQueue.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Being Served</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {filteredQueue.filter((p) => p.status === "in-consultation").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Longest Wait</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {Math.max(0, ...filteredQueue.map((p) => p.waitTime))} min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Queue with Search and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : error ? <span className="text-red-600">{error}</span> : "Manage queue and mark patients as complete"}
          </CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by ID, name, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Position</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length > 0 ? (
                  filteredQueue.map((patient) => (
                    <tr key={`${patient.appointmentId}-${patient.id}`} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {patient.id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-700">
                          {patient.position}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{patient.name}</td>
                      <td className="py-3 px-4 text-gray-600">{patient.reason}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getStatusColor(patient.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(patient.status)}
                            {patient.status === "in-consultation"
                              ? "Serving"
                              : patient.status === "called"
                                ? "Called"
                                : patient.status === "completed"
                                  ? "Completed"
                                  : "Waiting"}
                          </div>
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {patient.status === "waiting" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveUp(patient.id, patient.position)}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleCallNext(patient.id)}>
                                Call
                              </Button>
                            </>
                          )}

                          {(patient.status === "in-consultation" || patient.status === "called") && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleMarkComplete(patient.id)}
                            >
                              Complete
                            </Button>
                          )}
                          {patient.status === "completed" && (
                            <Badge className="bg-emerald-100 text-emerald-800">Done</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      {loading ? "Loading..." : "No patients found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
