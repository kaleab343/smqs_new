"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, Home, Users, Settings, Database, Shield, AlertCircle } from "lucide-react"

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try { await logout() } finally { router.push("/auth/login") }
  }

  const NavButton = ({ onClick, icon: Icon, children }: any) => (
    <Button variant="ghost" className="w-full justify-start gap-3 text-gray-700 hover:bg-rose-50" onClick={onClick}>
      <Icon className="w-5 h-5" />
      {children}
    </Button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SMQS</h1>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-80px)]">
        <aside className="w-64 bg-white border-r border-gray-200">
          <nav className="p-4 space-y-2">
            <NavButton onClick={() => router.push('/super-admin/dashboard')} icon={Home}>Dashboard</NavButton>
            <NavButton onClick={() => router.push('/super-admin/super-manager')} icon={Users}>System Users</NavButton>
            <NavButton onClick={() => router.push('/super-admin/create-admin')} icon={Settings}>Create Admin</NavButton>
            <NavButton onClick={() => router.push('/super-admin/maintenance')} icon={Database}>Maintenance</NavButton>
            <NavButton onClick={() => router.push('/super-admin/security')} icon={Shield}>Security</NavButton>
            <NavButton onClick={() => router.push('/super-admin/logs')} icon={AlertCircle}>System Logs</NavButton>
          </nav>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
