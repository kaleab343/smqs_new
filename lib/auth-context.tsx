"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "patient" | "doctor" | "admin" | "receptionist" | "super_admin"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (emailOrUsername: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: UserRole, phone?: string, usernameOverride?: string, specialization?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("smqs-user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse stored user:", e)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { getPhpApiBase } = await import('./php-api-config')
      const base = getPhpApiBase().replace(/\/$/, '')
      const isFront = /\/index\.php$/.test(base)
      const root = isFront ? base.replace(/\/index\.php$/, '') : base
      const pretty = `${base}/auth/login` // works both ways if base ends with index.php
      const front = isFront ? `${base}?r=/auth/login` : `${base}/index.php/auth/login`

      const formBody = new URLSearchParams({ username: email, email, password }) as any

      let resp: Response | null = null
      let lastErr: any = null

      const attempts = [
        // Prefer same-origin proxy to avoid CORS and Windows path encoding pitfalls
        { url: '/api/php/auth/login', opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
        // Then try direct PHP endpoints
        ...(isFront
          ? [
              { url: front,  opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,  opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, email, password }) } },
              { url: pretty, opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, email, password }) } },
            ]
          : [
              { url: pretty, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,  opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty, opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, email, password }) } },
              { url: front,  opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email, email, password }) } },
            ])
      ]

      let lastResp: Response | null = null
      for (const a of attempts) {
        try {
          resp = await fetch(a.url, a.opts as any)
          if (resp.ok) { lastResp = resp; break }
          else {
            lastResp = resp
            console.warn('Login HTTP not OK:', resp.status, a.url)
          }
        } catch (e) {
          lastErr = e
          console.warn('Login attempt failed:', a.url, e)
        }
      }
      if (!lastResp) {
        throw new Error('Failed to fetch (login): ' + (attempts[0]?.url || pretty))
      }

      const text = await lastResp.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch { data = { message: text } }
      if (!lastResp.ok) throw new Error(data?.error || data?.message || `Login failed (${lastResp.status})`)
      const mapped: User = {
        id: String(data.user_id ?? ''),
        email: (data.email || email),
        name: data.username || name || (email.split('@')[0]),
        role: (data.role || 'patient') as UserRole,
      }
      setUser(mapped)
      // store token alongside user for API calls
      const session = { ...mapped, token: data?.token, token_expires: data?.token_expires }
      localStorage.setItem('smqs-user', JSON.stringify(session))
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string, role: UserRole, phone?: string, usernameOverride?: string, specialization?: string) => {
    setIsLoading(true)
    try {
      const { getPhpApiBase } = await import('./php-api-config')
      const base = getPhpApiBase().replace(/\/$/, '')
      const isFront = /\/index\.php$/.test(base)
      const root = isFront ? base.replace(/\/index\.php$/, '') : base

      const payloadObj: any = { // signup payload
        specialization: specialization || undefined,
        username: usernameOverride || email,
        name,
        email,
        password,
        role: role,
        full_name: name,
        user_role: role,
        email_address: email,
        pass: password,
        user_name: usernameOverride || email,
        phone: phone || '-',
      }
      const formBody = new URLSearchParams(payloadObj) as any

      const pretty = `${base}/auth/register`
      const front = isFront ? `${base}?r=/auth/register` : `${base}/index.php/auth/register`
      const legacyFile = `${root}/auth_register.php`

      const attempts = (
        isFront
          ? [
              // Prefer same-origin proxy to avoid CORS and localhost differences
              { url: '/api/php/auth/register', opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: '/api/php/auth/register', opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
            ]
          : [
              { url: '/api/php/auth/register', opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: legacyFile, opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody } },
              { url: '/api/php/auth/register', opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: pretty,     opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
              { url: front,      opts: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadObj) } },
            ]
      )

      let lastResp: Response | null = null
      let lastErr: any = null
      for (const a of attempts) {
        try {
          const r = await fetch(a.url, a.opts as any)
          if (r.ok) { lastResp = r; break }
          else {
            lastResp = r
            console.warn('Signup HTTP not OK:', r.status, a.url)
          }
        } catch (e) {
          lastErr = e
          console.warn('Signup attempt failed:', a.url, e)
        }
      }
      if (!lastResp) {
        throw new Error('Failed to fetch (signup): ' + (attempts[0]?.url || pretty))
      }

      let text = await lastResp.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch { data = { message: text } }
      if (!lastResp.ok) {
        throw new Error(data?.error || data?.message || `Signup failed (${lastResp.status})`)
      }
      const mapped: User = {
        id: String(data.user_id ?? data.patient_id ?? Math.random()),
        email,
        name,
        role: (data.role || role) as UserRole,
      }
      setUser(mapped)
      const session = { ...mapped, token: data?.token, token_expires: data?.token_expires }
      localStorage.setItem('smqs-user', JSON.stringify(session))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem("smqs-user")
  }

  return <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
