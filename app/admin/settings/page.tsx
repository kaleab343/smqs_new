"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Save, Bell, Lock, Database, X } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    hospitalName: "",
    email: "",
    phone: "",
    maxQueueSize: "100",
    appointmentDuration: "30",
    notificationsEnabled: true,
  })

  const [saved, setSaved] = useState(false)

  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showClearLogsModal, setShowClearLogsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/php/admin/hospital-info`, { cache: 'no-store' })
        if (res.ok) {
          const row = await res.json()
          setSettings((prev) => ({
            ...prev,
            hospitalName: row.Hospital_Name || "",
            email: row.Email || "",
            phone: row.Phone || "",
          }))
        }
      } catch (e) {
        console.error('Failed to load hospital info', e)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/php/admin/hospital-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Hospital_Name: settings.hospitalName, Email: settings.email, Phone: settings.phone }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Failed to save hospital info', e)
    }
  }

  const handleBackupDatabase = async () => {
    try {
      const res = await fetch('/api/php/admin/backup', { method: 'GET' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename\s*=\s*"?([^";]+)"?/i)
      const filename = match ? match[1] : `backup_${Date.now()}.sql`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Backup failed', e)
    }
  }

  const handleConfirmBackup = async () => {
    try {
      const res = await fetch('/api/php/admin/backup', { method: 'GET' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const match = cd.match(/filename\s*=\s*"?([^";]+)"?/i)
      const filename = match ? match[1] : `backup_${Date.now()}.sql`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Backup failed', e)
    } finally {
      setShowBackupModal(false)
    }
  }

  const handleClearLogs = () => {
    setShowClearLogsModal(true)
  }

  const handleConfirmClearLogs = () => {
    console.log("[v0] Logs cleared")
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setShowClearLogsModal(false)
  }

  const handleChangePassword = () => {
    setShowPasswordModal(true)
    setPasswordError("")
  }

  const handleConfirmPasswordChange = async () => {
    // Basic client-side validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }
    try {
      // Get the currently logged-in admin from localStorage
      const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('smqs-user') || '{}') : {}
      const id = stored?.user_id || stored?.id
      if (!id) {
        setPasswordError("Not authenticated. Please log in again.")
        return
      }

      // Update own password via our Next.js proxy to PHP backend
      const res = await fetch(`/api/php/users/update?id=${encodeURIComponent(String(id))}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      if (!res.ok) {
        const text = await res.text()
        setPasswordError(`Failed to change password: ${text || res.status}`)
        return
      }

      // Success UI feedback
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setShowPasswordModal(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordError("")
    } catch (e: any) {
      setPasswordError(e?.message || 'Unexpected error while changing password')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and preferences</p>
      </div>

      {/* Hospital Information */}
      <Card>
        <CardHeader>
          <CardTitle>Hospital Information</CardTitle>
          <CardDescription>Update your hospital details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
              <Input value={settings.hospitalName} onChange={(e) => handleChange("hospitalName", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={settings.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input value={settings.phone} onChange={(e) => handleChange("phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <CardDescription>Database maintenance and backup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none bg-transparent" onClick={handleBackupDatabase}>
              <Database className="w-4 h-4 mr-2" />
              Backup Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Security settings and access control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full bg-transparent" onClick={handleChangePassword}>
            <Lock className="w-4 h-4 mr-2" />
            Change Admin Password
          </Button>
        </CardContent>
      </Card>

      {/* Save Button and Status */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>{saved && <Badge className="bg-green-100 text-green-800">✓ Settings saved successfully</Badge>}</div>
        <Button onClick={handleSave} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>

      {/* Backup modal disabled for automatic download */}
{false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Backup Database</CardTitle>
              <button onClick={() => setShowBackupModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                This will create a complete backup of your database. This may take a few minutes depending on the
                database size.
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Backup Details:</p>
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  <p>Size: 2.5 GB</p>
                  <p>Estimated Time: 2-3 minutes</p>
                  <p>Type: Full Backup</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowBackupModal(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button onClick={handleConfirmBackup} className="bg-red-600 hover:bg-red-700">
                  <Database className="w-4 h-4 mr-2" />
                  Create & Download Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showClearLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Clear Logs</CardTitle>
              <button onClick={() => setShowClearLogsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">This will delete all system logs. This action cannot be undone.</p>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Warning: Clearing logs will remove all historical data about system activities, errors, and user
                  actions.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowClearLogsModal(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button onClick={handleConfirmClearLogs} className="bg-red-600 hover:bg-red-700">
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Change Admin Password</CardTitle>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {passwordError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowPasswordModal(false)} className="bg-transparent">
                  Cancel
                </Button>
                <Button onClick={handleConfirmPasswordChange} className="bg-red-600 hover:bg-red-700">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
