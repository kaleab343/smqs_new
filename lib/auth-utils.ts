import type { UserRole } from "./auth-context"

export const ROLE_PATHS: Record<UserRole, string> = {
  patient: "/patient/dashboard",
  doctor: "/doctor/dashboard",
  admin: "/admin/dashboard",
  receptionist: "/receptionist/dashboard",
  super_admin: "/super-admin/dashboard",
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    patient: "Patient",
    doctor: "Doctor",
    admin: "Administrator",
    receptionist: "Receptionist",
    super_admin: "Super Admin",
  }
  return names[role]
}
