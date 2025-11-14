<?php
// Front Controller
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Router.php';
require_once __DIR__ . '/core/Database.php';

require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/AppointmentsController.php';
require_once __DIR__ . '/controllers/MetaController.php';
require_once __DIR__ . '/controllers/DoctorsController.php';
require_once __DIR__ . '/controllers/QueueController.php';

$router = new Router();

$auth = new AuthController();
$appt = new AppointmentsController();
$meta = new MetaController();
$queue = new QueueController();
$doctorsCtl = new DoctorsController();

// Auth
$router->add('POST', '/auth/register', fn() => $auth->register());
$router->add('POST', '/auth/login', fn() => $auth->login());
$router->add('GET', '/users', fn() => $auth->listUsers());

// Meta
$router->add('GET', '/departments', fn() => $meta->departments());
$router->add('GET', '/doctors', fn() => $meta->doctors());
// Doctors
$router->add('POST', '/doctors/status', fn() => $doctorsCtl->updateStatus());

// Appointments
$router->add('GET', '/appointments', fn() => $appt->list());
$router->add('POST', '/appointments', fn() => $appt->create());
$router->add('DELETE', '/appointments/{id}', fn($id) => $appt->delete((int)$id));
$router->add('GET', '/appointments/current', fn() => $appt->current());
$router->add('GET', '/appointments/today-count', fn() => $appt->countToday());
// Update only scheduled_time using id from query/body
$router->add('POST', '/appointments/update-time', function () use ($appt) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $appt->updateScheduledTime($id);
});
// Update appointment using id from query/body (same id style as delete)
$router->add('POST', '/appointments/update', function () use ($appt) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $appt->update($id);
});
// Permissive update route (mirrors users/update) - accepts id in query or body
$router->add('POST', '/appointments/status', function () use ($appt) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $appt->statusUpdate($id);
});
// Permissive delete route (mirrors users/delete)
$router->add('POST', '/appointments/delete', function () use ($appt) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $appt->delete($id);
});

// Users management
$router->add('GET', '/users/{id}', fn($id) => (new UserModel())->getById((int)$id));
$router->add('PUT', '/users/{id}', fn($id) => $auth->updateUser((int)$id));
$router->add('PATCH', '/users/{id}', fn($id) => $auth->updateUser((int)$id));
$router->add('POST', '/users/{id}/update', fn($id) => $auth->updateUser((int)$id));
$router->add('DELETE', '/users/{id}', fn($id) => $auth->deleteUser((int)$id));
// Permissive fallbacks that avoid path params/method restrictions
$router->add('POST', '/users/delete', function () use ($auth) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $auth->deleteUser($id);
});
$router->add('POST', '/users/update', function () use ($auth) {
    // ContentType handling will be inside AuthController::updateUser

    $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($_POST['id'] ?? 0);
    if (!$id) return Response::json(['error' => 'missing_id'], 400);
    return $auth->updateUser($id);
});
$router->add('POST', '/users/{id}/delete', fn($id) => $auth->deleteUser((int)$id));

// Queue
$router->add('GET', '/queue', fn() => $queue->list());
$router->add('POST', '/queue/emergency', fn() => $queue->emergency());
$router->add('POST', '/queue/backfill', fn() => $queue->backfill());

