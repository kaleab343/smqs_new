"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LogsPage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lines, setLines] = React.useState<string[]>([])
  const [filter, setFilter] = React.useState("")
  const [meta, setMeta] = React.useState<any>({})

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/php/admin/logs', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      setLines(Array.isArray(data?.php_error_log) ? data.php_error_log : [])
      setMeta({ db: data?.db, server: data?.server })
    } catch (e:any) {
      setError(e?.message || 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  const shown = React.useMemo(() => {
    if (!filter) return lines
    const f = filter.toLowerCase()
    return lines.filter(l => l.toLowerCase().includes(f))
  }, [lines, filter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Logs</h1>
        <p className="text-gray-600 mt-2">PHP error logs and DB/server diagnostics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>Database and server info</CardDescription>
        </CardHeader>
        <CardContent>
          {meta?.db && (
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>DB:</strong> {meta.db.database || '-'} ({meta.db.version || '-'})</div>
              <div><strong>Threads Connected:</strong> {meta.db.threads_connected ?? '-'}</div>
              <div><strong>Uptime:</strong> {meta.db.uptime ?? '-'}</div>
            </div>
          )}
          {meta?.server && (
            <div className="text-sm text-gray-700 space-y-1 mt-2">
              <div><strong>PHP:</strong> {meta.server.php}</div>
              <div><strong>Time:</strong> {meta.server.time}</div>
              <div><strong>Error log path:</strong> {meta.server.error_log_path || '-'}</div>
            </div>
          )}
          <div className="mt-3">
            <Button variant="outline" disabled={loading} onClick={load}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Log</CardTitle>
          <CardDescription>Latest 500 lines from the PHP error log</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input placeholder="Filter logs" value={filter} onChange={e => setFilter(e.target.value)} />
            <Button variant="outline" onClick={() => setFilter("")}>Clear</Button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <pre className="max-h-[60vh] overflow-auto text-xs bg-black text-green-200 p-3 rounded-md">
{shown.length ? shown.join("\n") : (loading ? 'Loading...' : 'No log entries found')}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
