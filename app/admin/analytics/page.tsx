"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { useEffect, useMemo, useState } from "react"
import { getPhpApiBase } from "@/lib/php-api-config"

export default function AnalyticsPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [totals, setTotals] = useState<{ doctors: number; patients: number }>({ doctors: 0, patients: 0 })
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [satisfactionPct, setSatisfactionPct] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const base = getPhpApiBase()
        const [depsRes, docsRes, queueRes, apptRes, statsRes, csatRes] = await Promise.all([
          fetch(`${base}/departments`, { cache: "no-store" }),
          fetch(`${base}/doctors`, { cache: "no-store" }),
          fetch(`${base}/queue`, { cache: "no-store" }),
          fetch(`${base}/appointments`, { cache: "no-store" }),
          fetch(`${base}/admin/stats`, { cache: "no-store" }),
          fetch(`${base}/customer-satisfaction/average`, { cache: "no-store" }),
        ])
        const [deps, docs, q, appts, stats, csat] = await Promise.all([
          depsRes.json().catch(() => []),
          docsRes.json().catch(() => []),
          queueRes.json().catch(() => []),
          apptRes.json().catch(() => []),
          statsRes.json().catch(() => ({})),
          csatRes.json().catch(() => ({})),
        ])
        if (!depsRes.ok) throw new Error((deps && deps.error) || "Failed to load departments")
        if (!docsRes.ok) throw new Error((docs && docs.error) || "Failed to load doctors")
        if (!queueRes.ok) throw new Error((q && q.error) || "Failed to load queue")
        if (!apptRes.ok) throw new Error((appts && appts.error) || "Failed to load appointments")
        if (!statsRes.ok) throw new Error((stats && stats.error) || "Failed to load stats")
        if (!csatRes.ok) throw new Error((csat && csat.error) || "Failed to load satisfaction")
        if (!mounted) return
        setDepartments(Array.isArray(deps) ? deps : [])
        setDoctors(Array.isArray(docs) ? docs : [])
        setQueue(Array.isArray(q) ? q : [])
        setAppointments(Array.isArray(appts) ? appts : [])
        setTotals({ doctors: Number(stats.total_doctors || 0), patients: Number(stats.total_patients || 0) })
        setSatisfactionPct(Math.max(0, Math.min(100, Number(csat.percentage || 0))))
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "Failed to load analytics")
        console.error("Analytics load failed:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    const t = setInterval(load, 15000)
    return () => { mounted = false; clearInterval(t) }
  }, [])

  const roleDistribution = useMemo(() => {
    const d = totals.doctors
    const p = totals.patients
    return [
      { name: "Patients", value: p, color: "#10b981" },
      { name: "Doctors", value: d, color: "#3b82f6" },
    ]
  }, [totals.doctors, totals.patients])

  const queueMetrics = useMemo(() => {
    // Build weekly counts for completed vs cancelled from appointments
    const byDay: Record<string, { completed: number; cancelled: number }> = {
      Sun: { completed: 0, cancelled: 0 },
      Mon: { completed: 0, cancelled: 0 },
      Tue: { completed: 0, cancelled: 0 },
      Wed: { completed: 0, cancelled: 0 },
      Thu: { completed: 0, cancelled: 0 },
      Fri: { completed: 0, cancelled: 0 },
      Sat: { completed: 0, cancelled: 0 },
    }
    for (const a of appointments) {
      const t = a.created_at || a.scheduled_time || a.time || null
      if (!t) continue
      const d = new Date(t)
      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
      const status = String(a.status || '').toLowerCase()
      if (status === 'completed') byDay[day].completed += 1
      if (status === 'cancelled' || status === 'canceled') byDay[day].cancelled += 1
    }
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => ({
      name: day,
      completed: byDay[day].completed,
      cancelled: byDay[day].cancelled,
    }))
  }, [appointments])

  const doctorPatient = useMemo(() => {
    const d = Math.max(0, Number(totals.doctors || 0))
    const p = Math.max(0, Number(totals.patients || 0))
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    let rd = d, rp = p
    if (d === 0 && p === 0) { rd = 0; rp = 0 }
    else if (d === 0) { rd = 0; rp = 1 }
    else if (p === 0) { rd = 1; rp = 0 }
    else {
      const g = gcd(d, p) || 1
      rd = Math.floor(d / g)
      rp = Math.floor(p / g)
    }
    return { d, p, rd, rp }
  }, [totals.doctors, totals.patients])

  // Aggregate doctors by department (specialization) using full departments list
  const doctorsByDept = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const d of doctors) {
      const spec = (d.specialization || d.department || 'Unknown') as string
      countMap.set(spec, (countMap.get(spec) || 0) + 1)
    }
    // Ensure all specializations from departments are present, even if zero
    const list: { dept: string; count: number }[] = []
    const depNames = (departments || []).map((x: any) => String(x.name || x.id || 'Unknown'))
    const unique = new Set<string>()
    for (const name of depNames) { unique.add(name) }
    // Also include any specialization seen in doctors but not in departments
    for (const k of countMap.keys()) { unique.add(k) }
    for (const name of Array.from(unique)) {
      list.push({ dept: name, count: countMap.get(name) || 0 })
    }
    // Sort by name for stable display
    list.sort((a, b) => a.dept.localeCompare(b.dept))
    return list
  }, [doctors, departments])

  const avgWaitMins = useMemo(() => Math.min(60, Math.round(queue.length * 5)), [queue.length])

  // Doctor utilization computed from appointments and total doctors
  const doctorUtil = useMemo(() => {
    const totalDoctors = Math.max(1, Number(totals.doctors || 0))
    let completed = 0, cancelled = 0
    for (const a of appointments) {
      const s = String(a.status || '').toLowerCase()
      if (s === 'completed') completed++
      else if (s === 'cancelled' || s === 'canceled') cancelled++
    }
    const denom = Math.max(1, completed + cancelled)
    const pct = Math.round((completed / denom) * 100)
    const perDocCompleted = +(completed / totalDoctors).toFixed(1)
    const perDocCancelled = +(cancelled / totalDoctors).toFixed(1)
    return { completed, cancelled, pct, perDocCompleted, perDocCancelled }
  }, [appointments, totals.doctors])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">System performance and usage metrics</p>
      </div>

      {/* Key Metrics (live) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Queue Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{queue.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{doctors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{departments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctors by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Doctors by Department</CardTitle>
            <CardDescription>Count of doctors per specialization (live)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorsByDept}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dept" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Doctors" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Doctors vs Patients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Doctors', value: Math.max(0, totals.doctors), color: '#3b82f6' },
                      { name: 'Patients', value: Math.max(0, totals.patients), color: '#10b981' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-3 text-sm text-gray-600">
              Ratio: <span className="font-semibold text-gray-900">{doctorPatient.rd}:{doctorPatient.rp}</span>
            </div>
          </CardContent>
        </Card>

        {/* Queue Wait Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Queue Metrics</CardTitle>
            <CardDescription>Completed vs Cancelled by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={queueMetrics} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
                  <Line type="monotone" dataKey="cancelled" stroke="#ef4444" name="Cancelled" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Doctor Utilization</span>
                  <span className="text-sm font-bold text-green-600">{doctorUtil.pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.max(5, Math.min(100, doctorUtil.pct))}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Patient Satisfaction</span>
                  <span className="text-sm font-bold text-purple-600">{satisfactionPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.max(5, Math.min(100, satisfactionPct))}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
