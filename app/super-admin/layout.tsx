"use client"

import { redirect } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type React from "react"

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (user?.role !== "super_admin") {
    redirect("/auth/login")
  }

  return <>{children}</>
}
