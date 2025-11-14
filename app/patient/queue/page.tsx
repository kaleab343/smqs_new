"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PhpQueueEntry {
  queue_id: number
  appointment_id: number
  queue_number: number
  position: number
  doctor_id?: number
  scheduled_time?: string
  patient_name?: string
}

interface UiQueueEntry {
  id: string
  position: number
  patientName: string | null
  status: "waiting" | "in-consultation" | "completed"
  estimatedTime: number
}

export default function QueueStatusPage() {
  const [raw, setRaw] = useState<PhpQueueEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [assignedDoctorId, setAssignedDoctorId] = useState<number | null>(null)
  const [assignedDoctorName, setAssignedDoctorName] = useState<string>("")
  const [todayDoctorQueueCount, setTodayDoctorQueueCount] = useState<number>(0)
  const [todayDoctorWaitingCount, setTodayDoctorWaitingCount] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { getPhpApiBase } = await import("@/lib/php-api-config")
        const base = getPhpApiBase()
        const resp = await fetch(`${base}/queue`, { cache: "no-store" })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data?.error || "Failed to load queue")
        const rows: PhpQueueEntry[] = Array.isArray(data) ? data : []
        if (mounted) setRaw(rows)

        // Determine assigned doctor for logged-in patient and compute today's queue count
        try {
          const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
          const uid = stored?.id
          if (uid) {
            const resp2 = await fetch(`${base}/appointments/current?user_id=${encodeURIComponent(uid)}`, { cache: 'no-store' })
            const cur = await resp2.json()
            if (resp2.ok && cur) {
              const appt = cur.appointment || cur
              const doc = cur.doctor || null
              const did = Number(appt?.doctor_id || cur?.doctor_id || 0) || null
              const dname = doc?.name || ''
              if (mounted) {
                setAssignedDoctorId(did)
                setAssignedDoctorName(dname)
                if (did) {
                  const todayStr = new Date().toISOString().slice(0,10)
                  const sameDocToday = rows.filter(r => Number(r.doctor_id) === did && String(r.scheduled_time || '').slice(0,10) === todayStr)
                  const count = sameDocToday.length
                  setTodayDoctorQueueCount(count)
                  // Estimate waiting as all entries except the one with smallest position (assumed in-consultation)
                  if (sameDocToday.length > 0) {
                    const minPos = Math.min(...sameDocToday.map(r => Number(r.position)))
                    const waiting = sameDocToday.filter(r => Number(r.position) !== minPos).length
                    setTodayDoctorWaitingCount(waiting)
                  } else {
                    setTodayDoctorWaitingCount(0)
                  }
                } else {
                  setTodayDoctorQueueCount(0)
                  setTodayDoctorWaitingCount(0)
                }
              }
            } else if (mounted) {
              setAssignedDoctorId(null)
              setAssignedDoctorName('')
              setTodayDoctorQueueCount(0)
            }
          } else if (mounted) {
            setAssignedDoctorId(null)
            setAssignedDoctorName('')
            setTodayDoctorQueueCount(0)
          }
        } catch {
          if (mounted) {
            setAssignedDoctorId(null)
            setAssignedDoctorName('')
            setTodayDoctorQueueCount(0)
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load queue")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  const queueEntries: UiQueueEntry[] = useMemo(() => {
    const avgMins = 15
    if (!assignedDoctorId) return []
    const todayStr = new Date().toISOString().slice(0,10)
    const sameDocToday = raw.filter(r => Number(r.doctor_id) === Number(assignedDoctorId) && String(r.scheduled_time || '').slice(0,10) === todayStr)
    if (sameDocToday.length === 0) return []
    const minPosAll = Math.min(...sameDocToday.map(r => Number(r.position)))
    const waitingRows = sameDocToday.filter(r => Number(r.position) !== minPosAll)
    return waitingRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        id: String(r.queue_number ?? r.queue_id),
        position: r.position,
        patientName: r.patient_name || null,
        status: "waiting",
        estimatedTime: Math.max(0, (r.position - 1) * avgMins),
      }))
  }, [raw, assignedDoctorId])

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return queueEntries.filter((entry) =>
      entry.id.toLowerCase().includes(query) ||
      (entry.patientName || "").toLowerCase().includes(query) ||
      entry.position.toString().includes(query) ||
      entry.status.toLowerCase().includes(query)
    )
  }, [queueEntries, searchQuery])

  const getStatusColor = (status: UiQueueEntry["status"]) => {
    switch (status) {
      case "in-consultation":
        return "bg-green-100 text-green-800"
      case "waiting":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const currentInConsultation = queueEntries.find((e) => e.status === "in-consultation")
  const totalWaiting = queueEntries.filter((e) => e.status === "waiting").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Queue Status</h1>
        <p className="text-gray-600 mt-1">Real-time view of the current queue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Currently Serving</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedDoctorId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Doctor</span>
                  <span className="text-base font-semibold text-gray-900">{assignedDoctorName || `#${assignedDoctorId}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Today&#39;s queue for this doctor</span>
                  <span className="text-2xl font-bold text-gray-900">{todayDoctorQueueCount}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">Not assigned doctor yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Waiting (for your doctor today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{assignedDoctorId ? todayDoctorWaitingCount : totalWaiting}</div>
            <p className="text-sm text-gray-500 mt-1">{assignedDoctorId ? 'Patients waiting for your doctor today' : 'Patients in queue'}</p>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue List</CardTitle>
          <CardDescription>Your position and estimated wait time</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by Queue ID, name, position, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-500 mt-2">
                Found {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Queue ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Patient Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  
                </tr>
              </thead>
              <tbody>
                {assignedDoctorId ? (
                  filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {entry.id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 text-sm">
                            {entry.position}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{entry.patientName ?? '-'}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(entry.status)}>
                            {entry.status === "in-consultation"
                              ? "Serving"
                              : entry.status === "waiting"
                                ? "Waiting"
                                : "Completed"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 px-4 text-center text-gray-500">
                        {error ? `Error: ${error}` : loading ? "Loading..." : "No waiting patients for your doctor today"}
                      </td>
                    </tr>
                  )
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-gray-500">
                      No schedule yet
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
