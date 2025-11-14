<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Database.php';

class CustomerSatisfactionController
{
    public function insert()
    {
        try {
            // Parse body (JSON or form)
            $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
            if (stripos($contentType, 'application/json') !== false) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            } else {
                $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
            }

            $rate = isset($body['rate']) ? (int)$body['rate'] : (isset($body['rating']) ? (int)$body['rating'] : 0);
            $userId = isset($body['user_id']) ? (int)$body['user_id'] : (isset($body['userId']) ? (int)$body['userId'] : 0);
            $patientId = isset($body['patient_id']) ? (int)$body['patient_id'] : (isset($body['patientId']) ? (int)$body['patientId'] : 0);

            if ($rate < 1 || $rate > 5) {
                return Response::json(['error' => 'Invalid rate. Must be 1..5'], 400);
            }

            $pdo = Database::getConnection();
            $patientsTbl = Database::table('patients');
            $csatTbl = Database::table('customer_satisfaction');

            // Resolve patient_id from user_id if not provided
            if (!$patientId && $userId) {
                try {
                    $stmt = $pdo->prepare("SELECT patient_id FROM {$patientsTbl} WHERE user_id = :uid LIMIT 1");
                    $stmt->execute([':uid' => $userId]);
                    $row = $stmt->fetch();
                    if ($row && isset($row['patient_id'])) {
                        $patientId = (int)$row['patient_id'];
                    }
                } catch (Throwable $e) { /* ignore resolution errors here */ }
            }

            if (!$patientId) {
                return Response::json(['error' => 'Unable to resolve patient_id'], 400);
            }

            // Upsert: if a record exists for this patient, update it; otherwise insert
            $check = $pdo->prepare("SELECT id FROM {$csatTbl} WHERE patient_id = :pid ORDER BY id DESC LIMIT 1");
            $check->execute([':pid' => $patientId]);
            $existing = $check->fetch();

            if ($existing && isset($existing['id'])) {
                $id = (int)$existing['id'];
                $upd = $pdo->prepare("UPDATE {$csatTbl} SET rate = :rate WHERE id = :id");
                $upd->execute([':rate' => $rate, ':id' => $id]);
                // updated_date column will auto-update due to ON UPDATE clause
                return Response::json(['id' => $id, 'patient_id' => $patientId, 'rate' => $rate, 'action' => 'updated', 'success' => true]);
            } else {
                $ins = $pdo->prepare("INSERT INTO {$csatTbl} (patient_id, rate) VALUES (:pid, :rate)");
                $ins->execute([':pid' => $patientId, ':rate' => $rate]);
                $id = (int)$pdo->lastInsertId();
                return Response::json(['id' => $id, 'patient_id' => $patientId, 'rate' => $rate, 'action' => 'inserted', 'success' => true]);
            }
        } catch (Throwable $e) {
            return Response::json(['error' => $e->getMessage()], 500);
        }
    }
}
