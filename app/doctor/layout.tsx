"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut, Home, Users } from "lucide-react"

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const router = useRouter()

  // Cookie helpers
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
    return m ? decodeURIComponent(m[1]) : null
  }
  const setCookie = (name: string, value: string, days = 30) => {
    if (typeof document === 'undefined') return
    const maxAge = days * 24 * 60 * 60
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`
  }

  // Doctor availability state
  const [isActive, setIsActive] = useState<boolean>(false)
  // Track when we've loaded initial server state and only send updates on explicit toggle
  const [loaded, setLoaded] = useState(false)
  const prevIsActiveRef = useRef<boolean | null>(null)

  // On mount, fetch the doctor's current status from the server (source of truth)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (!user?.email) return
        // Fetch from server (source of truth)
        const r = await fetch('/api/php/doctors', { cache: 'no-store' }) // Next.js proxy with no-store headers
        const doctors = r.ok ? await r.json() : []
        const email = String(user.email).toLowerCase()
        const found = (doctors || []).find((d: any) => String(d.email || '').toLowerCase() === email)
        const raw = String(found?.status || '').toUpperCase()
        const active = raw === 'ACTIVE'
        if (!cancelled) {
          setIsActive(active)
          // Initialize previous value without sending to backend
          prevIsActiveRef.current = active
          setCookie('smqs-doctor-active', active ? '1' : '0')
          setLoaded(true)
        }
      } catch (e) {
        // If server fetch fails, fall back to cookie; if cookie missing, default to INACTIVE
        if (!cancelled) {
          const cookieVal = getCookie('smqs-doctor-active')
          const active = cookieVal === '1' ? true : false
          setIsActive(active)
          prevIsActiveRef.current = active
          setLoaded(true)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.email])

  // Do not persist to localStorage; always fetch from DB on mount

  useEffect(() => {
    // Only send update when isActive actually changes after initial server load
    if (!loaded) return
    if (prevIsActiveRef.current === null) {
      prevIsActiveRef.current = isActive
      return
    }
    if (prevIsActiveRef.current === isActive) return

    const run = async () => {
      try {
        const email = user?.email || ''
        if (!email) return
        const status = isActive ? 'ACTIVE' : 'ON_BREAK'
        await fetch('/api/php/doctors/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, status }),
        })
        // sync cookie after a successful toggle
        setCookie('smqs-doctor-active', isActive ? '1' : '0')
      } catch (e) {
        // non-fatal
        console.error('doctor status update failed', e)
      } finally {
        prevIsActiveRef.current = isActive
      }
    }
    run()
  }, [isActive, loaded, user?.email])

  const handleLogout = async () => {
    await logout()
    router.push("/auth/login")
  }

  if (user?.role !== "doctor") {
    return <div className="p-4">Access denied</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SMQS</h1>
              <p className="text-xs text-gray-500">Doctor Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Dr. {user?.name}</span>
            <Button
              variant={isActive ? "outline" : "outline"}
              size="sm"
              onClick={() => setIsActive((v) => !v)}
              className={`${isActive ? 'border-green-600 text-green-700 hover:bg-green-50' : 'border-orange-600 text-orange-700 hover:bg-orange-50'} flex items-center gap-2`}
              title={isActive ? 'Click to set On Break' : 'Click to set ACTIVE'}
            >
              {isActive ? 'ACTIVE' : 'On Break'}
            </Button>
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
              className="w-full justify-start gap-3 text-gray-700 hover:bg-emerald-50"
              onClick={() => router.push("/doctor/dashboard")}
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-700 hover:bg-emerald-50"
              onClick={() => router.push("/doctor/queue")}
            >
              <Users className="w-5 h-5" />
              Manage Queue
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
