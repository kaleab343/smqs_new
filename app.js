// ============================================
// Hospital Queue Management System
// Pure JavaScript Implementation
// ============================================

// Global State Management
const AppState = {
  currentUser: null,
  users: [],
  patients: [],
  doctors: [],
  appointments: [],
  queue: [],
  departments: ["General Medicine", "Pediatrics", "Surgery", "Orthopedics", "Emergency Care"],
  notifications: [],
}

// ============================================
// Utility Functions
// ============================================

function saveToLocalStorage() {
  localStorage.setItem("HQMS_AppState", JSON.stringify(AppState))
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem("HQMS_AppState")
  if (saved) {
    const data = JSON.parse(saved)
    Object.assign(AppState, data)
  } else {
    initializeDemoData()
  }
}

function initializeDemoData() {
  // Demo Users
  AppState.users = [
    { id: 1, username: "admin", password: "admin123", role: "admin", name: "Admin User", email: "admin@hospital.com" },
    {
      id: 2,
      username: "doctor1",
      password: "doc123",
      role: "doctor",
      name: "Dr. Sarah Johnson",
      email: "sarah@hospital.com",
      specialization: "General Medicine",
    },
    {
      id: 3,
      username: "doctor2",
      password: "doc123",
      role: "doctor",
      name: "Dr. Ahmed Hassan",
      email: "ahmed@hospital.com",
      specialization: "Pediatrics",
    },
    {
      id: 4,
      username: "receptionist",
      password: "rec123",
      role: "receptionist",
      name: "Mary Tekle",
      email: "mary@hospital.com",
    },
    {
      id: 5,
      username: "patient1",
      password: "pat123",
      role: "patient",
      name: "John Doe",
      email: "john@email.com",
      phone: "+1234567890",
    },
  ]

  // Demo Doctors
  AppState.doctors = [
    {
      id: 1,
      userId: 2,
      name: "Dr. Sarah Johnson",
      specialization: "General Medicine",
      availability: true,
      availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "08:00",
      endTime: "16:00",
    },
    {
      id: 2,
      userId: 3,
      name: "Dr. Ahmed Hassan",
      specialization: "Pediatrics",
      availability: true,
      availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "09:00",
      endTime: "17:00",
    },
  ]

  // Demo Patients
  AppState.patients = [
    {
      id: 1,
      userId: 5,
      name: "John Doe",
      phone: "+1234567890",
      email: "john@email.com",
      gender: "Male",
      dob: "1985-05-15",
      emergencyFlag: false,
    },
  ]

  saveToLocalStorage()
}

