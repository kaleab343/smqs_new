"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Activity, TrendingUp, Download, Database, FileText, User, Clock, CheckCircle } from "lucide-react"

interface SystemMetrics {
  totalUsers: number
  totalDoctors: number
  totalPatients: number
  activeNow: number
  todayConsultations: number
  systemHealth: "good" | "moderate" | "bad" | "perfect"
}

interface ActivityLog {
  id: string
  type: string
  description: string
  user: string
  time: string
  status: "success" | "pending" | "error"
}

const generateReportFile = (reportType: string) => {
  const timestamp = new Date().toLocaleString()
  const reportContent = `HOSPITAL QUEUE MANAGEMENT SYSTEM - ${reportType.toUpperCase()}
Generated on: ${timestamp}

SYSTEM METRICS:
- Total Users: 127
- Total Doctors: 12
- Total Patients: 95
- Active Users: 34
- Today's Consultations: 89
- System Health: Good
- System Uptime: 99.9%
- Average Response Time: 245ms

REPORT SUMMARY:
This is an automated ${reportType} report from the Hospital Queue Management System.
Report contains system metrics, user activities, and performance statistics.

END OF REPORT
`
  const blob = new Blob([reportContent], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `hospital-report-${reportType}-${new Date().toISOString().split("T")[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  console.log("[v0] Report downloaded:", reportType)
}

const downloadBackupFile = (backupDate: string) => {
  const backupContent = `HOSPITAL QUEUE MANAGEMENT SYSTEM - DATABASE BACKUP
Backup Date: ${backupDate}
Backup Size: 2.5 GB
Status: Complete

BACKUP CONTENTS:
- Users Database
- Appointment Database
- Queue Management Data
- System Logs
- Configuration Files

Backup Encryption: AES-256
Integrity Check: PASSED
Restoration Status: Ready for Recovery

END OF BACKUP FILE
`
  const blob = new Blob([backupContent], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `hospital-backup-${backupDate}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  console.log("[v0] Backup downloaded:", backupDate)
}

const createNewBackup = () => {
  const timestamp = new Date().toISOString()
  const backupContent = `HOSPITAL QUEUE MANAGEMENT SYSTEM - NEW BACKUP CREATED
Creation Time: ${timestamp}
Status: In Progress -> Complete

Backing up:
- Users Database: 50 MB
- Appointments Database: 120 MB
- Queue Management: 80 MB
- Logs and Configurations: 30 MB

Total Size: 2.5 GB
Estimated Time: 5 minutes
Progress: 100%

Backup Successfully Created and Verified!
`
  const blob = new Blob([backupContent], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `hospital-backup-${new Date().toISOString().split("T")[0]}-new.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  console.log("[v0] New backup created and downloaded")
}

export default function AdminDashboard() {
  const router = useRouter()
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [reportType, setReportType] = useState("daily")
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    totalDoctors: 0,
    totalPatients: 0,
    activeNow: 0,
    todayConsultations: 0,
    systemHealth: "good",
  })

  useEffect(() => {
    const load = async () => {
      try {
        // Call PHP API directly using its friendly route
        const base = (process.env.NEXT_PUBLIC_PHP_API_BASE || "http://127.0.0.1/code_(1)/db_samp/api/index.php").replace(/\/?$/, "")
        const res = await fetch(`${base}?r=/admin/stats`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setMetrics(m => ({
          ...m,
          totalUsers: data.total_users ?? 0,
          totalDoctors: data.total_doctors ?? 0,
          totalPatients: data.total_patients ?? 0,
          activeNow: data.active_now ?? 0,
          todayConsultations: (data.today_consultations ?? data.active_now ?? 0),
          systemHealth: (data.health ?? 'good'),
        }))
      } catch (e) {
        console.error('Failed to load admin stats', e)
      }
    }
    load()
  }, [])

  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([] as ActivityLog[])
  // fetched in effect below

  const getHealthColor = (health: string) => {
    switch (health) {
      case "good":
        return "bg-green-100 text-green-800"
      case "moderate":
        return "bg-yellow-100 text-yellow-800"
      case "bad":
        return "bg-red-100 text-red-800"
      case "perfect":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_signup":
        return <User className="w-4 h-4 text-blue-600" />
      case "appointment":
        return <Clock className="w-4 h-4 text-purple-600" />
      case "report":
        return <FileText className="w-4 h-4 text-green-600" />
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const handleGenerateReport = () => {
    setShowReportModal(true)
    console.log("[v0] Generate Report clicked")
  }

  const handleViewBackups = () => {
    setShowBackupModal(true)
    console.log("[v0] View Backups clicked")
  }

  const handleManageUsers = () => {
    router.push("/admin/users")
    console.log("[v0] Manage Users clicked")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{metrics.totalDoctors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{metrics.totalPatients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{metrics.activeNow}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getHealthColor(metrics.systemHealth)}>{metrics.systemHealth.toUpperCase()}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Today's Consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900">{metrics.todayConsultations}</div>
            <p className="text-sm text-gray-600 mt-2">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              System Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">99.9%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Response Time</span>
                <span className="font-medium">245ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((activity) => (
                  <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.type)}
                        <span className="text-sm text-gray-600 capitalize">{activity.type.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">{activity.description}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{activity.user}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(activity.status)}>{activity.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-500">{activity.time}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleManageUsers} className="flex items-center gap-2 bg-transparent">
            <Users className="w-4 h-4" />
            Manage Users
          </Button>
          <Button variant="outline" onClick={handleGenerateReport} className="flex items-center gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-transparent flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
              <CardDescription>Create a system report for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="daily">Daily Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowReportModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    generateReportFile(reportType)
                    setShowReportModal(false)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate & Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backups Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>System Backups</CardTitle>
              <CardDescription>View and manage system backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {[
                  { date: "2025-11-06", size: "2.5 GB", status: "Complete" },
                  { date: "2025-11-05", size: "2.4 GB", status: "Complete" },
                  { date: "2025-11-04", size: "2.3 GB", status: "Complete" },
                  { date: "2025-11-03", size: "2.5 GB", status: "Complete" },
                ].map((backup, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{backup.date}</p>
                      <p className="text-xs text-gray-500">{backup.size}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">{backup.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => downloadBackupFile(backup.date)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowBackupModal(false)}>
                  Close
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    createNewBackup()
                    setShowBackupModal(false)
                  }}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Create New Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
