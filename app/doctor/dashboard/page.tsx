"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useQueue } from "@/lib/queue-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Users, TrendingUp, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
interface TodayStats {
  totalPatients: number
  servedToday: number
  currentInQueue: number
  averageConsultationTime: number
}

interface Consultation {
  id: string
  name: string
  time: string
  status: 'completed' | 'pending' | 'cancelled'
  duration?: number
  queueNumber?: number
}

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<TodayStats | null>(null)

  // Derived from DB appointments: the pending appointment for this doctor (today)
  const [currentAppt, setCurrentAppt] = useState<{ id: string; name: string; reason?: string; queueNumber?: number } | null>(null)
  const { callNextPatient, completeConsultation } = useQueue()
  const [doctorId, setDoctorId] = useState<string | null>(null)

  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loadingConsults, setLoadingConsults] = useState(false)
  const [errorConsults, setErrorConsults] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const filteredConsultations = useMemo(() => consultations
    .filter((c) => c.status === 'completed' || c.status === 'cancelled')
    .filter((patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()),
    ), [consultations, searchTerm])

  const handleMarkComplete = () => {
    // For DB-driven current patient, navigate to queue to process completion
    if (currentAppt) {
      window.location.href = "/doctor/queue"
    }
  }

  const handleNextPatient = () => {
    if (doctorId) {
      callNextPatient(doctorId)
    }
  }

  const handleViewAnalytics = () => {
    console.log("[v0] Opening analytics view")
    setShowAnalytics(true)
  }

  // Helper to fetch JSON using the same pattern as Admin dashboard (always ?r=...)
  const fetchJsonWithFallback = async (relPath: string) => {
    const { getPhpApiBase } = await import("@/lib/php-api-config")
    const base = getPhpApiBase().replace(/\/?$/, "")
    const isFront = /\/index\.php$/.test(base)
    const url = isFront ? `${base}?r=${relPath}` : `${base}/index.php?r=${relPath}`
    const r = await fetch(url, { cache: 'no-store' })
    const text = await r.text()
    if (!r.ok) throw new Error(text || `HTTP ${r.status}`)
    try { return text ? JSON.parse(text) : null } catch { return { message: text } }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingConsults(true)
      setErrorConsults(null)
      try {
        // Load doctors, appointments, and today's total count (global)
        const [doctors, appts, todayCount] = await Promise.all([
          fetchJsonWithFallback("/doctors").catch(() => [] as any[]),
          fetchJsonWithFallback("/appointments").catch(() => [] as any[]),
          fetchJsonWithFallback("/appointments/today-count").catch(() => ({ count: null })),
        ])

        // Resolve doctor id by matching users to doctors; fall back to inferring from appointments
        let doctorId: number | null = null
        if (user) {
          // Prefer direct doctor_id from authenticated user if available and valid
          const directId = Number(user.id)
          if (!Number.isNaN(directId) && directId > 0) {
            const byId = doctors.find((d: any) => Number(d.doctor_id) === directId)
            if (byId) doctorId = directId
          }
          // Fallback to matching by email or name
          if (doctorId == null) {
            const matchByEmail = doctors.find((d: any) => (d.email || "").toLowerCase() === (user.email || "").toLowerCase())
            const matchByName = doctors.find((d: any) => (d.name || "").toLowerCase() === (user.name || "").toLowerCase())
            const d = matchByEmail || matchByName
            if (d) doctorId = Number(d.doctor_id)
          }
        }
        // Fallback: infer doctorId from appointments by matching doctor_name to user.name if not found in /doctors
        if (doctorId == null) {
          const byName = (appts || []).find((a: any) => (a.doctor_name || "").toLowerCase() === (user?.name || "").toLowerCase())
          if (byName && byName.doctor_id) doctorId = Number(byName.doctor_id)
        }
        if (doctorId != null) {
          setDoctorId(String(doctorId))
        }

        const now = new Date()
        // Use local date (en-CA) to match DB 'YYYY-MM-DD' regardless of timezone
        const todayStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD

        const todaysAppts = (appts || []).filter((a) => Number(a.doctor_id) === Number(doctorId) && (a.scheduled_time || "").slice(0,10) === todayStr)
        const completedToday = todaysAppts.filter((a) => (a.status || "").toLowerCase() === "completed")
        const cancelledToday = todaysAppts.filter((a) => (a.status || "").toLowerCase() === "cancelled" || (a.status || "").toLowerCase() === "canceled")
        const inQueue = todaysAppts.filter((a) => {
          const s = (a.status || "").toLowerCase()
          return s !== "completed" && s !== "cancelled" && s !== "canceled"
        })

        // Compute stats for top cards
        // Total Patients Today should reflect the total number of rows in the appointments table for the current day for THIS doctor
        const totalToday = todaysAppts.length
        const newStats: TodayStats = {
          totalPatients: totalToday,
          servedToday: completedToday.length + cancelledToday.length,
          currentInQueue: inQueue.length,
          averageConsultationTime: 15, // placeholder; compute if you store durations
        }

        // Determine the current patient for this doctor: prefer in-consultation, otherwise pending; sort by queue_number then time
        const isStatus = (a: any, statuses: string[]) => statuses.includes(String(a.status || '').toLowerCase())
        const inConsultation = todaysAppts.filter((a) => isStatus(a, ['in-consultation','in_consultation']))
        const pending = todaysAppts.filter((a) => isStatus(a, ['pending']))
        const sortAppts = (list: any[]) => list.slice().sort((a, b) => {
          const qa = a.queue_number ?? Number.MAX_SAFE_INTEGER
          const qb = b.queue_number ?? Number.MAX_SAFE_INTEGER
          if (qa !== qb) return qa - qb
          return (a.scheduled_time || '').localeCompare(b.scheduled_time || '')
        })
        const currentCandidate = (inConsultation.length > 0 ? sortAppts(inConsultation)[0] : sortAppts(pending)[0])
        if (!cancelled) {
          if (currentCandidate) {
            setCurrentAppt({
              id: String(currentCandidate.appointment_id),
              name: currentCandidate.patient_name || `PID:${currentCandidate.patient_id}`,
              reason: currentCandidate.reason || currentCandidate.notes || undefined,
              queueNumber: currentCandidate.queue_number ?? undefined,
            })
          } else {
            setCurrentAppt(null)
          }
        }

        // Build source for Today's Consultations list: prefer today's appts; if none, fall back to all appts for this doctor
        const doctorApptsAll = (appts || []).filter((a) => Number(a.doctor_id) === Number(doctorId))
        const sourceForList = (todaysAppts && todaysAppts.length > 0) ? todaysAppts : doctorApptsAll

        // Map to Consultation model (we will later filter to completed/cancelled in the view)
        const mapped: Consultation[] = (sourceForList || [])
          .slice()
          .sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""))
          .map((a) => {
            const time = a.scheduled_time ? new Date(a.scheduled_time) : null
            const timeStr = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
            const s = String(a.status || '').toLowerCase()
            const normalized = (s === 'completed' || s === 'pending' || s === 'cancelled' || s === 'canceled') ? (s === 'canceled' ? 'cancelled' : s) : 'pending'
            return {
              id: String(a.appointment_id),
              name: a.patient_name || `PID:${a.patient_id}`,
              time: timeStr,
              status: normalized,
              duration: normalized === 'completed' ? 15 : undefined, // if you later store durations, compute accordingly
              queueNumber: a.queue_number ?? undefined,
            }
          })
          .filter((c) => c.status === 'completed' || c.status === 'cancelled')
        if (!cancelled) {
          setConsultations(mapped)
          setStats(newStats)
        }
      } catch (e: any) {
        if (!cancelled) setErrorConsults(e?.message || "Failed to load consultations")
      } finally {
        if (!cancelled) setLoadingConsults(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.email, user?.name])

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, Dr. {user?.name}</h1>
        <p className="text-gray-600 mt-1">Here's your today's overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Patients Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalPatients ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Served/Cancelled Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats?.servedToday ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Completed consultations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.currentInQueue ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Waiting to be seen</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Patient */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Currently Serving
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg text-gray-900">{currentAppt?.name || "No patient pending"}</p>
              {currentAppt?.reason ? (
                <p className="text-sm text-gray-600">{currentAppt.reason}</p>
              ) : (
                <p className="text-sm text-gray-600">{currentAppt ? "" : "Call next patient to begin"}</p>
              )}
            </div>
            {currentAppt?.queueNumber ? (
              <Badge className="bg-blue-100 text-blue-800">Queue #{currentAppt.queueNumber}</Badge>
            ) : null}
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkComplete}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" onClick={handleNextPatient}>
              Next Patient
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Consultations with Search, Tabs and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Consultations</CardTitle>
          <CardDescription>{loadingConsults ? "Loading..." : errorConsults ? <span className="text-red-600">{errorConsults}</span> : "Showing completed and cancelled consultations for today. Use search to filter by ID or name."}</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Duration (min)</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Queue #</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultations.length > 0 ? (
                  filteredConsultations.map((patient) => (
                    <tr key={patient.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {patient.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{patient.name}</td>
                      <td className="py-3 px-4 text-gray-600">{patient.time}</td>
                      <td className="py-3 px-4 text-gray-600 capitalize">{patient.status}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{patient.status === 'completed' ? (patient.duration ?? '-') : '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{patient.queueNumber ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      {loadingConsults ? "Loading..." : "No consultations found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => (window.location.href = "/doctor/queue")}>
            <Users className="w-4 h-4 mr-2" />
            View Full Queue
          </Button>
          <Button variant="outline" onClick={handleViewAnalytics}>
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Analytics Modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analytics Dashboard</DialogTitle>
            <DialogDescription>View your performance metrics</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Consultation Time</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.averageConsultationTime ?? 15} minutes</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Patients Served Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats?.servedToday ?? 0}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Efficiency Rate</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {stats ? Math.round(((stats.servedToday || 0) / Math.max(1, stats.totalPatients || 0)) * 100) : 0}%
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
