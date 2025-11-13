"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Clock, LogOut, Home, Calendar } from "lucide-react"

export default function PatientLayout({
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

  if (user?.role !== "patient") {
    return <div className="p-4">Access denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SMQS</h1>
              <p className="text-xs text-gray-500">Smart Medical Queue</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
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
              className="w-full justify-start gap-3 text-gray-700 hover:bg-blue-50"
              onClick={() => router.push("/patient/dashboard")}
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-blue-50"
              onClick={() => router.push("/patient/queue")}
            >
              <Clock className="w-5 h-5" />
              Queue Status
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-blue-50"
              onClick={() => router.push("/patient/appointments")}
            >
              <Calendar className="w-5 h-5" />
              Appointments
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
