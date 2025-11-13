"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { Settings, Users, Database, Shield, AlertCircle } from "lucide-react"

import { useRouter } from "next/navigation"

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      router.push("/auth/login")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">System-wide oversight and management</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome back, {user?.name}</CardTitle>
          <CardDescription>Full system access and control</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            As a Super Admin, you have complete access to manage global settings, perform system maintenance, and
            oversee all operations across the hospital queue management system.
          </p>
        </CardContent>
      </Card>

      {/* Management Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/super-admin/super-manager')} role="button" aria-label="System Users">
          <CardHeader>
            <Users className="w-8 h-8 text-blue-600 mb-2" />
            <CardTitle className="text-lg">System Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Manage all users and administrators</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" onClick={() => router.push('/super-admin/super-manager')}>
              Manage
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/super-admin/create-admin')} role="button" aria-label="Create Admin & Super Admin">
          <CardHeader>
            <Settings className="w-8 h-8 text-purple-600 mb-2" />
            <CardTitle className="text-lg">Create Admin & Super Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Create privileged accounts</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/super-admin/create-admin') }}>
              Open
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/super-admin/maintenance')} role="button" aria-label="Maintenance">
          <CardHeader>
            <Database className="w-8 h-8 text-green-600 mb-2" />
            <CardTitle className="text-lg">Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Perform system maintenance</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/super-admin/maintenance') }}>
              Open
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/super-admin/security')} role="button" aria-label="Security">
          <CardHeader>
            <Shield className="w-8 h-8 text-orange-600 mb-2" />
            <CardTitle className="text-lg">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Manage security settings</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/super-admin/security') }}>
              Open
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/super-admin/logs')} role="button" aria-label="System Logs">
          <CardHeader>
            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
            <CardTitle className="text-lg">System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">View system activity logs</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/super-admin/logs') }}>
              Open
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">System Uptime</span>
              <span className="text-sm text-green-600 font-semibold">99.9%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Users</span>
              <span className="text-sm text-blue-600 font-semibold">127</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database Status</span>
              <span className="text-sm text-green-600 font-semibold">Optimal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
