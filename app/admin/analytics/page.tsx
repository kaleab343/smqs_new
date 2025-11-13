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
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const base = getPhpApiBase()
        const [depsRes, docsRes, queueRes] = await Promise.all([
          fetch(`${base}/departments`, { cache: "no-store" }),
          fetch(`${base}/doctors`, { cache: "no-store" }),
          fetch(`${base}/queue`, { cache: "no-store" }),
        ])
        const [deps, docs, q] = await Promise.all([
          depsRes.json().catch(() => []),
          docsRes.json().catch(() => []),
          queueRes.json().catch(() => []),
        ])
        if (!depsRes.ok) throw new Error((deps && deps.error) || "Failed to load departments")
        if (!docsRes.ok) throw new Error((docs && docs.error) || "Failed to load doctors")
        if (!queueRes.ok) throw new Error((q && q.error) || "Failed to load queue")
        if (!mounted) return
        setDepartments(Array.isArray(deps) ? deps : [])
        setDoctors(Array.isArray(docs) ? docs : [])
        setQueue(Array.isArray(q) ? q : [])
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

  const roleDistribution = useMemo(() => ([
    { name: "Patients", value: 0, color: "#10b981" },
    { name: "Doctors", value: doctors.length, color: "#3b82f6" },
    { name: "Receptionists", value: 0, color: "#a855f7" },
    { name: "Admins", value: 0, color: "#ef4444" },
  ]), [doctors.length])

  const queueMetrics = useMemo(() => {
    // Backend doesn't provide wait time; estimate based on queue length distribution
    const total = queue.length
    const avgWait = Math.min(60, Math.round(total * 5))
    return [
      { name: "Mon", avgWaitTime: avgWait, totalPatients: total },
      { name: "Tue", avgWaitTime: avgWait, totalPatients: total },
      { name: "Wed", avgWaitTime: avgWait, totalPatients: total },
      { name: "Thu", avgWaitTime: avgWait, totalPatients: total },
      { name: "Fri", avgWaitTime: avgWait, totalPatients: total },
      { name: "Sat", avgWaitTime: avgWait, totalPatients: total },
    ]
  }, [queue.length])

  // Aggregate doctors by department (specialization)
  const doctorsByDept = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of doctors) {
      const spec = (d.specialization || d.department || 'Unknown') as string
      m.set(spec, (m.get(spec) || 0) + 1)
    }
    return Array.from(m.entries()).map(([dept, count]) => ({ dept, count }))
  }, [doctors])

  const avgWaitMins = useMemo(() => Math.min(60, Math.round(queue.length * 5)), [queue.length])

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

        {/* Role Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>System users by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Queue Wait Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Queue Metrics</CardTitle>
            <CardDescription>Average wait time by day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={queueMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgWaitTime" stroke="#3b82f6" name="Wait Time (min)" />
                  <Line type="monotone" dataKey="totalPatients" stroke="#10b981" name="Total Patients" />
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
                  <span className="text-sm font-medium text-gray-700">Queue Efficiency</span>
                  <span className="text-sm font-bold text-blue-600">92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "92%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Doctor Utilization</span>
                  <span className="text-sm font-bold text-green-600">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "85%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Patient Satisfaction</span>
                  <span className="text-sm font-bold text-purple-600">88%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "88%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
