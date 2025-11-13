"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Plus, Search, X, ChevronUp, ChevronDown } from "lucide-react"
import { getPhpApiBase } from "@/lib/php-api-config"
import { useAuth } from "@/lib/auth-context"

interface User {
  id: string
  name: string
  email: string
  role: "patient" | "doctor" | "receptionist" | "admin" | "super_admin"
  status: "active" | "inactive" | "suspended"
  joinDate: string
  specialization?: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const { user: currentUser } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", role: "patient" as const, specialization: "" })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<keyof User>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showPrivilegeOverlay, setShowPrivilegeOverlay] = useState(false)

  // Helper that tries both 127.0.0.1 and localhost bases
  const apiFetch = async (path: string, init?: RequestInit) => {
    // Use Next.js proxy
    const url = path.includes('/users/') || path === '/users' ? `/api/php${path}` : `/api/php${path}`
    return fetch(url, init)
  }

  // Normalize PHP responses that may return [[...]] or { data: [...] }
  const normalizeUserRows = (body: any): any[] => {
    if (!body) return []
    if (Array.isArray(body)) {
      if (Array.isArray(body[0])) return body[0]
      return body
    }
    if (Array.isArray(body?.data)) return body.data
    if (body && typeof body === 'object' && body.user_id != null) return [body]
    return []
  }

