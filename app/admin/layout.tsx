"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, Home, Users, Settings, BarChart3 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/auth/login")
  }

  if (user?.role !== "admin") {
    return <div className="p-4">Access denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SMQS</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200">
          <nav className="p-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-red-50"
              onClick={() => router.push("/admin/dashboard")}
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-red-50"
              onClick={() => router.push("/admin/users")}
            >
              <Users className="w-5 h-5" />
              Users
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-red-50"
              onClick={() => router.push("/admin/analytics")}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-red-50"
              onClick={() => router.push("/admin/settings")}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