function generateId() {
  return Date.now()
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease"
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

// ============================================
// Authentication System
// ============================================

function authenticate(username, password, role) {
  const user = AppState.users.find((u) => u.username === username && u.password === password && u.role === role)
  if (user) {
    AppState.currentUser = user
    return true
  }
  return false
}

function logout() {
  AppState.currentUser = null
  renderAuthPage()
}

// ============================================
// Queue Management Engine
// ============================================

const QueueEngine = {
  generateQueueNumber() {
    const date = new Date()
    const queueNum = AppState.queue.length + 1
    return `Q${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${String(queueNum).padStart(3, "0")}`
  },

  addToQueue(appointmentId, isEmergency = false) {
    const appointment = AppState.appointments.find((a) => a.id === appointmentId)
    if (!appointment) return null

    const queueItem = {
      id: generateId(),
      appointmentId: appointmentId,
      queueNumber: this.generateQueueNumber(),
      position: isEmergency ? 1 : AppState.queue.length + 1,
      status: "waiting",
      createdAt: new Date().toISOString(),
      isEmergency: isEmergency,
    }

    if (isEmergency) {
      AppState.queue.unshift(queueItem)
      this.updatePositions()
    } else {
      AppState.queue.push(queueItem)
    }

    saveToLocalStorage()
    return queueItem
  },

  updatePositions() {
    AppState.queue.forEach((item, index) => {
      item.position = index + 1
    })
  },

  callNextPatient() {
    const nextPatient = AppState.queue.find((q) => q.status === "waiting")
    if (nextPatient) {
      nextPatient.status = "in_progress"
      saveToLocalStorage()
      return nextPatient
    }
    return null
  },

  completePatient(queueId) {
    const queueItem = AppState.queue.find((q) => q.id === queueId)
    if (queueItem) {
      queueItem.status = "completed"
      AppState.queue = AppState.queue.filter((q) => q.id !== queueId)
      this.updatePositions()
      saveToLocalStorage()
      return true
    }
    return false
  },

  getQueueByDoctor(doctorId) {
    return AppState.queue.filter((q) => {
      const appointment = AppState.appointments.find((a) => a.id === q.appointmentId)
      return appointment && appointment.doctorId === doctorId
    })
  },

  getPatientQueue(patientId) {
    const appointments = AppState.appointments.filter((a) => a.patientId === patientId)
    return AppState.queue.filter((q) => appointments.find((a) => a.id === q.appointmentId))
  },
}

// ============================================
// Appointment System
// ============================================

const AppointmentSystem = {
  bookAppointment(patientId, doctorId, appointmentDate, department, notes = "") {
    const appointment = {
      id: generateId(),
      patientId: patientId,
      doctorId: doctorId,
      appointmentDate: appointmentDate,
      department: department,
      notes: notes,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    AppState.appointments.push(appointment)
    const queueItem = QueueEngine.addToQueue(appointment.id, false)
    saveToLocalStorage()

    return { appointment, queueItem }
  },

  cancelAppointment(appointmentId) {
    const index = AppState.appointments.findIndex((a) => a.id === appointmentId)
    if (index > -1) {
      AppState.appointments.splice(index, 1)
      // Also remove from queue
      AppState.queue = AppState.queue.filter((q) => q.appointmentId !== appointmentId)
      QueueEngine.updatePositions()
      saveToLocalStorage()
      return true
    }
    return false
  },

  getPatientAppointments(patientId) {
    return AppState.appointments.filter((a) => a.patientId === patientId)
  },

  getDoctorAppointments(doctorId) {
    return AppState.appointments.filter((a) => a.doctorId === doctorId)
  },
}

// ============================================
// UI Rendering Functions
// ============================================

function render(component) {
  const app = document.getElementById("app")
  app.innerHTML = component
}

// ============================================
// Auth Page
// ============================================

function renderAuthPage() {
  const authHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="logo" style="text-align: center; margin-bottom: 2rem; color: var(--color-primary);">
                    <div class="logo-icon" style="display: inline-block; margin-right: 0.5rem;"></div>
                    Hospital QMS
                </div>
                <h1 class="auth-title">Welcome</h1>
                <p class="auth-subtitle">Hospital Queue Management System</p>

                <div class="form-group">
                    <label class="form-label">Select Your Role</label>
                    <div class="role-selector">
                        <div class="role-option" data-role="patient" onclick="selectRole('patient', this)">
                            <div class="role-label">Patient</div>
                            <div class="role-description">Book & Track</div>
                        </div>
                        <div class="role-option" data-role="doctor" onclick="selectRole('doctor', this)">
                            <div class="role-label">Doctor</div>
                            <div class="role-description">Manage Queue</div>
                        </div>
                        <div class="role-option" data-role="receptionist" onclick="selectRole('receptionist', this)">
                            <div class="role-label">Receptionist</div>
                            <div class="role-description">Register</div>
                        </div>
                        <div class="role-option" data-role="admin" onclick="selectRole('admin', this)">
                            <div class="role-label">Admin</div>
                            <div class="role-description">Manage All</div>
                        </div>
                    </div>
                </div>

                <form onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input type="text" class="form-input" id="username" placeholder="Enter your username" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input type="password" class="form-input" id="password" placeholder="Enter your password" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-block">Login</button>
                </form>

                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border); font-size: 0.875rem; color: var(--color-text-secondary);">
                    <strong>Demo Credentials:</strong>
                    <div style="margin-top: 0.5rem; font-family: monospace; line-height: 1.6;">
                        Patient: patient1 / pat123<br>
                        Doctor: doctor1 / doc123<br>
                        Receptionist: receptionist / rec123<br>
                        Admin: admin / admin123
                    </div>
                </div>
            </div>
        </div>
    `
  render(authHTML)
}

function selectRole(role, element) {
  document.querySelectorAll(".role-option").forEach((el) => el.classList.remove("selected"))
  element.classList.add("selected")
  document.getElementById("selectedRole").value = role
}

function handleLogin(event) {
  event.preventDefault()
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value
  const roles = document.querySelectorAll(".role-option.selected")

  if (roles.length === 0) {
    showNotification("Please select a role", "error")
    return
  }

  const role = roles[0].dataset.role

  if (authenticate(username, password, role)) {
    renderDashboard()
    showNotification("Login successful!", "success")
  } else {
    showNotification("Invalid credentials", "error")
  }
}

// ============================================
// Dashboard Layout
// ============================================

function renderDashboard() {
  const user = AppState.currentUser
  const sidebarHTML = renderSidebar(user)
  const contentHTML = getDashboardContent(user.role)

  const dashboardHTML = `
        <div class="layout">
            ${sidebarHTML}
            <div class="main-content">
                <div class="header">
                    <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
                    <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
                </div>
                ${contentHTML}
            </div>
        </div>
    `

  render(dashboardHTML)
  setupEventListeners(user.role)
}

function renderSidebar(user) {
  const sidebarItems = {
    patient: [
      { label: "Dashboard", action: "showPatientDashboard" },
      { label: "Book Appointment", action: "showAppointmentBooking" },
      { label: "My Queue", action: "showPatientQueue" },
      { label: "My Appointments", action: "showMyAppointments" },
    ],
    doctor: [
      { label: "Dashboard", action: "showDoctorDashboard" },
      { label: "Queue List", action: "showDoctorQueue" },
      { label: "My Schedule", action: "showDoctorSchedule" },
    ],
    receptionist: [
      { label: "Dashboard", action: "showReceptionistDashboard" },
      { label: "Register Patient", action: "showPatientRegistration" },
      { label: "Queue Management", action: "showQueueManagement" },
      { label: "Emergency Cases", action: "showEmergencyCases" },
    ],
    admin: [
      { label: "Dashboard", action: "showAdminDashboard" },
      { label: "Doctors", action: "showDoctorManagement" },
      { label: "Staff", action: "showStaffManagement" },
      { label: "Reports", action: "showReports" },
      { label: "Settings", action: "showSettings" },
    ],
  }

  const items = sidebarItems[user.role] || []

  return `
        <div class="sidebar">
            <div class="logo">
                <span class="logo-icon"></span>Hospital QMS
            </div>
            <nav class="nav-menu">
                ${items
                  .map(
                    (item, index) => `
                    <li class="nav-item">
                        <a class="nav-link ${index === 0 ? "active" : ""}" onclick="${item.action}()" style="cursor: pointer;">
                            ${item.label}
                        </a>
                    </li>
                `,
                  )
                  .join("")}
            </nav>
            <div class="user-profile">
                <div class="profile-info">
                    <div class="profile-name">${user.name}</div>
                    <div class="profile-role">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
                </div>
            </div>
        </div>
    `
}

// ============================================
// Patient Dashboard
// ============================================

function getDashboardContent(role) {
  switch (role) {
    case "patient":
      return renderPatientDashboard()
    case "doctor":
      return renderDoctorDashboard()
    case "receptionist":
      return renderReceptionistDashboard()
    case "admin":
      return renderAdminDashboard()
    default:
      return '<div class="container">Unknown role</div>'
  }
}

function renderPatientDashboard() {
  const patient = AppState.patients.find((p) => p.userId === AppState.currentUser.id)
  const appointments = AppointmentSystem.getPatientAppointments(patient.id)
  const queueStatus = QueueEngine.getPatientQueue(patient.id)

  return `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">My Dashboard</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Appointments</div>
                    <div class="stat-value">${appointments.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">In Queue</div>
                    <div class="stat-value">${queueStatus.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${appointments.filter((a) => a.status === "pending").length}</div>
                </div>
            </div>

            ${
              queueStatus.length > 0
                ? `
                <div class="card" style="margin-bottom: 2rem;">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Your Queue Status</div>
                            <div class="card-subtitle">Real-time position in queue</div>
                        </div>
                    </div>
                    ${queueStatus
                      .map((item) => {
                        const appointment = AppState.appointments.find((a) => a.id === item.appointmentId)
                        const doctor = AppState.doctors.find((d) => d.id === appointment.doctorId)
                        return `
                            <div class="alert alert-info">
                                <div style="flex: 1;">
                                    <strong>Queue #${item.queueNumber}</strong><br>
                                    Position: <strong>${item.position}</strong> | Doctor: <strong>${doctor.name}</strong> | Status: <span class="badge badge-${item.status === "completed" ? "success" : item.status === "in_progress" ? "in-progress" : "pending"}">${item.status}</span>
                                </div>
                            </div>
                        `
                      })
                      .join("")}
                </div>
            `
                : ""
            }

            <div class="grid grid-2">
                <button class="btn btn-primary btn-block" onclick="showAppointmentBooking()" style="height: 60px; font-size: 1rem;">
                    Book New Appointment
                </button>
                <button class="btn btn-secondary btn-block" onclick="showMyAppointments()" style="height: 60px; font-size: 1rem;">
                    View All Appointments
                </button>
            </div>
        </div>
    `
}

function showPatientDashboard() {
  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + renderPatientDashboard()
}

// ============================================
// Appointment Booking
// ============================================

function showAppointmentBooking() {
  const patient = AppState.patients.find((p) => p.userId === AppState.currentUser.id)

  const bookingHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Book an Appointment</h1>

            <div class="card">
                <form onsubmit="handleAppointmentBooking(event, ${patient.id})">
                    <div class="form-group">
                        <label class="form-label">Select Department</label>
                        <select class="form-select" id="department" required>
                            <option value="">-- Choose Department --</option>
                            ${AppState.departments.map((dept) => `<option value="${dept}">${dept}</option>`).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Select Doctor</label>
                        <select class="form-select" id="doctor" required>
                            <option value="">-- Choose Doctor --</option>
                            ${AppState.doctors.map((doc) => `<option value="${doc.id}">${doc.name} (${doc.specialization})</option>`).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Appointment Date & Time</label>
                        <input type="datetime-local" class="form-input" id="appointmentDate" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Notes (Optional)</label>
                        <textarea class="form-textarea" id="notes" placeholder="Any additional information..."></textarea>
                    </div>

                    <div class="flex gap-2">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Book Appointment</button>
                        <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="showPatientDashboard()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + bookingHTML
}

function handleAppointmentBooking(event, patientId) {
  event.preventDefault()

  const department = document.getElementById("department").value
  const doctorId = Number.parseInt(document.getElementById("doctor").value)
  const appointmentDate = document.getElementById("appointmentDate").value
  const notes = document.getElementById("notes").value

  if (!department || !doctorId || !appointmentDate) {
    showNotification("Please fill all required fields", "error")
    return
  }

  const result = AppointmentSystem.bookAppointment(patientId, doctorId, appointmentDate, department, notes)
  showNotification(`Appointment booked! Your queue number is: ${result.queueItem.queueNumber}`, "success")
  setTimeout(() => showPatientDashboard(), 1500)
}

// ============================================
// Patient Queue View
// ============================================

function showPatientQueue() {
  const patient = AppState.patients.find((p) => p.userId === AppState.currentUser.id)
  const queueStatus = QueueEngine.getPatientQueue(patient.id)

  let queueHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">My Queue Status</h1>
    `

  if (queueStatus.length === 0) {
    queueHTML += `
            <div class="alert alert-info">
                <strong>No active queue items. Book an appointment to get started!</strong>
            </div>
            <button class="btn btn-primary" onclick="showAppointmentBooking()">Book Appointment</button>
        `
  } else {
    queueStatus.forEach((item) => {
      const appointment = AppState.appointments.find((a) => a.id === item.appointmentId)
      const doctor = AppState.doctors.find((d) => d.id === appointment.doctorId)

      queueHTML += `
                <div class="card" style="margin-bottom: 1.5rem;">
                    <div class="queue-number-display">
                        <div class="queue-number-label">Your Queue Number</div>
                        <div class="queue-number">${item.queueNumber}</div>
                        <div class="queue-status">Position: <strong>#${item.position}</strong> in line</div>
                    </div>

                    <div style="display: grid; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span class="stat-label">Doctor</span>
                            <strong>${doctor.name}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="stat-label">Department</span>
                            <strong>${appointment.department}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="stat-label">Date & Time</span>
                            <strong>${formatDate(appointment.appointmentDate)} at ${formatTime(appointment.appointmentDate)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="stat-label">Status</span>
                            <span class="badge badge-${item.status === "completed" ? "success" : item.status === "in_progress" ? "in-progress" : "pending"}" style="text-transform: capitalize;">${item.status}</span>
                        </div>
                    </div>
                </div>
            `
    })
  }

  queueHTML += `</div>`

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + queueHTML
}

// ============================================
// My Appointments
// ============================================

function showMyAppointments() {
  const patient = AppState.patients.find((p) => p.userId === AppState.currentUser.id)
  const appointments = AppointmentSystem.getPatientAppointments(patient.id)

  const appointmentsHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">My Appointments</h1>

            ${
              appointments.length === 0
                ? `
                <div class="alert alert-info">
                    <strong>No appointments yet. Book your first appointment!</strong>
                </div>
                <button class="btn btn-primary" onclick="showAppointmentBooking()">Book Appointment</button>
            `
                : `
                <div class="grid grid-2">
                    ${appointments
                      .map((apt) => {
                        const doctor = AppState.doctors.find((d) => d.id === apt.doctorId)
                        const queueItem = AppState.queue.find((q) => q.appointmentId === apt.id)

                        return `
                            <div class="card">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                    <div>
                                        <div class="card-title">${doctor.name}</div>
                                        <div class="card-subtitle">${apt.department}</div>
                                    </div>
                                    <span class="badge badge-${apt.status === "completed" ? "success" : apt.status === "pending" ? "pending" : "in-progress"}">${apt.status}</span>
                                </div>

                                <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
                                    <div>
                                        <span class="stat-label">Date & Time</span>
                                        <div>${formatDate(apt.appointmentDate)} at ${formatTime(apt.appointmentDate)}</div>
                                    </div>
                                    <div>
                                        <span class="stat-label">Specialization</span>
                                        <div>${doctor.specialization}</div>
                                    </div>
                                    ${
                                      queueItem
                                        ? `
                                        <div>
                                            <span class="stat-label">Queue Number</span>
                                            <div><strong>${queueItem.queueNumber}</strong> (Position: #${queueItem.position})</div>
                                        </div>
                                    `
                                        : ""
                                    }
                                </div>

                                <div class="flex gap-1">
                                    ${
                                      apt.status === "pending"
                                        ? `
                                        <button class="btn btn-danger btn-small" style="flex: 1;" onclick="cancelAppointmentHandler(${apt.id})">Cancel</button>
                                    `
                                        : ""
                                    }
                                </div>
                            </div>
                        `
                      })
                      .join("")}
                </div>
            `
            }
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + appointmentsHTML
}

function cancelAppointmentHandler(appointmentId) {
  if (confirm("Are you sure you want to cancel this appointment?")) {
    AppointmentSystem.cancelAppointment(appointmentId)
    showNotification("Appointment cancelled", "success")
    showMyAppointments()
  }
}

// ============================================
// Doctor Dashboard
// ============================================

function renderDoctorDashboard() {
  const doctor = AppState.doctors.find((d) => d.userId === AppState.currentUser.id)
  const doctorQueue = QueueEngine.getQueueByDoctor(doctor.id)
  const waitingPatients = doctorQueue.filter((q) => q.status === "waiting")
  const completedToday = doctorQueue.filter((q) => q.status === "completed")

  return `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Queue Management - Dr. ${AppState.currentUser.name}</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Waiting Patients</div>
                    <div class="stat-value">${waitingPatients.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">Seen Today</div>
                    <div class="stat-value">${completedToday.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value">${doctorQueue.filter((q) => q.status === "in_progress").length}</div>
                </div>
            </div>

            ${
              waitingPatients.length > 0
                ? `
                <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, var(--color-success) 0%, var(--color-success-light) 100%); color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.875rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">Next Patient</div>
                            <div style="font-size: 2rem; font-weight: 700; letter-spacing: 2px;">${waitingPatients[0].queueNumber}</div>
                        </div>
                        <button class="btn btn-primary" onclick="callNextPatient()" style="background: white; color: var(--color-text); font-weight: 700;">
                            CALL NEXT
                        </button>
                    </div>
                </div>
            `
                : `
                <div class="alert alert-success" style="margin-bottom: 2rem;">
                    <strong>All patients have been seen. Great work!</strong>
                </div>
            `
            }

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Patient Queue</div>
                        <div class="card-subtitle">All patients assigned to you</div>
                    </div>
                </div>

                ${
                  doctorQueue.length === 0
                    ? `
                    <div class="alert alert-info">No patients in queue</div>
                `
                    : `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Queue #</th>
                                <th>Position</th>
                                <th>Patient ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${doctorQueue
                              .map((item, index) => {
                                const appointment = AppState.appointments.find((a) => a.id === item.appointmentId)
                                return `
                                    <tr>
                                        <td><strong>${item.queueNumber}</strong></td>
                                        <td>#${item.position}</td>
                                        <td>${appointment ? appointment.patientId : "N/A"}</td>
                                        <td><span class="badge badge-${item.status === "completed" ? "success" : item.status === "in_progress" ? "in-progress" : "pending"}">${item.status}</span></td>
                                        <td>
                                            ${
                                              item.status === "waiting"
                                                ? `
                                                <button class="btn btn-primary btn-small" onclick="markPatientInProgress(${item.id})">See Patient</button>
                                            `
                                                : item.status === "in_progress"
                                                  ? `
                                                <button class="btn btn-success btn-small" onclick="completePatientConsultation(${item.id})">Complete</button>
                                            `
                                                  : ""
                                            }
                                        </td>
                                    </tr>
                                `
                              })
                              .join("")}
                        </tbody>
                    </table>
                `
                }
            </div>
        </div>
    `
}

function showDoctorDashboard() {
  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + renderDoctorDashboard()
}

function showDoctorQueue() {
  showDoctorDashboard()
}

function callNextPatient() {
  const doctor = AppState.doctors.find((d) => d.userId === AppState.currentUser.id)
  const queueItem = QueueEngine.callNextPatient()
  if (queueItem) {
    showNotification(`Now calling patient: ${queueItem.queueNumber}`, "info")
    setTimeout(() => showDoctorDashboard(), 1000)
  } else {
    showNotification("No patients waiting", "warning")
  }
}

function markPatientInProgress(queueId) {
  const queueItem = AppState.queue.find((q) => q.id === queueId)
  if (queueItem) {
    queueItem.status = "in_progress"
    saveToLocalStorage()
    showNotification("Patient marked as in progress", "success")
    showDoctorDashboard()
  }
}

function completePatientConsultation(queueId) {
  QueueEngine.completePatient(queueId)
  showNotification("Patient consultation completed", "success")
  showDoctorDashboard()
}

function showDoctorSchedule() {
  const doctor = AppState.doctors.find((d) => d.userId === AppState.currentUser.id)

  const scheduleHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">My Schedule</h1>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">${doctor.name}</div>
                        <div class="card-subtitle">${doctor.specialization}</div>
                    </div>
                    <span class="badge badge-success">Available</span>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <div>
                        <span class="stat-label">Working Days</span>
                        <div>${doctor.availabilityDays.join(", ")}</div>
                    </div>
                    <div>
                        <span class="stat-label">Working Hours</span>
                        <div>${doctor.startTime} - ${doctor.endTime}</div>
                    </div>
                    <div>
                        <span class="stat-label">Current Status</span>
                        <span class="badge badge-success">Active</span>
                    </div>
                </div>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + scheduleHTML
}

// ============================================
// Receptionist Dashboard
// ============================================

function renderReceptionistDashboard() {
  const totalPatients = AppState.patients.length
  const totalQueue = AppState.queue.length
  const totalAppointments = AppState.appointments.length

  return `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Receptionist Dashboard</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Patients</div>
                    <div class="stat-value">${totalPatients}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">In Queue</div>
                    <div class="stat-value">${totalQueue}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">Appointments</div>
                    <div class="stat-value">${totalAppointments}</div>
                </div>
            </div>

            <div class="grid grid-2">
                <button class="btn btn-primary btn-block" onclick="showPatientRegistration()" style="height: 60px; font-size: 1rem;">
                    Register New Patient
                </button>
                <button class="btn btn-warning btn-block" onclick="showEmergencyCases()" style="height: 60px; font-size: 1rem;">
                    Emergency Cases
                </button>
                <button class="btn btn-secondary btn-block" onclick="showQueueManagement()" style="height: 60px; font-size: 1rem;">
                    Queue Management
                </button>
                <button class="btn btn-secondary btn-block" onclick="showReceptionistStats()" style="height: 60px; font-size: 1rem;">
                    Statistics
                </button>
            </div>
        </div>
    `
}

function showReceptionistDashboard() {
  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + renderReceptionistDashboard()
}

// ============================================
// Patient Registration (Receptionist)
// ============================================

function showPatientRegistration() {
  const registrationHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Register New Patient</h1>

            <div class="card">
                <form onsubmit="handlePatientRegistration(event)">
                    <div class="form-group">
                        <label class="form-label">Full Name *</label>
                        <input type="text" class="form-input" id="patientName" placeholder="Enter full name" required>
                    </div>

                    <div class="grid grid-2" style="gap: 1.5rem;">
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" class="form-input" id="patientEmail" placeholder="Enter email" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Phone *</label>
                            <input type="tel" class="form-input" id="patientPhone" placeholder="Enter phone number" required>
                        </div>
                    </div>

                    <div class="grid grid-2" style="gap: 1.5rem;">
                        <div class="form-group">
                            <label class="form-label">Date of Birth</label>
                            <input type="date" class="form-input" id="patientDOB">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Gender</label>
                            <select class="form-select" id="patientGender">
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Address</label>
                        <textarea class="form-textarea" id="patientAddress" placeholder="Enter address" style="min-height: 80px;"></textarea>
                    </div>

                    <div class="flex gap-1">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Register Patient</button>
                        <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="showReceptionistDashboard()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + registrationHTML
}

function handlePatientRegistration(event) {
  event.preventDefault()

  const newUser = {
    id: generateId(),
    username: `patient${Date.now()}`,
    password: "temp123",
    role: "patient",
    name: document.getElementById("patientName").value,
    email: document.getElementById("patientEmail").value,
    phone: document.getElementById("patientPhone").value,
  }

  const newPatient = {
    id: generateId(),
    userId: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    gender: document.getElementById("patientGender").value,
    dob: document.getElementById("patientDOB").value,
    address: document.getElementById("patientAddress").value,
    emergencyFlag: false,
  }

  AppState.users.push(newUser)
  AppState.patients.push(newPatient)
  saveToLocalStorage()

  showNotification(`Patient registered successfully! ID: ${newPatient.id}`, "success")
  setTimeout(() => showReceptionistDashboard(), 1500)
}

// ============================================
// Queue Management (Receptionist)
// ============================================

function showQueueManagement() {
  const queueHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Queue Management</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Queue</div>
                    <div class="stat-value">${AppState.queue.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">Completed</div>
                    <div class="stat-value">${AppState.queue.filter((q) => q.status === "completed").length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">In Progress</div>
                    <div class="stat-value">${AppState.queue.filter((q) => q.status === "in_progress").length}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Queue List</div>
                        <div class="card-subtitle">Real-time queue status</div>
                    </div>
                </div>

                ${
                  AppState.queue.length === 0
                    ? `
                    <div class="alert alert-info">No patients in queue</div>
                `
                    : `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Position</th>
                                <th>Queue #</th>
                                <th>Department</th>
                                <th>Doctor</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AppState.queue
                              .map((item, index) => {
                                const appointment = AppState.appointments.find((a) => a.id === item.appointmentId)
                                const doctor = AppState.doctors.find((d) => d.id === appointment.doctorId)

                                return `
                                    <tr>
                                        <td><strong>#${item.position}</strong></td>
                                        <td>${item.queueNumber}</td>
                                        <td>${appointment.department}</td>
                                        <td>${doctor.name}</td>
                                        <td><span class="badge badge-${item.status === "completed" ? "success" : item.status === "in_progress" ? "in-progress" : "pending"}">${item.status}</span></td>
                                        <td>${formatTime(item.createdAt)}</td>
                                        <td>
                                            <button class="btn btn-danger btn-small" onclick="removeFromQueue(${item.id})">Remove</button>
                                        </td>
                                    </tr>
                                `
                              })
                              .join("")}
                        </tbody>
                    </table>
                `
                }
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + queueHTML
}

function removeFromQueue(queueId) {
  if (confirm("Remove this patient from queue?")) {
    AppState.queue = AppState.queue.filter((q) => q.id !== queueId)
    QueueEngine.updatePositions()
    saveToLocalStorage()
    showNotification("Patient removed from queue", "success")
    showQueueManagement()
  }
}

// ============================================
// Emergency Cases
// ============================================

function showEmergencyCases() {
  const emergencyHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Emergency Cases Management</h1>

            <div class="card" style="margin-bottom: 2rem; background: linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-light) 100%); color: white;">
                <div class="card-header" style="border-bottom-color: rgba(255, 255, 255, 0.2);">
                    <div class="card-title" style="color: white;">Add Emergency Patient</div>
                </div>

                <form onsubmit="handleEmergencyCase(event)">
                    <div class="form-group">
                        <label class="form-label" style="color: white;">Select Patient</label>
                        <select class="form-select" id="emergencyPatient" required>
                            <option value="">-- Choose Patient --</option>
                            ${AppState.patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="color: white;">Select Doctor</label>
                        <select class="form-select" id="emergencyDoctor" required>
                            <option value="">-- Choose Doctor --</option>
                            ${AppState.doctors.map((d) => `<option value="${d.id}">${d.name}</option>`).join("")}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="color: white;">Emergency Notes</label>
                        <textarea class="form-textarea" id="emergencyNotes" placeholder="Describe the emergency situation..." required></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%; background: white; color: var(--color-danger); font-weight: 700;">
                        Mark as Emergency
                    </button>
                </form>
            </div>

            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Emergency Queue</div>
                        <div class="card-subtitle">Priority patients</div>
                    </div>
                </div>

                ${
                  AppState.queue.filter((q) => q.isEmergency).length === 0
                    ? `
                    <div class="alert alert-info">No emergency cases</div>
                `
                    : `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Queue #</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AppState.queue
                              .filter((q) => q.isEmergency)
                              .map(
                                (item) => `
                                <tr>
                                    <td><strong>${item.queueNumber}</strong></td>
                                    <td>#${item.position}</td>
                                    <td><span class="badge badge-emergency">EMERGENCY</span></td>
                                    <td>${formatTime(item.createdAt)}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                `
                }
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + emergencyHTML
}

function handleEmergencyCase(event) {
  event.preventDefault()

  const patientId = Number.parseInt(document.getElementById("emergencyPatient").value)
  const doctorId = Number.parseInt(document.getElementById("emergencyDoctor").value)
  const notes = document.getElementById("emergencyNotes").value

  if (!patientId || !doctorId) {
    showNotification("Please select patient and doctor", "error")
    return
  }

  const appointment = {
    id: generateId(),
    patientId: patientId,
    doctorId: doctorId,
    appointmentDate: new Date().toISOString(),
    department: "Emergency",
    notes: notes,
    status: "pending",
    createdAt: new Date().toISOString(),
  }

  AppState.appointments.push(appointment)
  QueueEngine.addToQueue(appointment.id, true)
  saveToLocalStorage()

  showNotification("Emergency case added to priority queue!", "success")
  setTimeout(() => showEmergencyCases(), 1500)
}

function showReceptionistStats() {
  const statsHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Reception Statistics</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Patients</div>
                    <div class="stat-value">${AppState.patients.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">Total Appointments</div>
                    <div class="stat-value">${AppState.appointments.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value">${AppState.appointments.filter((a) => a.status === "pending").length}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Department Distribution</div>
                </div>

                <div style="display: grid; gap: 1rem;">
                    ${AppState.departments
                      .map((dept) => {
                        const count = AppState.appointments.filter((a) => a.department === dept).length
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--color-bg); border-radius: var(--radius);">
                                <span>${dept}</span>
                                <strong>${count}</strong>
                            </div>
                        `
                      })
                      .join("")}
                </div>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + statsHTML
}

// ============================================
// Admin Dashboard
// ============================================

function renderAdminDashboard() {
  return `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Admin Dashboard</h1>

            <div class="stats">
                <div class="stat-card">
                    <div class="stat-label">Total Users</div>
                    <div class="stat-value">${AppState.users.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-success);">
                    <div class="stat-label">Active Doctors</div>
                    <div class="stat-value">${AppState.doctors.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-warning);">
                    <div class="stat-label">Total Patients</div>
                    <div class="stat-value">${AppState.patients.length}</div>
                </div>
                <div class="stat-card" style="border-left-color: var(--color-danger);">
                    <div class="stat-label">Queue Items</div>
                    <div class="stat-value">${AppState.queue.length}</div>
                </div>
            </div>

            <div class="grid grid-2">
                <button class="btn btn-primary btn-block" onclick="showDoctorManagement()" style="height: 60px; font-size: 1rem;">
                    Doctor Management
                </button>
                <button class="btn btn-primary btn-block" onclick="showStaffManagement()" style="height: 60px; font-size: 1rem;">
                    Staff Management
                </button>
                <button class="btn btn-secondary btn-block" onclick="showReports()" style="height: 60px; font-size: 1rem;">
                    Reports & Analytics
                </button>
                <button class="btn btn-secondary btn-block" onclick="showSettings()" style="height: 60px; font-size: 1rem;">
                    System Settings
                </button>
            </div>
        </div>
    `
}

function showAdminDashboard() {
  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + renderAdminDashboard()
}

// ============================================
// Doctor Management
// ============================================

function showDoctorManagement() {
  const doctorHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Doctor Management</h1>

            <button class="btn btn-primary" onclick="showAddDoctor()" style="margin-bottom: 2rem;">Add New Doctor</button>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Doctors List</div>
                </div>

                ${
                  AppState.doctors.length === 0
                    ? `
                    <div class="alert alert-info">No doctors registered</div>
                `
                    : `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Specialization</th>
                                <th>Availability</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${AppState.doctors
                              .map(
                                (doctor) => `
                                <tr>
                                    <td><strong>${doctor.name}</strong></td>
                                    <td>${doctor.specialization}</td>
                                    <td>${doctor.availabilityDays.join(", ")}</td>
                                    <td><span class="badge badge-success">Active</span></td>
                                    <td>
                                        <button class="btn btn-danger btn-small" onclick="deleteDoctor(${doctor.id})">Delete</button>
                                    </td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                    </table>
                `
                }
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + doctorHTML
}

function showAddDoctor() {
  const addDoctorHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Add New Doctor</h1>

            <div class="card">
                <form onsubmit="handleAddDoctor(event)">
                    <div class="form-group">
                        <label class="form-label">Doctor Name *</label>
                        <input type="text" class="form-input" id="doctorName" placeholder="Dr. John Smith" required>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Specialization *</label>
                        <select class="form-select" id="doctorSpec" required>
                            <option value="">-- Select Specialization --</option>
                            <option value="General Medicine">General Medicine</option>
                            <option value="Pediatrics">Pediatrics</option>
                            <option value="Surgery">Surgery</option>
                            <option value="Orthopedics">Orthopedics</option>
                            <option value="Emergency Care">Emergency Care</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Availability Days *</label>
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-top: 0.5rem;">
                            ${["Mon", "Tue", "Wed", "Thu", "Fri"]
                              .map(
                                (day) => `
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" class="day-checkbox" value="${day}" checked>
                                    ${day}
                                </label>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>

                    <div class="grid grid-2" style="gap: 1.5rem;">
                        <div class="form-group">
                            <label class="form-label">Start Time</label>
                            <input type="time" class="form-input" id="startTime" value="08:00">
                        </div>
                        <div class="form-group">
                            <label class="form-label">End Time</label>
                            <input type="time" class="form-input" id="endTime" value="16:00">
                        </div>
                    </div>

                    <div class="flex gap-1">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Add Doctor</button>
                        <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="showDoctorManagement()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + addDoctorHTML
}

function handleAddDoctor(event) {
  event.preventDefault()

  const availableDays = Array.from(document.querySelectorAll(".day-checkbox:checked")).map((el) => el.value)

  const newDoctor = {
    id: generateId(),
    userId: generateId(),
    name: document.getElementById("doctorName").value,
    specialization: document.getElementById("doctorSpec").value,
    availability: true,
    availabilityDays: availableDays,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
  }

  AppState.doctors.push(newDoctor)
  saveToLocalStorage()

  showNotification("Doctor added successfully!", "success")
  setTimeout(() => showDoctorManagement(), 1500)
}

function deleteDoctor(doctorId) {
  if (confirm("Delete this doctor?")) {
    AppState.doctors = AppState.doctors.filter((d) => d.id !== doctorId)
    saveToLocalStorage()
    showNotification("Doctor deleted", "success")
    showDoctorManagement()
  }
}

// ============================================
// Staff Management
// ============================================

function showStaffManagement() {
  const staffHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Staff Management</h1>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">All Users</div>
                </div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${AppState.users
                          .map(
                            (user) => `
                            <tr>
                                <td><strong>${user.name}</strong></td>
                                <td>${user.email || "N/A"}</td>
                                <td><span class="badge badge-info">${user.role}</span></td>
                                <td><span class="badge badge-success">Active</span></td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + staffHTML
}

// ============================================
// Reports & Analytics
// ============================================

function showReports() {
  const reportsHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">Reports & Analytics</h1>

            <div class="grid grid-2">
                <div class="card">
                    <div class="card-title" style="margin-bottom: 1.5rem;">Appointment Statistics</div>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Total Appointments</span>
                            <strong>${AppState.appointments.length}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Pending</span>
                            <strong>${AppState.appointments.filter((a) => a.status === "pending").length}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Completed</span>
                            <strong>${AppState.appointments.filter((a) => a.status === "completed").length}</strong>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title" style="margin-bottom: 1.5rem;">Queue Performance</div>
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Current Queue</span>
                            <strong>${AppState.queue.length}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Completed Today</span>
                            <strong>${AppState.queue.filter((q) => q.status === "completed").length}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius);">
                            <span>Emergency Cases</span>
                            <strong>${AppState.queue.filter((q) => q.isEmergency).length}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + reportsHTML
}

// ============================================
// System Settings
// ============================================

function showSettings() {
  const settingsHTML = `
        <div class="container">
            <h1 style="margin-bottom: 2rem;">System Settings</h1>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">General Settings</div>
                </div>

                <form onsubmit="handleSettingsSave(event)">
                    <div class="form-group">
                        <label class="form-label">Hospital Name</label>
                        <input type="text" class="form-input" id="hospitalName" value="City Hospital" placeholder="Enter hospital name">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Working Hours Start</label>
                        <input type="time" class="form-input" id="workStart" value="08:00">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Working Hours End</label>
                        <input type="time" class="form-input" id="workEnd" value="18:00">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Queue Update Interval (seconds)</label>
                        <input type="number" class="form-input" id="queueInterval" value="5" min="1">
                    </div>

                    <div class="flex gap-1">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Save Settings</button>
                        <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="showAdminDashboard()">Cancel</button>
                    </div>
                </form>
            </div>

            <div class="card" style="margin-top: 2rem;">
                <div class="card-header">
                    <div class="card-title">Data Management</div>
                </div>

                <div style="display: grid; gap: 1rem;">
                    <button class="btn btn-secondary btn-block" onclick="exportData()">Export All Data</button>
                    <button class="btn btn-warning btn-block" onclick="clearAllData()">Clear All Data (Warning!)</button>
                </div>
            </div>
        </div>
    `

  const contentDiv = document.querySelector(".main-content")
  contentDiv.innerHTML =
    `<div class="header">
        <h2 style="font-size: 1.5rem; font-weight: 600;">Hospital Queue Management System</h2>
        <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
    </div>` + settingsHTML
}

function handleSettingsSave(event) {
  event.preventDefault()
  showNotification("Settings saved successfully!", "success")
}

function exportData() {
  const dataStr = JSON.stringify(AppState, null, 2)
  const dataBlob = new Blob([dataStr], { type: "application/json" })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement("a")
  link.href = url
  link.download = `HQMS-backup-${Date.now()}.json`
  link.click()
  showNotification("Data exported successfully!", "success")
}

function clearAllData() {
  if (confirm("Are you sure? This will delete all data!")) {
    localStorage.clear()
    initializeDemoData()
    showNotification("Data cleared and reset to demo data", "warning")
    renderAuthPage()
  }
}

// ============================================
// Event Listeners Setup
// ============================================

function setupEventListeners(role) {
  // Navigation setup
  const navLinks = document.querySelectorAll(".nav-link")
  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      navLinks.forEach((l) => l.classList.remove("active"))
      this.classList.add("active")
    })
  })
}

// ============================================
// Initialize App
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage()

  if (AppState.currentUser) {
    renderDashboard()
  } else {
    renderAuthPage()
  }
})
