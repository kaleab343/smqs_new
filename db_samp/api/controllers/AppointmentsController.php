<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../models/AppointmentModel.php';
require_once __DIR__ . '/../models/QueueModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/PatientModel.php';

class AppointmentsController
{
    private function updateStatus(int $id, string $status): bool
    {
        $pdo = Database::getConnection();
        $tbl = Database::table('appointments');
        $stmt = $pdo->prepare("UPDATE {$tbl} SET status = :s WHERE appointment_id = :id");
        return $stmt->execute([':s' => $status, ':id' => $id]);
    }
    private function readBody(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isJson = stripos($contentType, 'application/json') !== false;
        if ($isJson) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }
        return is_array($body) ? $body : [];
    }

    private function normalizeDateTime(string $input): ?string
    {
        $t = trim($input);
        if ($t === '') return null;
        // Replace T with space from datetime-local inputs
        $t = str_replace('T', ' ', $t);
        // If it looks like YYYY-MM-DD HH:MM (no seconds), append :00
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $t)) {
            $t .= ':00';
        }
        try {
            $dt = new DateTime($t);
            return $dt->format('Y-m-d H:i:s');
        } catch (Throwable $e) {
            return null;
        }
    }

    public function list()
    {
        try {
            $pdo = Database::getConnection();
            $appt = Database::table('appointments');
            $patients = Database::table('patients');
            $doctors = Database::table('doctors');
            $sql = "SELECT a.appointment_id, a.patient_id, a.doctor_id, a.scheduled_time, a.status, a.queue_number,
                           p.name AS patient_name, p.email AS patient_email,
                           d.name AS doctor_name, d.specialization
                    FROM {$appt} a
                    LEFT JOIN {$patients} p ON p.patient_id = a.patient_id
                    LEFT JOIN {$doctors} d ON d.doctor_id = a.doctor_id
                    ORDER BY a.scheduled_time DESC, a.appointment_id DESC";
            $rows = $pdo->query($sql)->fetchAll();
            return Response::json($rows);
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }

    public function create()
    {
        try {
            $body = $this->readBody();
            $pdo = Database::getConnection();

           $patient_id = (int)($body['patient_id'] ?? 0);
           $user_id = (int)($body['user_id'] ?? 0);
           $doctor_id = (int)($body['doctor_id'] ?? 0);
           $timeRaw = (string)($body['scheduled_time'] ?? '');
           $normalizedTime = $this->normalizeDateTime($timeRaw);

           // Accept patient details for auto-create when patient_id is missing or not found
           $patientName = trim((string)($body['name'] ?? $body['patient_name'] ?? ''));
           $patientEmail = trim((string)($body['email'] ?? $body['patient_email'] ?? ''));
           $patientPhone = trim((string)($body['phone'] ?? $body['patient_phone'] ?? ''));

            if (!$doctor_id) {
                return Response::json(['error' => 'Missing doctor_id'], 400);
            }
            if (!$normalizedTime) {
                return Response::json(['error' => 'Invalid scheduled_time format'], 400);
            }

            // Validate doctor exists
            $doctorsTbl = Database::table('doctors');
            $stmt = $pdo->prepare("SELECT doctor_id, status FROM {$doctorsTbl} WHERE doctor_id = :id LIMIT 1");
            $stmt->execute([':id' => $doctor_id]);
            $docRow = $stmt->fetch();
            if (!$docRow) {
                return Response::json(['error' => 'Invalid doctor_id (not found)'], 400);
            }

            $autoCreatedPatient = false;
            $patientsTbl = Database::table('patients');

            $pdo->beginTransaction();
            try {
                // If patient_id is provided, verify it exists; otherwise auto-create if details provided
                if ($patient_id > 0) {
                    $stmt = $pdo->prepare("SELECT patient_id FROM {$patientsTbl} WHERE patient_id = :pid LIMIT 1");
                    $stmt->execute([':pid' => $patient_id]);
                    $pRow = $stmt->fetch();
                    if (!$pRow) {
                        // Allow auto-create when patient_id invalid but details provided
                        if (!$patientName && !$patientEmail) {
                            $pdo->rollBack();
                            return Response::json(['error' => 'Invalid patient_id (not found) and missing patient details for auto-create'], 400);
                        }
                        $patient_id = 0; // force auto-create
                    }
                }

                if ($patient_id === 0) {
                    // If we have user_id, try to map to patient_id
                    if ($user_id > 0) {
                        $pt = Database::table('patients');
                        $stmt = $pdo->prepare("SELECT patient_id FROM {$pt} WHERE user_id = :uid LIMIT 1");
                        $stmt->execute([':uid' => $user_id]);
                        $row = $stmt->fetch();
                        if ($row && isset($row['patient_id'])) {
                            $patient_id = (int)$row['patient_id'];
                        }
                    }
                    // If we have an email, try to find an existing patient first
                    if ($patient_id === 0 && $patientEmail) {
                        $patients = new PatientModel();
                        $existing = $patients->findByEmail($patientEmail);
                        if ($existing && isset($existing['patient_id'])) {
                            $patient_id = (int)$existing['patient_id'];
                        }
                    }

                    if ($patient_id === 0) {
                        // Need at least a name or email to create a user/patient
                        if (!$patientName && !$patientEmail) {
                            $pdo->rollBack();
                            return Response::json(['error' => 'Missing patient details (name or email required)'], 400);
                        }

                        // Try to reuse existing user by email
                        $users = new UserModel();
                        $existingUserId = null;
                        if ($patientEmail) {
                            $u = $users->findByUsernameOrEmail($patientEmail);
                            if ($u && isset($u['user_id'])) { $existingUserId = (int)$u['user_id']; }
                        }
                        if ($existingUserId) {
                            // Do not allow booking if the email belongs to a user with doctor role
                            if (isset($u['role']) && strtolower((string)$u['role']) === 'doctor') {
                                $pdo->rollBack();
                                return Response::json(['error' => 'User with this email is a doctor and cannot be booked as a patient'], 400);
                            }
                            $userId = $existingUserId;
                        } else {
                            // Create user with unique username
                            $baseUsername = $patientName ?: ($patientEmail ?: 'patient');
                            $tryUsername = $baseUsername;
                            $suffix = 1;
                            while ($users->findByUsernameOrEmail($tryUsername)) {
                                $suffix++;
                                $tryUsername = $baseUsername . $suffix;
                            }
                            $userId = $users->createUser([
                                'username' => $tryUsername,
                                'password' => '0000', // NOTE: plain for demo
                                'role' => 'patient',
                                'email' => $patientEmail ?: null,
                            ]);
                        }
                        // Create patient row
                        $patients = $patients ?? new PatientModel();
                        $patient_id = $patients->create([
                            'user_id' => $userId,
                            'name' => $patientName ?: ($patientEmail ?: 'patient'),
                            'email' => $patientEmail ?: null,
                            'phone' => $patientPhone ?: '-',
                        ]);
                        $autoCreatedPatient = true;
                    }
                }

                // Validate: patient must not be a doctor user
                try {
                    $usersTbl = Database::table('users');
                    $patientsTbl = Database::table('patients');
                    $stmtChk = $pdo->prepare("SELECT u.role FROM {$patientsTbl} p JOIN {$usersTbl} u ON u.user_id = p.user_id WHERE p.patient_id = :pid LIMIT 1");
                    $stmtChk->execute([':pid' => $patient_id]);
                    $r = $stmtChk->fetch();
                    if ($r && strtolower((string)($r['role'] ?? '')) === 'doctor') {
                        $pdo->rollBack();
                        return Response::json(['error' => 'Doctors cannot be booked as patients'], 400);
                    }
                } catch (Throwable $e) { /* ignore, will proceed; other checks exist */ }

                // Block creating a new appointment if patient already has an active one in waiting or pending
                try {
                    $apptTbl = Database::table('appointments');
                    $stmtDup = $pdo->prepare("SELECT COUNT(1) AS c FROM {$apptTbl} WHERE patient_id = :pid AND status IN ('waiting','pending')");
                    $stmtDup->execute([':pid' => $patient_id]);
                    $dupCount = (int)($stmtDup->fetch()['c'] ?? 0);
                    if ($dupCount > 0) {
                        $pdo->rollBack();
                        return Response::json(['error' => 'Patient already has an active appointment (waiting or pending)'], 400);
                    }
                } catch (Throwable $e) { /* ignore - default to allowing if check fails */ }

                // Create appointment and queue records
                $appointments = new AppointmentModel();
                $queue = new QueueModel();
                $queueNum = $queue->nextQueueNumber();
                // If the doctor is currently assigned to other patients (has active queue/appointments), and we auto-created this patient,
// then mark this new appointment as 'waiting'; otherwise leave as 'pending'.
$apptTbl = Database::table('appointments');
$stmtBusy = $pdo->prepare("SELECT COUNT(1) AS c FROM {$apptTbl} WHERE doctor_id = :did AND status IN ('pending','called','in-consultation')");
$stmtBusy->execute([':did' => $doctor_id]);
$busyCount = (int)($stmtBusy->fetch()['c'] ?? 0);
$doctorBusy = $busyCount > 0;
$initialStatus = $doctorBusy ? 'waiting' : 'pending';
$appointment_id = $appointments->create($patient_id, $doctor_id, $normalizedTime, $initialStatus, $queueNum);
                $queue->enqueue($appointment_id, $queueNum, null);

                $pdo->commit();
                return Response::json([
                    'appointment_id' => $appointment_id,
                    'queue_number' => $queueNum,
                    'scheduled_time' => $normalizedTime,
                    'status' => $initialStatus,
                    'patient_id' => $patient_id,
                    'auto_created_patient' => $autoCreatedPatient,
                ], 201);
            } catch (PDOException $e) {
                $pdo->rollBack();
                $code = $e->getCode();
                $msg = $e->getMessage();
                if ($code === '23000') { // SQLSTATE constraint violation
                    return Response::json(['error' => 'DB constraint violation', 'details' => $msg], 400);
                }
                return Response::json(['error' => 'DB error', 'details' => $msg], 500);
            } catch (Throwable $e) {
                $pdo->rollBack();
                return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
            }
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }

    public function delete(int $id)
    {
        $appointments = new AppointmentModel();
        $queue = new QueueModel();
        $queue->removeByAppointment($id);
        $ok = $appointments->delete($id);
        return Response::json(['success' => $ok]);
    }

    public function complete(int $id)
    {
        try {
            $appointments = new AppointmentModel();
            $queue = new QueueModel();
            // Update status to completed and remove from queue
            $ok = $this->updateStatus($id, 'completed');
            $queue->removeByAppointment($id);
            return Response::json(['success' => (bool)$ok, 'appointment_id' => $id, 'status' => 'completed']);
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }

    public function statusUpdate(int $id)
    {
        try {
            // Support both JSON and form-urlencoded like AuthController::updateUser
            $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
            $isJson = stripos($contentType, 'application/json') !== false;
            if ($isJson) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            } else {
                $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
            }
            $status = strtolower(trim((string)($body['status'] ?? $body['new_status'] ?? '')));
            if ($status === '') {
                return Response::json(['error' => 'missing_status'], 400);
            }
            $allowed = ['pending','called','in-consultation','completed','cancelled'];
            if (!in_array($status, $allowed, true)) {
                return Response::json(['error' => 'invalid_status', 'allowed' => $allowed], 400);
            }

            $ok = $this->updateStatus($id, $status);

            if (in_array($status, ['completed','cancelled'], true)) {
                $queue = new QueueModel();
                $queue->removeByAppointment($id);
            }
            return Response::json(['success' => (bool)$ok, 'appointment_id' => $id, 'status' => $status]);
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }

    public function current()
    {
        $patient_id = (int)($_GET['patient_id'] ?? 0);
        $user_id = (int)($_GET['user_id'] ?? 0);
        try {
            if (!$patient_id && $user_id) {
                $pdo = Database::getConnection();
                $patientsTbl = Database::table('patients');
                $stmt = $pdo->prepare("SELECT patient_id FROM {$patientsTbl} WHERE user_id = :uid LIMIT 1");
                $stmt->execute([':uid' => $user_id]);
                $row = $stmt->fetch();
                if ($row && isset($row['patient_id'])) {
                    $patient_id = (int)$row['patient_id'];
                }
            }
            if (!$patient_id) {
                return Response::json(['error' => 'Missing patient_id'], 400);
            }
            $appointments = new AppointmentModel();
            $data = $appointments->getCurrentForPatient($patient_id);
            return Response::json($data ?: []);
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }
}
