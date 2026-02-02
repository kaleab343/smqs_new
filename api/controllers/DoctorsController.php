<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../core/Database.php';

class DoctorsController
{
    private function normalizeStatus(string $input): string
    {
        $s = strtoupper(trim($input));
        // Accept a variety of forms for on break
        $inactiveAliases = ['ON_BREAK','ON BRECK','ON BREAk','BREAK','ONBREAK','INACTIVE','OFF','AWAY'];
        if ($s === 'ACTIVE') return 'ACTIVE';
        if (in_array($s, $inactiveAliases, true)) return 'INACTIVE';
        // default to INACTIVE for unknown non-empty strings
        return $s ? 'INACTIVE' : 'INACTIVE';
    }

    public function updateStatus()
    {
        try {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
            $isJson = stripos($contentType, 'application/json') !== false;
            if ($isJson) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            } else {
                $body = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);
            }

            $doctorId = isset($body['doctor_id']) ? (int)$body['doctor_id'] : (isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : 0);
            $email = trim((string)($body['email'] ?? $_GET['email'] ?? ''));
            $statusIn = (string)($body['status'] ?? $body['state'] ?? $body['availability'] ?? '');
            if ($statusIn === '') {
                return Response::json(['error' => 'missing_status'], 400);
            }
            $status = $this->normalizeStatus($statusIn);

            $pdo = Database::getConnection();
            $tbl = Database::table('doctors');

            if ($doctorId > 0) {
                $stmt = $pdo->prepare("UPDATE {$tbl} SET status = :s WHERE doctor_id = :id");
                $ok = $stmt->execute([':s' => $status, ':id' => $doctorId]);
            } elseif ($email !== '') {
                // Update by email
                $stmt = $pdo->prepare("UPDATE {$tbl} SET status = :s WHERE email = :e");
                $ok = $stmt->execute([':s' => $status, ':e' => $email]);
                // If no rows updated and email not found, try insert minimal record? Better to return not found
                if ($ok && $stmt->rowCount() === 0) {
                    return Response::json(['error' => 'doctor_not_found_for_email', 'email' => $email], 404);
                }
            } else {
                return Response::json(['error' => 'missing_identifier (doctor_id or email)'], 400);
            }

            return Response::json(['success' => (bool)$ok, 'status' => $status]);
        } catch (Throwable $e) {
            return Response::json(['error' => 'Server error', 'details' => $e->getMessage()], 500);
        }
    }
}
