"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Database } from "lucide-react"

export default function MaintenancePage() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [activities, setActivities] = React.useState<Array<{id:string,type:string,description:string,user:string,time:string,status:string}>>([])

  const [offset, setOffset] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(true)

  React.useEffect(() => {
    let active = true
    async function load(reset = false) {
      if (reset) { setActivities([]); setOffset(0); setHasMore(true) }
      setLoading(true); setError(null)
      try {
        const params = new URLSearchParams({ limit: '50', offset: String(reset ? 0 : offset) })
        const res = await fetch(`/api/php/admin/activities?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          data.sort((a:any,b:any)=> String(b.time).localeCompare(String(a.time)))
          if (active) {
            setActivities(prev => reset ? data : [...prev, ...data])
            setHasMore(data.length === 50)
            setOffset(prev => reset ? 50 : prev + 50)
          }
        } else {
          if (active) setError('Invalid response from server')
        }
      } catch (e:any) {
        if (active) setError(e?.message || 'Failed to load activities')
      } finally {
        if (active) setLoading(false)
      }
    }
    load(true)
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <p className="text-gray-600 mt-2">Perform system maintenance</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Database Activity</CardTitle>
          <CardDescription>Recent system activity sorted by time (newest first)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> Loading activity...</div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && activities.length === 0 && (
            <div className="text-sm text-gray-600">No recent activity found.</div>
          )}
          <div className="mt-2 space-y-3">
            {activities.map((ev) => (
              <div key={ev.id + ':' + ev.time} className="flex items-start justify-between gap-4 border rounded-md p-3 bg-white">
                <div className="space-y-1">
                  <div className="text-sm font-medium">{ev.description}</div>
                  <div className="text-xs text-gray-500">{ev.user}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={ev.status === 'success' ? 'default' : 'secondary'}>{ev.type}</Badge>
                  <div className="text-xs text-gray-500 tabular-nums">{new Date(ev.time).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" disabled={loading} onClick={async () => {
                setError(null); setLoading(true)
                try {
                  const params = new URLSearchParams({ limit: '50', offset: String(offset) })
                  const res = await fetch(`/api/php/admin/activities?${params.toString()}`, { cache: 'no-store' })
                  if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
                  const data = await res.json()
                  if (!Array.isArray(data)) throw new Error('Invalid response')
                  data.sort((a:any,b:any)=> String(b.time).localeCompare(String(a.time)))
                  setActivities(prev => [...prev, ...data])
                  setHasMore(data.length === 50)
                  setOffset(prev => prev + 50)
                } catch (e:any) {
                  setError(e?.message || 'Failed to load activities')
                } finally {
                  setLoading(false)
                }
              }}>Load more</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
