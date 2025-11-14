"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, AlertCircle, CheckCircle2, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface QueueMetrics {
  id: string
  currentWaitTime: number
  peopleAhead: number
  totalInQueue: number
  estimatedTime: number
}

export default function PatientDashboard() {
  // Helper to build candidate URLs for PHP endpoints (supports pretty and index.php?r= styles)
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
    for (const url of urls) {
      try {
        const r = await fetch(url)
        if (r.ok) {
          const text = await r.text()
          try { return text ? JSON.parse(text) : null } catch { return { message: text } }
        }
      } catch (e) {
        // try next
      }
    }
    throw new Error("Fetch failed: " + relPath)
  }

  const postWithFallback = async (relPath: string, payload: any) => {
    const { getPhpApiBase } = await import("@/lib/php-api-config")
    const base = getPhpApiBase().replace(/\/$/, "")
    const urls = buildUrls(base, relPath)
    const attempts: Array<{ url: string; opts: RequestInit }> = []
    for (const url of urls) {
      attempts.push({ url, opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } })
      attempts.push({ url, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(payload) as any } })
    }
    let last: Response | null = null
    for (const a of attempts) {
      try {
        const r = await fetch(a.url, a.opts)
        last = r
        if (r.ok) {
          const t = await r.text()
          try { return t ? JSON.parse(t) : null } catch { return { message: t } }
        }
      } catch {
        // try next
      }
    }
    const msg = last ? await last.text().catch(() => '') : ''
    let friendly = msg
    try {
      const obj = msg ? JSON.parse(msg) : null
      if (obj && (obj.error || obj.message)) friendly = obj.error || obj.message
    } catch {}
    throw new Error(friendly || 'Request failed')
  }

  const { user } = useAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState<QueueMetrics>({
    id: "ID0001",
    currentWaitTime: 15,
    peopleAhead: 3,
    totalInQueue: 8,
    estimatedTime: 45,
  })
  const [isQueued, setIsQueued] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [hasAppointment, setHasAppointment] = useState(false)
  const [nextApptAt, setNextApptAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<string>("")
  const [patientStatus, setPatientStatus] = useState<string>("")
  const [patientsAhead, setPatientsAhead] = useState<number>(0)

  // Specialization modal state
  const [specOpen, setSpecOpen] = useState(false)
  const [specs, setSpecs] = useState<Array<{ id: string; name: string }>>([])
  const [selectedSpec, setSelectedSpec] = useState<string>("")
  const [doctorsBySpec, setDoctorsBySpec] = useState<Array<{ doctor_id: number; name: string; specialization?: string; status?: string }>>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | "">("")
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  // Load real queue metrics from backend and current pending state for this user
  useEffect(() => {
    let cancelled = false
    async function load() {
      let q: any[] = []
      try {
        const qres = await fetchJsonWithFallback("/queue")
        q = Array.isArray(qres) ? qres : []
        const total = q.length
        if (!cancelled) {
          setMetrics((prev) => ({ ...prev, totalInQueue: total }))
        }
      } catch (e) {
        console.warn("Failed to load queue metrics", e)
      }
      try {
        // If we have a logged-in user, query current/next appointment
        const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
        const uid = stored?.id
        if (uid) {
          const current = await fetchJsonWithFallback(`/appointments/current?user_id=${encodeURIComponent(uid)}`)
          const appt = (current && (current.appointment || current)) || null
          const qinfo = (current && (current.queue || null)) || null
          const status = String(appt?.status || current?.status || '')
          const when = (appt?.scheduled_time || current?.scheduled_time || current?.time || current?.appointment_time || null)
          const pos = typeof qinfo?.position === 'number' ? qinfo.position : (qinfo?.position ? Number(qinfo.position) : 0)
          const doctorId = appt?.doctor_id || current?.doctor_id || null
          // Compute patients ahead for the same doctor only
          let aheadByDoctor = 0
          if (Array.isArray(q) && doctorId && pos > 0) {
            aheadByDoctor = q.filter((row: any) => Number(row.position) < pos && Number(row.doctor_id) === Number(doctorId)).length
          }
          if (!cancelled) {
            const activeStatuses = ['pending','waiting','called','in-consultation']
            setIsPending(activeStatuses.includes(status))
            setPatientStatus(status)
            setPatientsAhead((status === 'in-consultation' || status === 'pending') ? 0 : aheadByDoctor)
            if (when) {
              setHasAppointment(true)
              setNextApptAt(when)
            } else {
              setHasAppointment(false)
              setNextApptAt(null)
            }
          }
        } else {
          if (!cancelled) { setHasAppointment(false); setNextApptAt(null); setPatientStatus(''); setPatientsAhead(0) }
        }
      } catch (e) {
        console.warn('Failed to load current appointment for user', e)
        if (!cancelled) { setHasAppointment(false); setNextApptAt(null); setPatientStatus(''); setPatientsAhead(0) }
      }
    }
    load()
    const t = setInterval(load, 30_000) // refresh periodically
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // Live countdown to next appointment
  useEffect(() => {
    if (!nextApptAt) { setCountdown(""); return }
    let stop = false
    const toTs = Date.parse(nextApptAt)
    const tick = () => {
      if (stop) return
      const now = Date.now()
      const diff = Math.max(0, toTs - now)
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const parts = [] as string[]
      if (h > 0) parts.push(`${h}h`)
      parts.push(`${m}m`)
      parts.push(`${s}s`)
      setCountdown(parts.join(" "))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => { stop = true; clearInterval(iv) }
  }, [nextApptAt])

  const handleOpenSpec = async () => {
    setSpecOpen(true)
    try {
      const deps = await fetchJsonWithFallback("/departments")
      if (Array.isArray(deps)) setSpecs(deps)
    } catch (e) {
      console.warn("Failed to load specializations", e)
    }
  }

  // Load active doctors when specialization changes
  useEffect(() => {
    const run = async () => {
      if (!specOpen || !selectedSpec) { setDoctorsBySpec([]); setSelectedDoctorId(""); return }
      try {
        setLoadingDoctors(true)
        const docs = await fetchJsonWithFallback(`/doctors?specialization=${encodeURIComponent(selectedSpec)}`)
        if (Array.isArray(docs)) {
          const act = docs.filter((d: any) => String(d.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
          setDoctorsBySpec(act)
          // preselect first
          setSelectedDoctorId(act[0]?.doctor_id ?? "")
        } else {
          setDoctorsBySpec([])
          setSelectedDoctorId("")
        }
      } catch (e) {
        console.warn('Failed to load doctors for specialization', e)
        setDoctorsBySpec([])
        setSelectedDoctorId("")
      } finally {
        setLoadingDoctors(false)
      }
    }
    run()
  }, [specOpen, selectedSpec])

  const handleConfirmJoin = async () => {
    if (!selectedSpec) { alert('Please select a specialization'); return }
    const doctorId = selectedDoctorId ? Number(selectedDoctorId) : NaN
    if (!doctorId || Number.isNaN(doctorId)) { alert('Please select a doctor'); return }
    try {
      const nowPlus5 = new Date(Date.now() + 5 * 60 * 1000)
      // Format as local time (YYYY-MM-DD HH:MM:SS) to match backend expectation
      const pad = (n: number) => String(n).padStart(2, '0')
      const scheduled_time = `${nowPlus5.getFullYear()}-${pad(nowPlus5.getMonth()+1)}-${pad(nowPlus5.getDate())} ${pad(nowPlus5.getHours())}:${pad(nowPlus5.getMinutes())}:${pad(nowPlus5.getSeconds())}`

      const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
      const name = stored?.name || user?.name || ''
      const email = stored?.email || user?.email || ''

      const payload: any = { doctor_id: doctorId, scheduled_time }
      if (stored?.patient_id) payload.patient_id = Number(stored.patient_id)
      else {
        if (name) payload.name = name
        if (email) payload.email = email
      }

      await postWithFallback('/appointments', payload)

      // Mark state as pending and queued, refresh metrics
      setIsQueued(true)
      setIsPending(true)
      setMetrics((prev) => ({ ...prev, totalInQueue: prev.totalInQueue + 1 }))
      setSpecOpen(false)
    } catch (e) {
      console.error(e)
      alert((e as Error).message || 'Failed to join queue')
    }
  }

  const handleLeaveQueue = () => {
    console.log("[v0] Leave queue clicked")
    setIsQueued(false)
    setMetrics((prev) => ({
      ...prev,
      totalInQueue: Math.max(0, prev.totalInQueue - 1),
    }))
  }

  const handleViewQueueStatus = () => {
    console.log("[v0] View queue status clicked")
    router.push("/patient/queue")
  }

  const handleManageAppointments = () => {
    console.log("[v0] Manage appointments clicked")
    router.push("/patient/appointments")
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600 mt-1">Check your queue status and manage appointments</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Status</CardTitle>
            <CardDescription>
              {hasAppointment && nextApptAt ? (
                <>Next appointment in <span className="font-semibold text-gray-900">{countdown}</span></>
              ) : (
                <>No appointments booked</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isQueued ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-900">You are in queue</p>
                  </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={handleLeaveQueue}>
                  Leave Queue
                </Button>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Ready to join?</p>
                  </div>
                </div>
                <Button className={`w-full ${isPending ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed opacity-90' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={isPending} onClick={handleOpenSpec}>
                  {isPending ? 'waiting in queue' : 'Join Queue'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queue Metrics ({metrics.id})</CardTitle>
            <CardDescription>Real-time information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Patients ahead of you:</span>
              <span className="font-bold text-lg text-gray-900">{(patientStatus === 'in-consultation' || patientStatus === 'pending') ? 'You are with the doctor now' : (patientStatus === 'completed' ? 'Completed service' : patientsAhead)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Access other features</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleViewQueueStatus}>
            <Clock className="w-4 h-4 mr-2" />
            View Full Queue Status
          </Button>
          <Button variant="outline" onClick={handleManageAppointments}>
            <Users className="w-4 h-4 mr-2" />
            Manage Appointments
          </Button>
        </CardContent>
      </Card>

      {/* Specialization selection dialog */}
      <Dialog open={specOpen} onOpenChange={setSpecOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select specialization</DialogTitle>
            <DialogDescription>Choose the department for your visit.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select value={selectedSpec} onValueChange={(v) => { setSelectedSpec(v); setSelectedDoctorId("") }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select specialization" />
              </SelectTrigger>
              <SelectContent>
                {specs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
              <select
                value={String(selectedDoctorId)}
                onChange={(e) => setSelectedDoctorId(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedSpec || loadingDoctors}
              >
                <option value="">{loadingDoctors ? 'Loading doctors...' : (!selectedSpec ? 'Select specialization first' : (doctorsBySpec.length ? 'Select a doctor' : 'No active doctors'))}</option>
                {doctorsBySpec.map((d) => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.name}{d.specialization ? ` (${d.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecOpen(false)}>Cancel</Button>
            <Button disabled={!selectedSpec} onClick={handleConfirmJoin}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
