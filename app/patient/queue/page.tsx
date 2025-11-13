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

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const { getPhpApiBase } = await import("@/lib/php-api-config")
        const resp = await fetch(`${getPhpApiBase()}/queue`, { cache: "no-store" })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data?.error || "Failed to load queue")
        if (mounted) setRaw(Array.isArray(data) ? data : [])
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
    const minPos = raw.length ? Math.min(...raw.map((r) => r.position)) : 0
    return raw
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        id: String(r.queue_number ?? r.queue_id),
        position: r.position,
        patientName: null, // Not provided by backend; can be enhanced via a /queue/detailed endpoint
        status: r.position === minPos ? "in-consultation" : "waiting",
        estimatedTime: Math.max(0, (r.position - 1) * avgMins),
      }))
  }, [raw])

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
            <div className="text-3xl font-bold text-gray-900">{currentInConsultation?.position || "-"}</div>
            <p className="text-sm text-gray-500 mt-1">{currentInConsultation?.id || "None"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalWaiting}</div>
            <p className="text-sm text-gray-500 mt-1">Patients in queue</p>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Estimated Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length > 0 ? (
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
                      <td className="py-3 px-4 text-gray-600">
                        {entry.status === "in-consultation" ? "In progress" : `${entry.estimatedTime} min`}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-gray-500">
                      {error ? `Error: ${error}` : loading ? "Loading..." : "No queue entries"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Peak Hours</p>
              <p className="text-sm text-gray-600">Queue is usually longest between 2-4 PM</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Best Time to Visit</p>
              <p className="text-sm text-gray-600">Morning hours (9-11 AM) have shorter wait times</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
