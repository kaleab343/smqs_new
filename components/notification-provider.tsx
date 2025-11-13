"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { subscribeToNotifications, getNotifications, type Notification } from "@/lib/notifications"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"
import { removeNotification } from "@/lib/notifications"

interface NotificationContextType {
  notifications: Notification[]
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(getNotifications())

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(setNotifications)
    return unsubscribe
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider")
  }
  return context
}

function NotificationContainer() {
  const { notifications } = useNotifications()

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "info":
      default:
        return "bg-blue-50 border-blue-200"
    }
  }

  const getTypeIconColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "warning":
        return "text-yellow-600"
      case "info":
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notif) => (
        <Card key={notif.id} className={`${getTypeStyles(notif.type)} border pointer-events-auto max-w-sm`}>
          <div className="p-4 flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${getTypeIconColor(notif.type)}`}></div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{notif.title}</p>
              <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
            </div>
            <button onClick={() => removeNotification(notif.id)} className="text-gray-400 hover:text-gray-600 mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}