// Admin stats
$router->add('GET', '/admin/activities', function () {
    try {
        $pdo = Database::getConnection();
        $users = Database::table('users');
        $appts = Database::table('appointments');

        // Query params: limit, offset, from, to
        $limit = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 50;
        $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;
        $fromTs = null; $toTs = null;
        if (!empty($_GET['from'])) { $t = strtotime($_GET['from']); if ($t !== false) $fromTs = $t; }
        if (!empty($_GET['to'])) { $t = strtotime($_GET['to']); if ($t !== false) $toTs = $t; }

        $events = [];

        // Users activity
        try {
            $where = [];
            if ($fromTs !== null) { $where[] = "created_at >= :from"; }
            if ($toTs !== null) { $where[] = "created_at <= :to"; }
            $sql = "SELECT user_id, username, role, created_at FROM {$users}";
            if ($where) { $sql .= " WHERE " . implode(" AND ", $where); }
            $sql .= " ORDER BY created_at DESC LIMIT 1000"; // cap per source before merge
            $stmt = $pdo->prepare($sql);
            if ($fromTs !== null) { $stmt->bindValue(':from', date('Y-m-d H:i:s', $fromTs)); }
            if ($toTs !== null) { $stmt->bindValue(':to', date('Y-m-d H:i:s', $toTs)); }
            $stmt->execute();
            foreach ($stmt as $row) {
                $events[] = [
                    'id' => 'user_' . $row['user_id'],
                    'type' => 'user_signup',
                    'description' => 'New ' . $row['role'] . ' registered',
                    'user' => $row['username'],
                    'time' => $row['created_at'],
                    'status' => 'success',
                ];
            }
        } catch (Throwable $e) { /* ignore */ }

        // Appointments activity
        try {
            $where = [];
            // Prefer created_at filter if present, otherwise scheduled_time
            if ($fromTs !== null) { $where[] = "(created_at >= :from OR (created_at IS NULL AND scheduled_time >= :from))"; }
            if ($toTs !== null) { $where[] = "(created_at <= :to OR (created_at IS NULL AND scheduled_time <= :to))"; }
            $sql = "SELECT appointment_id, patient_id, doctor_id, status, scheduled_time, created_at FROM {$appts}";
            if ($where) { $sql .= " WHERE " . implode(" AND ", $where); }
            $sql .= " ORDER BY COALESCE(created_at, scheduled_time) DESC LIMIT 1000";
            $stmt = $pdo->prepare($sql);
            if ($fromTs !== null) { $stmt->bindValue(':from', date('Y-m-d H:i:s', $fromTs)); }
            if ($toTs !== null) { $stmt->bindValue(':to', date('Y-m-d H:i:s', $toTs)); }
            $stmt->execute();
            foreach ($stmt as $row) {
                $time = $row['created_at'] ?: $row['scheduled_time'];
                $events[] = [
                    'id' => 'appt_' . $row['appointment_id'],
                    'type' => 'appointment',
                    'description' => 'Appointment ' . strtolower($row['status']),
                    'user' => 'PID:' . $row['patient_id'] . ' / DID:' . $row['doctor_id'],
                    'time' => $time,
                    'status' => $row['status'] === 'cancelled' ? 'pending' : 'success',
                ];
            }
        } catch (Throwable $e) { /* ignore */ }

        // Sort by time desc
        usort($events, function ($a, $b) {
            return strcmp($b['time'], $a['time']);
        });

        // Apply pagination
        $paged = array_slice($events, $offset, $limit);

        return Response::json($paged);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

// Admin stats
$router->add('GET', '/admin/hospital-info', function () {
    try {
        $pdo = Database::getConnection();
        $tbl = Database::table('hospital_information');
        $sql = "SELECT id, Hospital_Name, Email, Phone FROM {$tbl} ORDER BY id ASC LIMIT 1";
        $row = $pdo->query($sql)->fetch();
        if (!$row) {
            return Response::json([ 'id' => null, 'Hospital_Name' => '', 'Email' => null, 'Phone' => null ]);
        }
        return Response::json($row);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

$router->add('POST', '/admin/hospital-info', function () {
    try {
        $pdo = Database::getConnection();
        $tbl = Database::table('hospital_information');
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        if (stripos($contentType, 'application/json') !== false) {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
        } else {
            $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
        }
        $name = trim($body['Hospital_Name'] ?? $body['hospital_name'] ?? '');
        $email = trim($body['Email'] ?? $body['email'] ?? '') ?: null;
        $phone = trim($body['Phone'] ?? $body['phone'] ?? '') ?: null;

        // Upsert first row
        $row = $pdo->query("SELECT id FROM {$tbl} ORDER BY id ASC LIMIT 1")->fetch();
        if ($row) {
            $stmt = $pdo->prepare("UPDATE {$tbl} SET Hospital_Name = :n, Email = :e, Phone = :p WHERE id = :id");
            $stmt->execute([':n' => $name, ':e' => $email, ':p' => $phone, ':id' => $row['id']]);
            $id = (int)$row['id'];
        } else {
            $stmt = $pdo->prepare("INSERT INTO {$tbl} (Hospital_Name, Email, Phone) VALUES (:n, :e, :p)");
            $stmt->execute([':n' => $name, ':e' => $email, ':p' => $phone]);
            $id = (int)$pdo->lastInsertId();
        }
        return Response::json(['id' => $id, 'Hospital_Name' => $name, 'Email' => $email, 'Phone' => $phone]);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

$router->add('GET', '/admin/stats', function () {
    try {
        $pdo = Database::getConnection();
        $usersTbl = Database::table('users');
        $doctorsTbl = Database::table('doctors');
        $patientsTbl = Database::table('patients');

        $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM {$usersTbl}")->fetchColumn();

        // Prefer users.role for consistency; fallback to doctors table if exists and users has 0 doctors
        $totalDoctors = 0;
        try { $totalDoctors = (int)$pdo->query("SELECT COUNT(*) FROM {$usersTbl} WHERE role = 'doctor'")->fetchColumn(); } catch (Throwable $e) { $totalDoctors = 0; }
        if ($totalDoctors === 0) {
            try { $totalDoctors = (int)$pdo->query("SELECT COUNT(*) FROM {$doctorsTbl}")->fetchColumn(); } catch (Throwable $e) { /* ignore */ }
        }

        $totalPatients = 0;
        try { $totalPatients = (int)$pdo->query("SELECT COUNT(*) FROM {$usersTbl} WHERE role = 'patient'")->fetchColumn(); } catch (Throwable $e) { $totalPatients = 0; }
        if ($totalPatients === 0) {
            try { $totalPatients = (int)$pdo->query("SELECT COUNT(*) FROM {$patientsTbl}")->fetchColumn(); } catch (Throwable $e) { /* ignore */ }
        }

        // Define "active now" as users created in the last 60 minutes
        $activeNow = 0;
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM {$usersTbl} WHERE created_at >= (NOW() - INTERVAL 60 MINUTE)");
            $activeNow = (int)$stmt->fetchColumn();
        } catch (Throwable $e) { $activeNow = 0; }

        // Compute system health based on per-doctor efficiency for today
        $health = 'good';
        try {
            $apptsTbl = Database::table('appointments');
            // Aggregate today's appointments per doctor
            $sql = "SELECT doctor_id,
                           COUNT(*) AS total,
                           SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) AS completed
                    FROM {$apptsTbl}
                    WHERE DATE(scheduled_time) = CURDATE()
                    GROUP BY doctor_id";
            $rows = $pdo->query($sql)->fetchAll();
            $effs = [];
            foreach ($rows as $r) {
                $total = (int)($r['total'] ?? 0);
                $completed = (int)($r['completed'] ?? 0);
                if ($total > 0) {
                    $effs[] = $completed / max(1, $total); // 0..1
                }
            }
            if (count($effs) > 0) {
                $bins = ['lt50' => 0, '50to75' => 0, 'gte75' => 0];
                foreach ($effs as $e) {
                    if ($e < 0.5) $bins['lt50']++;
                    elseif ($e < 0.75) $bins['50to75']++;
                    else $bins['gte75']++;
                }
                $totalDoctorsWithAppts = array_sum($bins);
                // Determine primary bin
                arsort($bins);
                $primary = array_key_first($bins);
                // Perfect if at least 90% of doctors are >= 75%
                $propGte75 = $totalDoctorsWithAppts > 0 ? ($bins['gte75'] ?? 0) / $totalDoctorsWithAppts : 0;
                if ($propGte75 >= 0.9) {
                    $health = 'perfect';
                } else {
                    if ($primary === 'gte75') $health = 'good';
                    elseif ($primary === '50to75') $health = 'moderate';
                    else $health = 'bad';
                }
            }
        } catch (Throwable $e) {
            // Keep default health if computation fails
        }
        return Response::json([
            'total_users' => $totalUsers,
            'total_doctors' => $totalDoctors,
            'total_patients' => $totalPatients,
            'active_now' => $activeNow,
            'health' => $health,
        ]);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage(), 'health' => 'bad'], 500);
    }
});

// Diagnostics
$router->add('GET', '/ping', fn() => ['ok' => true, 'time' => date('c')]);
$router->add('GET', '/__debug', function () {
    $cfg = require __DIR__ . '/config.php';
    $dbName = $cfg['db']['dbname'] ?? null;
    $info = [
        'php' => PHP_VERSION,
        'script' => __FILE__,
        'cwd' => getcwd(),
        'opcache_enabled' => ini_get('opcache.enable'),
        'opcache_cli_enabled' => ini_get('opcache.enable_cli'),
        'loaded_extensions' => get_loaded_extensions(),
    ];
    try {
        $pdo = Database::getConnection();
        $info['selected_db'] = $pdo->query('SELECT DATABASE()')->fetchColumn();
        $tables = [];
        $sql = $dbName ? 'SHOW TABLES FROM `'.str_replace('`','``',$dbName).'`' : 'SHOW TABLES';
        foreach ($pdo->query($sql) as $row) { $tables[] = array_values($row)[0]; }
        $info['db'] = 'connected';
        $info['tables'] = $tables;

        // File paths + hashes to confirm correct code loaded
        $dbFile = realpath(__DIR__ . '/core/Database.php');
        $docFile = realpath(__DIR__ . '/models/DoctorModel.php');
        $info['files'] = [
            'Database.php' => [ 'path' => $dbFile, 'mtime' => $dbFile ? filemtime($dbFile) : null, 'md5' => $dbFile ? md5_file($dbFile) : null ],
            'DoctorModel.php' => [ 'path' => $docFile, 'mtime' => $docFile ? filemtime($docFile) : null, 'md5' => $docFile ? md5_file($docFile) : null ],
        ];

        // Try qualified count
        try {
            $tbl = Database::table('doctors');
            $info['doctors_count'] = (int)$pdo->query("SELECT COUNT(*) FROM {$tbl}")->fetchColumn();
        } catch (Throwable $e) {
            $info['doctors_count'] = 'err: ' . $e->getMessage();
        }

        return $info;
    } catch (Throwable $e) {
        $info['db'] = 'error';
        $info['message'] = $e->getMessage();
        return Response::json($info, 500);
    }
});

$router->add('GET', '/admin/backup', function () {
    try {
        // Ensure connection and current DB name
        $pdo = Database::getConnection();
        // Force backup of the smart_queue_management database
        $dbName = 'smart_queue_management';
        $safeDb = str_replace('`','``',$dbName);
        // Ensure the connection is using the target DB
        $pdo->exec('USE `'.$safeDb.'`');

        // Header to trigger download in browser
        $filename = 'backup_' . preg_replace('/[^a-zA-Z0-9_-]/','_', $dbName) . '_' . date('Ymd_His') . '.sql';
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        // Stream a SQL dump. Use SHOW CREATE TABLE and SELECT * to reconstruct data.
        echo "-- SQL Dump for {$dbName} generated at " . date('c') . "\n";
        echo "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n";

        // List tables
        $safeDb = str_replace('`','``',$dbName);
        $tables = [];
        foreach ($pdo->query('SHOW TABLES FROM `'.$safeDb.'`') as $row) { $tables[] = array_values($row)[0]; }

        foreach ($tables as $table) {
            $safeTable = str_replace('`','``',$table);
            // Drop + create
            echo "--\n-- Table structure for table `{$table}`\n--\n\n";
            echo "DROP TABLE IF EXISTS `{$safeTable}`;\n";
            $stmt = $pdo->query('SHOW CREATE TABLE `'.$safeDb.'`.`'.$safeTable.'`');
            $createRow = $stmt->fetch(PDO::FETCH_ASSOC);
            $createSql = $createRow['Create Table'] ?? $createRow['Create Table'] ?? null;
            if (!$createSql) {
                // Fallback: try generic create
                $createSql = $stmt->fetchColumn(1);
            }
            if ($createSql) {
                echo $createSql . ";\n\n";
            }

            // Data dump
            echo "--\n-- Dumping data for table `{$table}`\n--\n\n";
            $dataStmt = $pdo->query('SELECT * FROM `'.$safeDb.'`.`'.$safeTable.'`');
            $first = true;
            while ($row = $dataStmt->fetch(PDO::FETCH_ASSOC)) {
                if ($first) {
                    echo "LOCK TABLES `{$safeTable}` WRITE;\n";
                    echo "ALTER TABLE `{$safeTable}` DISABLE KEYS;\n";
                    $first = false;
                }
                $cols = array_map(function($c){ return '`'.str_replace('`','``',$c).'`'; }, array_keys($row));
                $vals = array_map(function($v) use ($pdo){
                    if ($v === null) return 'NULL';
                    // Quote via PDO::quote; if it returns false, fallback manual quoting
                    $q = $pdo->quote((string)$v);
                    if ($q === false) {
                        $q = "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], (string)$v) . "'";
                    }
                    return $q;
                }, array_values($row));
                echo "INSERT INTO `{$safeTable}` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ");\n";
            }
            if (!$first) {
                echo "ALTER TABLE `{$safeTable}` ENABLE KEYS;\n";
                echo "UNLOCK TABLES;\n";
            }
            echo "\n";
        }

        echo "SET FOREIGN_KEY_CHECKS=1;\n";
        return null; // We've streamed the response
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

// Dangerous: erase database data (truncate tables). Protect behind proper auth in production
$router->add('POST', '/admin/erase', function () {
    try {
        $pdo = Database::getConnection();
        $dbName = 'smart_queue_management';
        $pdo->exec('USE `'.str_replace('`','``',$dbName).'`');

        // Disable FKs, truncate known tables
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $tables = [];
        foreach ($pdo->query('SHOW TABLES FROM `'.str_replace('`','``',$dbName).'`') as $row) { $tables[] = array_values($row)[0]; }
        foreach ($tables as $t) {
            // do not drop migration meta tables if any; here we wipe all
            $safeT = str_replace('`','``',$t);
            $pdo->exec('TRUNCATE TABLE `'.$safeT.'`');
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        return Response::json(['erased' => true]);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

$router->add('GET', '/admin/logs', function () {
    try {
        $phpLogLines = [];
        $candidates = [];
        $iniLog = ini_get('error_log');
        if ($iniLog && is_string($iniLog)) { $candidates[] = $iniLog; }
        $candidates[] = __DIR__ . '/../error.log';
        $candidates[] = __DIR__ . '/error.log';
        $candidates[] = sys_get_temp_dir() . '/php_errors.log';
        $logPath = null;
        foreach ($candidates as $p) { if ($p && @is_readable($p) && @is_file($p)) { $logPath = $p; break; } }
        if ($logPath) {
            $lines = @file($logPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            $phpLogLines = array_slice($lines, max(0, count($lines) - 500));
        }

        $dbDiag = [];
        try {
            $pdo = Database::getConnection();
            $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn();
            $version = $pdo->query('SELECT @@version')->fetchColumn();
            $threads = null; $uptime = null;
            try {
                $threads = $pdo->query("SHOW STATUS LIKE 'Threads_connected'")->fetch(PDO::FETCH_ASSOC)['Value'] ?? null;
                $uptime = $pdo->query("SHOW STATUS LIKE 'Uptime'")->fetch(PDO::FETCH_ASSOC)['Value'] ?? null;
            } catch (Throwable $e) { /* ignore */ }
            $dbDiag = [ 'database' => $dbName, 'version' => $version, 'threads_connected' => $threads, 'uptime' => $uptime ];
        } catch (Throwable $e) {
            $dbDiag = [ 'error' => $e->getMessage() ];
        }

        $server = [ 'php' => PHP_VERSION, 'time' => date('c'), 'error_log_path' => $logPath ];
        return Response::json([ 'php_error_log' => $phpLogLines, 'db' => $dbDiag, 'server' => $server ]);
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

$router->add('GET', '/__dbinfo', function() {
    try {
        $pdo = Database::getConnection();
        $dbNow = $pdo->query('SELECT DATABASE()')->fetchColumn();
        $doctorsCount = null;
        try {
            $tbl = Database::table('doctors');
            $doctorsCount = (int)$pdo->query("SELECT COUNT(*) FROM {$tbl}")->fetchColumn();
        } catch (Throwable $e) {
            $doctorsCount = 'err: ' . $e->getMessage();
        }
        return [ 'database' => $dbNow, 'doctors_count' => $doctorsCount ];
    } catch (Throwable $e) {
        return Response::json(['error' => $e->getMessage()], 500);
    }
});

// Allow no-rewrite fallback: /api/index.php?r=/path
$override = isset($_GET['r']) ? (string)$_GET['r'] : null;
$router->dispatch($override);
