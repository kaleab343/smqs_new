"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock } from "lucide-react"

interface DashboardMetrics {
  checkedInToday: number
  waitingNow: number
  completedToday: number
  avgWaitTime: number
}

export default function ReceptionistDashboard() {
  const [metrics] = useState<DashboardMetrics>({
    checkedInToday: 45,
    waitingNow: 8,
    completedToday: 37,
    avgWaitTime: 18,
  })

  const [upcomingAppointments, setUpcomingAppointments] = useState<Array<{ id: string; patient: string; time: string; doctor: string; status: string }>>([])

  const [checkedInToday, setCheckedInToday] = useState<number>(0)
  const [waitingToday, setWaitingToday] = useState<number>(0)
  const [inConsultationToday, setInConsultationToday] = useState<number>(0)

  useEffect(() => {
    const loadCheckedInToday = async () => {
      try {
        const res = await fetch('/api/php/appointments', { cache: 'no-store' })
        if (!res.ok) return
        const rows = await res.json().catch(() => [])
        if (!Array.isArray(rows)) return
        const count = rows.filter((r: any) => ['waiting','pending','called','in-consultation'].includes(String(r.status || ''))).length
        setCheckedInToday(count)
      } catch (e) {
        console.warn('load checked-in today failed', e)
      }
    }

    const toTime = (scheduled: string) => {
      const s = (scheduled || '').replace('T', ' ')
      const timePart = (s.split(' ')[1] || '').slice(0,5)
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
    const loadWaitingToday = async () => {
      try {
        const res = await fetch('/api/php/appointments', { cache: 'no-store' })
        if (!res.ok) return
        const rows = await res.json().catch(() => [])
        if (!Array.isArray(rows)) return
        // Match Patient Check-in Waiting card method: count all with status === 'waiting' (no date filter)
        const waiting = rows.filter((r: any) => String(r.status || '').toLowerCase() === 'waiting').length
        // Keep existing behavior for In Consultation if needed
        const today = new Date()
        const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
        let inConsult = 0
        for (const r of rows) {
          const status = String(r.status || '').toLowerCase()
          const st = String(r.scheduled_time || '')
          const dt = new Date(st.replace(' ', 'T'))
          if (isSameDay(today, dt) && status === 'in-consultation') inConsult++
        }
        setWaitingToday(waiting)
        setInConsultationToday(inConsult)
      } catch (e) {
        console.warn('load waiting now failed', e)
      }
    }

    const loadInConsultationToday = async () => {
      try {
        const res = await fetch('/api/php/appointments', { cache: 'no-store' })
        if (!res.ok) return
        const rows = await res.json().catch(() => [])
        if (!Array.isArray(rows)) return
        const today = new Date()
        const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
        let count = 0
        for (const r of rows) {
          const status = String(r.status || '').toLowerCase()
          const st = String(r.scheduled_time || '')
          const dt = new Date(st.replace(' ', 'T'))
          if ((status === 'completed' || status === 'done' || status === 'served') && isSameDay(today, dt)) count++
        }
        setCompletedToday(count)
      } catch (e) {
        console.warn('load completed today failed', e)
      }
    }

    const load = async () => {
      try {
        const res = await fetch('/api/php/appointments', { cache: 'no-store' })
        if (!res.ok) { setUpcomingAppointments([]); return }
        const body = await res.json().catch(() => [])
        if (!Array.isArray(body)) { setUpcomingAppointments([]); return }
        const upcoming = body
          .filter((r: any) => {
            const st = String(r.scheduled_time || '')
            const dt = new Date(st.replace(' ', 'T'))
            return !isNaN(dt.getTime())
          })
          .sort((a: any, b: any) => new Date(String(a.scheduled_time).replace(' ', 'T')).getTime() - new Date(String(b.scheduled_time).replace(' ', 'T')).getTime())
          .slice(0, 3)
          .map((r: any) => ({
            id: String(r.appointment_id ?? ''),
            patient: String(r.patient_name || r.patient_id || ''),
            time: toTime(String(r.scheduled_time || '')),
            doctor: String(r.doctor_name || r.doctor_id || ''),
            status: String(r.status || 'pending'),
          }))
        setUpcomingAppointments(upcoming)
      } catch (e) {
        console.error('load upcoming appointments error', e)
        setUpcomingAppointments([])
      }
    }
    loadCheckedInToday()
    loadWaitingToday()
    loadInConsultationToday()
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receptionist Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of check-ins and appointments</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Checked In Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{checkedInToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{waitingToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Consultation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{inConsultationToday}</div>
          </CardContent>
        </Card>

      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Quick Check-in
            </CardTitle>
            <CardDescription>Check in a new patient</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                console.log("[v0] Navigating to check-in page")
                window.location.href = "/receptionist/check-in"
              }}
            >
              Check In Patient
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              View Queue
            </CardTitle>
            <CardDescription>See current queue status</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => (window.location.href = "/receptionist/check-in")}
            >
              Open Queue
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Next 3 scheduled appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700 mr-2">{apt.id}</span>
                    {apt.patient}
                  </p>
                  <p className="text-sm text-gray-600">{apt.doctor}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{apt.time}</span>
                  <Badge
                    className={
                      apt.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
