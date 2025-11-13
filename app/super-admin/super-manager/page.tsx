"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  createdAtTs: number
  recentLogin: string
  recentLoginTs: number
}

// Parse common MySQL datetime formats like "YYYY-MM-DD HH:mm:ss"
function parseMysqlDateTime(input: any): Date | null {
  if (!input) return null
  if (typeof input === 'string') {
    const s = input.trim()
    if (!s || s === '0000-00-00 00:00:00') return null
    // Try ISO by replacing space with 'T'
    const iso = s.replace(' ', 'T')
    const d1 = new Date(iso)
    if (!isNaN(d1.getTime())) return d1
    // Manual parse
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      const [_, Y, M, D, h, mnt, sc] = m
      const d2 = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(mnt), sc ? Number(sc) : 0)
      if (!isNaN(d2.getTime())) return d2
    }
    return null
  }
  if (typeof input === 'number') {
    // Assume seconds or milliseconds
    const ms = input < 1e12 ? input * 1000 : input
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  return null
}

export default function SuperManagerPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Helper that tries to normalize various backend response shapes
  const normalizeRows = (body: any): any[] => {
    if (!body) return []
    if (Array.isArray(body)) {
      if (Array.isArray(body[0])) return body[0]
      return body
    }
    if (Array.isArray(body?.data)) return body.data
    if (body && typeof body === 'object' && body.user_id != null) return [body]
    return []
  }

  useEffect(() => {
    let cancelled = false
    const fetchUsers = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/php/users', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`)
        const body = await res.json().catch(() => null)
        const arr = normalizeRows(body)
        const mapped: UserRow[] = arr
          .filter((r: any) => r && r.user_id != null)
          .map((r: any) => {
            const created = parseMysqlDateTime(r.created_at)
            const updated = parseMysqlDateTime(r.updated_at)
            return {
              id: String(r.user_id ?? ''),
              name: String((r.username ?? r.name ?? '') || ''),
              email: String(r.email ?? ''),
              role: String(r.role ?? ''),
              createdAt: created ? created.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
              createdAtTs: created ? created.getTime() : 0,
              recentLogin: updated ? updated.toLocaleString() : '',
              recentLoginTs: updated ? updated.getTime() : 0,
            }
          })
        if (!cancelled) setUsers(mapped)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [users, searchTerm])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => (b.recentLoginTs || 0) - (a.recentLoginTs || 0))
    return arr
  }, [filtered])

  const roleBadgeClass = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-orange-100 text-orange-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'doctor': return 'bg-blue-100 text-blue-800'
      case 'receptionist': return 'bg-purple-100 text-purple-800'
      case 'patient': return 'bg-green-100 text-green-800'
      case 'staff': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Manager</h1>
        <p className="text-gray-600 mt-2">Manage all users and administrators</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{loading ? 'Loading...' : error ? <span className="text-red-600">{error}</span> : `${sorted.length} users`}</CardDescription>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Account Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Recent Login</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length > 0 ? (
                  sorted.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                      <td className="py-3 px-4 text-gray-700">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge className={roleBadgeClass(u.role)}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{u.createdAt}</td>
                      <td className="py-3 px-4 text-gray-700">{u.recentLogin || 'Never'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No users found'}
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
