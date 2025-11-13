"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect, useMemo } from "react"
import { getPhpApiBase } from "@/lib/php-api-config"
import { useAuth } from "@/lib/auth-context"
import { Search, Edit2, Trash2, X } from "lucide-react"

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

function parseMysqlDateTime(input: any): Date | null {
  if (!input) return null
  if (typeof input === 'string') {
    const s = input.trim()
    if (!s || s === '0000-00-00 00:00:00') return null
    const iso = s.replace(' ', 'T')
    const d1 = new Date(iso)
    if (!isNaN(d1.getTime())) return d1
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (m) {
      const [_, Y, M, D, h, mnt, sc] = m
      const d2 = new Date(Number(Y), Number(M) - 1, Number(D), Number(h), Number(mnt), sc ? Number(sc) : 0)
      if (!isNaN(d2.getTime())) return d2
    }
    return null
  }
  if (typeof input === 'number') {
    const ms = input < 1e12 ? input * 1000 : input
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  return null
}

export default function CreateAdminPage() {
  const { user } = useAuth()

 const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" as 'admin' | 'super_admin' })
 const [users, setUsers] = useState<UserRow[]>([])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [searchTerm, setSearchTerm] = useState("")
 const [showEditModal, setShowEditModal] = useState(false)
 const [editingUser, setEditingUser] = useState<UserRow | null>(null)
 const [formData, setFormData] = useState({ name: "", email: "", role: "patient" as string, specialization: "" })
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
 const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

 const apiFetch = async (path: string, init?: RequestInit) => {
   return fetch(`/api/php${path}`, init)
 }

 const refetchUsers = async () => {
   try {
     const res = await apiFetch('/users', { cache: 'no-store' })
     if (!res.ok) { setUsers([]); return }
     const body = await res.json().catch(() => null)
     const arr: any[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [])
     const mapped: UserRow[] = arr.filter((r: any) => r && r.user_id != null).map((r: any) => {
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
     setUsers(mapped)
   } catch (e) {
     setUsers([])
   }
 }

 const handleEdit = (id: string) => {
   const u = users.find(x => x.id === id)
   if (!u) return
   setFormData({ name: u.name, email: u.email, role: u.role, specialization: "" })
   setEditingUser(u)
   setShowEditModal(true)
 }

 const handleDelete = (id: string) => {
   setDeleteUserId(id)
   setShowDeleteConfirm(true)
 }

 const confirmDelete = async () => {
   if (!deleteUserId) return
   try {
     const res = await fetch(`/api/php/users/delete?id=${encodeURIComponent(deleteUserId)}`, { method: 'POST' })
     if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
     await refetchUsers()
   } catch (e) {
     alert('Failed to delete user')
   } finally {
     setShowDeleteConfirm(false)
     setDeleteUserId(null)
   }
 }

 const handleSaveUser = async () => {
   if (!formData.name || !formData.email) {
     alert('Please fill in all fields')
     return
   }
   try {
     if (!editingUser) return
     const res = await fetch(`/api/php/users/update?id=${encodeURIComponent(editingUser.id)}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         username: formData.name,
         email: formData.email,
         role: formData.role,
         specialization: formData.role === 'doctor' ? (formData.specialization || '') : null,
       }),
     })
     if (!res.ok) throw new Error(`Failed to update: ${res.status}`)
     await refetchUsers()
     setShowEditModal(false)
     setEditingUser(null)
   } catch (e) {
     alert('Failed to save user')
   }
 }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/php/users', { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`)
        const body = await res.json().catch(() => null)
        const arr = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [])
        const mapped: UserRow[] = arr.filter((r: any) => r && r.user_id != null).map((r: any) => {
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
    run()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.email || !form.password) {
      alert('Please fill in name, email and password')
      return
    }

    if (user?.role === 'admin' && form.role !== 'admin') {
      alert('Admins cannot create Super Admin users')
      return
    }

    try {
      const base = getPhpApiBase().replace(/\/$/, '')
      const isFront = /\/index\.php$/.test(base)
      const root = isFront ? base.replace(/\/index\.php$/, '') : base

      const payloadObj: any = {
        username: form.email,
        user_name: form.email,
        name: form.name,
        full_name: form.name,
        email: form.email,
        email_address: form.email,
        password: form.password,
        pass: form.password,
        role: form.role,
        user_role: form.role,
        phone: '-',
      }
      const formBody = new URLSearchParams(payloadObj) as any

      const pretty = `${base}/auth/register`
      const front = isFront ? `${base}?r=/auth/register` : `${base}/index.php/auth/register`
      const legacyFile = `${root}/auth_register.php`

      const attempts = (
        isFront
          ? [
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
            ]
          : [
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
            ]
      )

      let lastResp: Response | null = null
      for (const a of attempts) {
        try {
          const r = await fetch(a.url, a.opts as any)
          if (r.ok) { lastResp = r; break }
        } catch (e) {
          // continue to next attempt
        }
      }
      if (!lastResp) {
        throw new Error('Failed to fetch (register)')
      }

      const text = await lastResp.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch { data = { message: text } }
      if (!lastResp.ok) throw new Error(data?.error || data?.message || `Register failed (${lastResp.status})`)

      alert(`${form.role === 'super_admin' ? 'Super Admin' : 'Admin'} created (user_id=${data?.user_id ?? ''})`)
      setForm({ name: '', email: '', password: '', role: 'admin' })
    } catch (e: any) {
      alert(`Create failed: ${e?.message || e}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Admin & Super Admin</h1>
        <p className="text-gray-600 mt-2">Create privileged accounts securely</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Privileged User</CardTitle>
          <CardDescription>Fill the form below to create an Admin or Super Admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="admin">Administrator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700">Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-8">
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length > 0 ? (
                  sorted.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                      <td className="py-3 px-4 text-gray-700">{u.email}</td>
                      <td className="py-3 px-4">
                        <Badge className={
                          u.role === 'super_admin' ? 'bg-orange-100 text-orange-800' :
                          u.role === 'admin' ? 'bg-red-100 text-red-800' :
                          u.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                          u.role === 'receptionist' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'patient' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{u.createdAt}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(u.id)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(u.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
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
      {showEditModal && editingUser && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Edit User</CardTitle>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="User name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin">Administrator</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formData.role === 'doctor' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select specialization</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} className="bg-rose-600 hover:bg-rose-700">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</p>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
