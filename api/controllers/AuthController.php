<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Database.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/PatientModel.php';
require_once __DIR__ . '/../models/DoctorModel.php';
require_once __DIR__ . '/../core/Jwt.php';

class AuthController
{
    // Create a user only in users table (no patients/doctors side-effects)
    public function createUserBasic()
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isJson = stripos($contentType, 'application/json') !== false;
        if ($isJson) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }
        $username = trim($body['username'] ?? $body['name'] ?? '');
        $email = trim($body['email'] ?? '');
        $password = (string)($body['password'] ?? '');
        $role = trim($body['role'] ?? 'patient');
        $specialization = isset($body['specialization']) ? (string)$body['specialization'] : '';
        if (!$username || !$email || !$password) {
            return Response::json(['error' => 'missing_fields'], 400);
        }
        $users = new UserModel();
        // Check duplicates
        $existing = $users->findByUsernameOrEmail($email) ?: $users->findByUsernameOrEmail($username);
        if ($existing) {
            return Response::json(['error' => 'duplicate', 'message' => 'Email or username already exists'], 409);
        }
        $pdo = Database::getConnection();
        try {
            $pdo->beginTransaction();
            $id = $users->createUser([
                'username' => $username,
                'email' => $email,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'role' => $role,
                'specialization' => ($role === 'doctor' && $specialization !== '') ? $specialization : null,
            ]);
            $row = (new UserModel())->getById($id);
            $pdo->commit();
            return Response::json($row, 201);
        } catch (Throwable $e) {
            try { if ($pdo->inTransaction()) $pdo->rollBack(); } catch (Throwable $ie) {}
            return Response::json(['error' => 'create_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function register()
    {
        // Support both JSON and form-urlencoded
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isJson = stripos($contentType, 'application/json') !== false;
        if ($isJson) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }

        $name = trim($body['name'] ?? $body['full_name'] ?? '');
        $email = trim($body['email'] ?? $body['email_address'] ?? '');
        $password = (string)($body['password'] ?? $body['pass'] ?? '');
        $phone = trim($body['phone'] ?? '');
        $role = trim($body['role'] ?? $body['user_role'] ?? 'patient');
        $specialization = trim($body['specialization'] ?? '');

        if (!$name || !$email || !$password) {
            return Response::json(['error' => 'Missing fields'], 400);
        }
        if ($phone === '') { $phone = '-'; }

        $users = new UserModel();
        $patients = new PatientModel();
        $doctors = new DoctorModel();
        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        // Reject duplicate users by email/username in users table
        $existing = $users->findByUsernameOrEmail($email) ?: $users->findByUsernameOrEmail($name ?: $email);
        if ($existing) {
            return Response::json(['error' => 'Email already registered'], 409);
        }

        $patientId = null;
        if ($role === 'patient') {
            if ($patients->findByEmail($email)) {
                return Response::json(['error' => 'Email already registered'], 409);
            }
        }

        try {
            $userId = $users->createUser([
                'username' => ($name ?: $email), // store full name as username when provided
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'role' => $role ?: 'patient',
                'email' => $email,
                'specialization' => ($role === 'doctor' && $specialization !== '') ? $specialization : null,
            ]);
        } catch (Throwable $e) {
            try { if ($pdo->inTransaction()) $pdo->rollBack(); } catch (Throwable $ie) {}
            return Response::json(['error' => 'create_failed', 'message' => $e->getMessage()], 500);
        }

        if ($role === 'patient') {
            $patientId = $patients->create([
                'user_id' => $userId,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
            ]);
        }

        if ($role === 'doctor') {
            $doctors->create([
                'name' => $name ?: $email,
                'specialization' => $specialization ?: ($body['specialization'] ?? ''),
                'status' => 'ACTIVE',
                'email' => $email,
            ]);
        }

        try { if ($pdo->inTransaction()) $pdo->commit(); } catch (Throwable $ie) {}

        // Issue JWT on register
        $iss = ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $secret = getenv('JWT_SECRET') ?: 'dev_secret_change_me';
        $exp = time() + (int)(getenv('JWT_TTL') ?: 3600);
        $payload = [ 'sub' => (int)$userId, 'role' => $role ?: 'patient', 'email' => $email, 'iss' => $iss, 'iat' => time(), 'exp' => $exp ];
        $token = Jwt::encode($payload, $secret, 'HS256');

        return Response::json([
            'message' => 'Registered',
            'user_id' => $userId,
            'patient_id' => $patientId,
            'role' => $role,
            'token' => $token,
            'token_expires' => $exp,
        ], 201);
    }

    public function listUsers()
    {
        $users = new UserModel();
        $rows = $users->getAll();
        return Response::json(array_map(function($r) {
            return [
                'user_id' => (int)$r['user_id'],
                'username' => $r['username'],
                'email' => $r['email'],
                'role' => $r['role'],
                
                'created_at' => $r['created_at'],
                'updated_at' => $r['updated_at'] ?? null,
                'specialization' => $r['specialization'] ?? null,
            ];
        }, $rows));
    }

    public function updateUser($id)
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isJson = stripos($contentType, 'application/json') !== false;
        if ($isJson) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }
        $data = [
            'username' => trim($body['username'] ?? ''),
            'email' => trim($body['email'] ?? ''),
            'role' => trim($body['role'] ?? ''),
            'specialization' => $body['specialization'] ?? null,
            'password' => (isset($body['password']) && $body['password'] !== '') ? password_hash((string)$body['password'], PASSWORD_DEFAULT) : '',
        ];
        $users = new UserModel();
        $pdo = Database::getConnection();
        $pdo->beginTransaction();
        $ok = $users->updateUser((int)$id, $data);
        if (!$ok) { try { $pdo->rollBack(); } catch (Throwable $ie) {} return Response::json(['error' => 'Update failed'], 500); }

        // Sync role-specific tables (patients/doctors)
        $fresh = $users->getById((int)$id);
        try {
            if ($fresh && ($fresh['role'] ?? '') === 'doctor') {
                $name = $fresh['username'] ?? ($data['username'] ?? ($data['email'] ?? 'Doctor'));
                $email = $fresh['email'] ?? ($data['email'] ?? null);
                $spec = $fresh['specialization'] ?? ($data['specialization'] ?? '');
                $dt = Database::table('doctors');
                // Try update by email if available; otherwise upsert by name
                if ($email) {
                    $stmt = $pdo->prepare("SELECT doctor_id FROM {$dt} WHERE email = :e LIMIT 1");
                    $stmt->execute([':e' => $email]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $stmt = $pdo->prepare("UPDATE {$dt} SET name = :n, specialization = :s, status = 'ACTIVE' WHERE doctor_id = :id");
                        $stmt->execute([':n' => $name, ':s' => $spec ?: '', ':id' => (int)$row['doctor_id']]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO {$dt} (name, specialization, status, email) VALUES (:n, :s, 'ACTIVE', :e)");
                        $stmt->execute([':n' => $name, ':s' => $spec ?: '', ':e' => $email]);
                    }
                } else {
                    // Fallback by name
                    $stmt = $pdo->prepare("SELECT doctor_id FROM {$dt} WHERE name = :n LIMIT 1");
                    $stmt->execute([':n' => $name]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $stmt = $pdo->prepare("UPDATE {$dt} SET specialization = :s, status = 'ACTIVE' WHERE doctor_id = :id");
                        $stmt->execute([':s' => $spec ?: '', ':id' => (int)$row['doctor_id']]);
                    } else {
                        $stmt = $pdo->prepare("INSERT INTO {$dt} (name, specialization, status) VALUES (:n, :s, 'ACTIVE')");
                        $stmt->execute([':n' => $name, ':s' => $spec ?: '']);
                    }
                }
            }

            if ($fresh && ($fresh['role'] ?? '') === 'patient') {
                $pt = Database::table('patients');
                $name = $fresh['username'] ?? ($data['username'] ?? ($data['email'] ?? 'Patient'));
                $email = $fresh['email'] ?? ($data['email'] ?? null);
                $phone = '-';
                // Upsert patients by user_id
                $stmt = $pdo->prepare("SELECT patient_id FROM {$pt} WHERE user_id = :uid LIMIT 1");
                $stmt->execute([':uid' => (int)$id]);
                $row = $stmt->fetch();
                if ($row) {
                    $stmt = $pdo->prepare("UPDATE {$pt} SET name = :n, email = :e WHERE patient_id = :pid");
                    $stmt->execute([':n' => $name, ':e' => $email, ':pid' => (int)$row['patient_id']]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO {$pt} (user_id, name, email, phone) VALUES (:uid, :n, :e, :ph)");
                    $stmt->execute([':uid' => (int)$id, ':n' => $name, ':e' => $email, ':ph' => $phone]);
                }
            }
        } catch (Throwable $e) {
            try { if ($pdo->inTransaction()) $pdo->rollBack(); } catch (Throwable $ie) {}
            return Response::json(['error' => 'Update failed', 'details' => $e->getMessage()], 500);
        }

        try { if ($pdo->inTransaction()) $pdo->commit(); } catch (Throwable $ie) {}

        return Response::json($fresh);
    }

    public function deleteUser($id)
    {
        $users = new UserModel();
        $ok = $users->deleteUser((int)$id);
        if (!$ok) return Response::json(['error' => 'Delete failed'], 500);
        return Response::json(['deleted' => true]);
    }

    public function login()
    {
        // Support both JSON and form-urlencoded
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $isJson = stripos($contentType, 'application/json') !== false;
        if ($isJson) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }
        $identifier = trim($body['email'] ?? $body['username'] ?? '');
        $password = (string)($body['password'] ?? '');
        if (!$identifier || !$password) {
            return Response::json(['error' => 'Missing credentials'], 400);
        }

        $users = new UserModel();
        $user = $users->findByUsernameOrEmail($identifier);
        if (!$user) {
            return Response::json(['error' => 'Invalid credentials'], 401);
        }
        $stored = (string)($user['password'] ?? '');
        $valid = false;
        if ($stored !== '') {
            // If stored value looks like a bcrypt/argon hash, use password_verify
            if (preg_match('/^\$2y\$|^\$argon2/i', $stored)) {
                $valid = password_verify($password, $stored);
            } else {
                // Legacy: compare plain text then migrate to hashed
                $valid = hash_equals($stored, $password);
                if ($valid) {
                    try {
                        $hash = password_hash($password, PASSWORD_DEFAULT);
                        $users->updateUser((int)$user['user_id'], ['password' => $hash]);
                        $user['password'] = $hash;
                    } catch (Throwable $e) { /* ignore migration failure */ }
                }
            }
        }
        if (!$valid) {
            return Response::json(['error' => 'Invalid credentials'], 401);
        }

        // On successful login, update last activity timestamp
        try {
            $pdo = Database::getConnection();
            $usersTbl = Database::table('users');
            $stmtUpd = $pdo->prepare("UPDATE {$usersTbl} SET updated_at = NOW() WHERE user_id = :id");
            $stmtUpd->execute([':id' => (int)$user['user_id']]);
        } catch (Throwable $e) {
            // Do not fail login if timestamp update fails
        }

        // Attach patient_id if exists
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT patient_id FROM patients WHERE user_id = :uid');
        $stmt->execute([':uid' => $user['user_id']]);
        $row = $stmt->fetch();
        $patientId = $row ? (int)$row['patient_id'] : null;

        // Issue JWT
        $iss = ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $secret = getenv('JWT_SECRET') ?: 'dev_secret_change_me';
        $exp = time() + (int)(getenv('JWT_TTL') ?: 3600);
        $payload = [
            'sub' => (int)$user['user_id'],
            'role' => $user['role'] ?: 'patient',
            'email' => $user['email'] ?? null,
            'iss' => $iss,
            'iat' => time(),
            'exp' => $exp,
        ];
        $token = Jwt::encode($payload, $secret, 'HS256');

        return Response::json([
            'user_id' => (int)$user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'] ?? null,
            'role' => $user['role'] ?: 'patient',
            'patient_id' => $patientId,
            'token' => $token,
            'token_expires' => $exp,
        ]);
    }
}