  const refetchUsers = async () => {
    try {
      const res = await apiFetch('/users', { cache: 'no-store' })
      if (!res.ok) { setUsers([]); return }
      const body = await res.json().catch(() => null)
      const arr: any[] = normalizeUserRows(body)
      const mapped: User[] = arr
        .filter((r: any) => r && r.user_id != null)
        .map((r: any) => ({
          id: String(r.user_id ?? ''),
          name: String((r.username ?? r.name ?? '') || ''),
          email: String((r.email ?? '') || ''),
          role: String((r.role ?? '') || ''),
          specialization: r.specialization ?? null,
          status: 'active',
          joinDate: r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
        }))
      setUsers(mapped)
    } catch (e) {
      console.error('refetch users error', e)
      setUsers([])
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/users', { cache: 'no-store' })
        if (!res.ok) {
          console.error('Failed to load users', res.status)
          setUsers([])
          return
        }
        const body = await res.json().catch(() => null)
        const arr: any[] = normalizeUserRows(body)
        const mapped: User[] = arr
          .filter((r: any) => r && r.user_id != null)
          .map((r: any) => ({
            id: String(r.user_id ?? ''),
            name: String((r.username ?? r.name ?? '') || ''),
            email: String((r.email ?? '') || ''),
            role: String((r.role ?? '') || ''),
            specialization: r.specialization ?? null,
            status: "active",
            joinDate: r.created_at ? new Date(r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "",
          }))
        setUsers(mapped)
      } catch (e) {
        console.error('Load users error', e)
        setUsers([])
      }
    }
    load()
  }, [])

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortDirection === "asc" ? comparison : -comparison
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-orange-100 text-orange-800"
      case "admin":
        return "bg-red-100 text-red-800"
      case "doctor":
        return "bg-blue-100 text-blue-800"
      case "receptionist":
        return "bg-purple-100 text-purple-800"
      case "patient":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-700"
      case "inactive":
        return "text-gray-700"
      case "suspended":
        return "text-red-700"
      default:
        return "text-gray-700"
    }
  }

  const handleSort = (column: keyof User) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ column }: { column: keyof User }) => {
    if (sortColumn !== column) return <div className="w-4 h-4" />
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const canManageTarget = (targetRole: string) => {
    if (!currentUser) return false
    if (currentUser.role === 'super_admin') return true
    if (currentUser.role === 'admin' && (targetRole === 'admin' || targetRole === 'super_admin')) return false
    return true
  }

  const canCreateRole = (targetRole: string) => {
    if (!currentUser) return false
    if (currentUser.role === 'super_admin') return true
    if (currentUser.role === 'admin' && (targetRole === 'admin' || targetRole === 'super_admin')) return false
    return true
  }

  const handleDelete = (id: string) => {
    const target = users.find(u => u.id === id)
    if (target && !canManageTarget(target.role)) {
      setShowPrivilegeOverlay(true)
      return
    }
    setDeleteUserId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteUserId) return
    try {
      // Use a single, permissive proxy route to avoid local Apache/verb issues
      const res = await fetch(`/api/php/users/delete?id=${encodeURIComponent(deleteUserId)}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
      await refetchUsers()
    } catch (e) {
      console.error('Delete failed', e)
      alert('Failed to delete user')
    } finally {
      setShowDeleteConfirm(false)
      setDeleteUserId(null)
    }
  }

  const handleAddUser = () => {
    setFormData({ name: "", email: "", role: "patient" })
    setEditingUser(null)
    setShowAddModal(true)
  }

  const handleEdit = (id: string) => {
    const user = users.find((u) => u.id === id)
    if (!user) return
    if (!canManageTarget(user.role)) {
      setShowPrivilegeOverlay(true)
      return
    }
    setFormData({ name: user.name, email: user.email, role: user.role, specialization: user.specialization || "" })
    setEditingUser(user)
    setShowEditModal(true)
  }

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      alert("Please fill in all fields")
      return
    }
    if (formData.role === 'doctor' && !formData.specialization) {
      alert('Please select a specialization for Doctor')
      return
    }

    if (!canCreateRole(formData.role)) {
      alert('You are not allowed to assign Admin or Super Admin role')
      return
    }

    try {
      const base = getPhpApiBase()
      if (editingUser) {
      let res: Response
        res = await apiFetch(`/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.name,
            email: formData.email,
            role: formData.role,
            specialization: formData.role === 'doctor' ? (formData.specialization || '') : null,
          }),
        })
        if (!res.ok) {
          res = await apiFetch(`/users/${editingUser.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.name, email: formData.email, role: formData.role }),
          })
        }
        // Use the most permissive route first to avoid local Apache/verb issues
        res = await fetch(`/api/php/users/update?id=${encodeURIComponent(editingUser.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.name,
            email: formData.email,
            role: formData.role,
            specialization: formData.role === 'doctor' ? (formData.specialization || '') : null,
          }),
        })
        if (!res.ok) {
          // Fallbacks
          res = await apiFetch(`/users/${editingUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: formData.name,
              email: formData.email,
              role: formData.role,
              specialization: formData.role === 'doctor' ? (formData.specialization || '') : null,
            }),
          })
        }
        if (!res.ok) {
          res = await apiFetch(`/users/${editingUser.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: formData.name, email: formData.email, role: formData.role }),
          })
        }
        if (!res.ok) throw new Error(`Failed to update: ${res.status}`)
        await refetchUsers()
        setShowEditModal(false)
      } else {
        // Creating users from Admin panel isn't defined in API yet; keep client-add for now
        const newUser: User = {
          id: String(users.length + 1),
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: "active",
          joinDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        }
        setUsers((prev) => [...prev, newUser])
        setShowAddModal(false)
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save user')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and permissions</p>
        </div>
        <Button onClick={handleAddUser} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>{filteredUsers.length} total users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Name
                      <SortIcon column="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("email")}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Email
                      <SortIcon column="email" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("role")}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Role
                      <SortIcon column="role" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Status
                      <SortIcon column="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("joinDate")}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Join Date
                      <SortIcon column="joinDate" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{user.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role === "super_admin"
                          ? "Super Admin"
                          : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                        className={getStatusColor(user.status)}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 text-sm">{user.joinDate}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user.id)}
                          className="text-blue-600 hover:bg-blue-50"
                          disabled={!canManageTarget(user.role)}
                          title={!canManageTarget(user.role) ? 'Not allowed to edit this user' : ''}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:bg-red-50"
                          disabled={!canManageTarget(user.role)}
                          title={!canManageTarget(user.role) ? 'Not allowed to delete this user' : ''}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Stats - Grid responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {users.filter((u) => u.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">
              {users.filter((u) => u.role === "doctor").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {users.filter((u) => u.role === "patient").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/10 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Add New User</CardTitle>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="User name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="admin" disabled={!canCreateRole('admin')} title={!canCreateRole('admin') ? 'Admins cannot create Admin users' : ''}>Administrator</option>
                  <option value="super_admin" disabled={!canCreateRole('super_admin')} title={!canCreateRole('super_admin') ? 'Admins cannot create Super Admin users' : ''}>Super Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveUser} className="bg-red-600 hover:bg-red-700">
                  Add User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="User name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                <Button onClick={handleSaveUser} className="bg-red-600 hover:bg-red-700">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPrivilegeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Super Privilege Required</CardTitle>
              <CardDescription>Only Super Admins can perform this action.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end">
                <Button onClick={() => setShowPrivilegeOverlay(false)} autoFocus className="bg-red-600 hover:bg-red-700">OK</Button>
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
                <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
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
