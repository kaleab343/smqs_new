"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, EyeOff, Database, Trash2, Download } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security</h1>
        <p className="text-gray-600 mt-2">Manage security settings</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Database Maintenance</CardTitle>
          <CardDescription>Backup or erase the database</CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceActions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage users and update passwords</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable />
        </CardContent>
      </Card>
    </div>
  )
}

function MaintenanceActions() {
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  async function backup() {
    setBusy(true); setMsg(null)
    try {
      window.open('/api/php/admin/backup', '_blank')
      setMsg('Backup started. If blocked by popup, allow it and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function erase() {
    if (!confirm('Are you sure you want to ERASE all database data? This cannot be undone.')) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/php/admin/erase', { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to erase: ${res.status}`)
      const data = await res.json()
      setMsg(data?.erased ? 'Database erased successfully.' : 'Erase completed.')
    } catch (e:any) {
      setMsg(e?.message || 'Failed to erase database')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={busy} onClick={backup}>
        <Download className="w-4 h-4 mr-2" /> Backup database
      </Button>
      <Button variant="destructive" disabled={busy} onClick={erase}>
        <Trash2 className="w-4 h-4 mr-2" /> Erase database
      </Button>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}
    </div>
  )
}

function UsersTable() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Array<any>>([])
  const [pw, setPw] = React.useState<Record<number, string>>({})
  const [showPw, setShowPw] = React.useState<Record<number, boolean>>({})

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/php/users', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Invalid response')
      setRows(data)
    } catch (e:any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  async function updatePassword(user_id: number) {
    const newPw = pw[user_id]
    if (!newPw || newPw.trim() === '') { alert('Enter a new password'); return }
    try {
      setLoading(true)
      const res = await fetch(`/api/php/users/update?id=${user_id}` , {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: newPw })
      })
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`)
      setPw(prev => ({ ...prev, [user_id]: '' }))
      // reload to reflect updated_at
      await load()
      alert('Password updated')
    } catch (e:any) {
      alert(e?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Current Password</TableHead>
              <TableHead>New Password</TableHead>
              <TableHead className="w-[140px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r:any) => (
              <TableRow key={r.user_id}>
                <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell className="text-xs text-gray-500">{r.created_at}</TableCell>
                <TableCell className="text-xs text-gray-500">{r.updated_at || '-'}</TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span>{showPw[r.user_id] ? (r.password || '-') : ((r.password && '•'.repeat(Math.min(String(r.password).length, 12))) || '-')}</span>
                    {r.password && (
                      <button className="p-1 rounded hover:bg-gray-100" onClick={() => setShowPw(prev => ({ ...prev, [r.user_id]: !prev[r.user_id] }))} title={showPw[r.user_id] ? 'Hide' : 'Show'}>
                        {showPw[r.user_id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Input type="password" value={pw[r.user_id] ?? ''} placeholder="Enter new password" onChange={e => setPw(prev => ({ ...prev, [r.user_id]: e.target.value }))} />
                </TableCell>
                <TableCell>
                  <Button size="sm" disabled={loading} onClick={() => updatePassword(r.user_id)}>Update</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
