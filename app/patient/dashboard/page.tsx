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
    throw new Error(`POST failed ${relPath}: ${last?.status || ''} ${msg}`)
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

  // Specialization modal state
  const [specOpen, setSpecOpen] = useState(false)
  const [specs, setSpecs] = useState<Array<{ id: string; name: string }>>([])
  const [selectedSpec, setSelectedSpec] = useState<string>("")

  // Load real queue metrics from backend and current pending state for this user
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const q = await fetchJsonWithFallback("/queue")
        const total = Array.isArray(q) ? q.length : 0
        if (!cancelled) {
          setMetrics((prev) => ({ ...prev, totalInQueue: total }))
        }
      } catch (e) {
        console.warn("Failed to load queue metrics", e)
      }
      try {
        // If we have a logged-in user, query current appointment
        const uid = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}')?.id : undefined
        if (uid) {
          // We need patient_id; backend requires patient_id
          // Try proxy endpoint which expects patient_id query
          const current = await fetchJsonWithFallback(`/appointments/current?user_id=${encodeURIComponent(uid)}`)
          const status = current?.status || ''
          if (!cancelled) {
            const pending = status === 'pending'
            setIsPending(pending)
          }
        }
      } catch (e) {
        console.warn('Failed to load current appointment for user', e)
      }
    }
    load()
    const t = setInterval(load, 30_000) // refresh periodically
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const handleOpenSpec = async () => {
    setSpecOpen(true)
    try {
      const deps = await fetchJsonWithFallback("/departments")
      if (Array.isArray(deps)) setSpecs(deps)
    } catch (e) {
      console.warn("Failed to load specializations", e)
    }
  }

  const handleConfirmJoin = async () => {
    if (!selectedSpec) return
    try {
      // Find a doctor by specialization
      const docs = await fetchJsonWithFallback(`/doctors?specialization=${encodeURIComponent(selectedSpec)}`)
      const doctorId = Array.isArray(docs) && docs[0]?.doctor_id ? Number(docs[0].doctor_id) : null
      if (!doctorId) throw new Error('No doctor available for the selected specialization')

      const nowPlus5 = new Date(Date.now() + 5 * 60 * 1000)
      const scheduled_time = nowPlus5.toISOString().slice(0,19).replace('T',' ')

      const stored = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
      const name = stored?.name || user?.name || ''
      const email = stored?.email || user?.email || ''

      const payload: any = { doctor_id: doctorId, scheduled_time }
      if (stored?.patient_id) payload.patient_id = Number(stored.patient_id)
      else {
        if (name) payload.name = name
        if (email) payload.email = email
      }

      const data = await postWithFallback('/appointments', payload)

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
            <CardDescription>{isQueued ? "You are in the queue" : "Not currently in queue"}</CardDescription>
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
              <span className="text-sm text-gray-600">Total in Queue:</span>
              <span className="font-bold text-lg text-gray-900">{metrics.totalInQueue}</span>
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
            <Select value={selectedSpec} onValueChange={setSelectedSpec}>
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
