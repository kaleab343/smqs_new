<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../models/DoctorModel.php';
require_once __DIR__ . '/../core/Database.php';

class MetaController
{
    public function departments()
    {
        // List specializations from users table where present (e.g., doctors in users)
        try {
            $pdo = Database::getConnection();
            $users = Database::table('users');
            $sql = "SELECT DISTINCT specialization FROM {$users} WHERE specialization IS NOT NULL AND specialization != '' ORDER BY specialization";
            $stmt = $pdo->query($sql);
            $rows = $stmt->fetchAll();
            $deps = array_map(function ($r) {
                $s = $r['specialization'];
                return ['id' => $s, 'name' => $s];
            }, $rows);
            // Fallback: if empty, use doctors table
            if (empty($deps)) {
                $m = new DoctorModel();
                $alt = $m->listSpecializations();
                $deps = array_map(fn($r) => ['id' => $r['specialization'], 'name' => $r['specialization']], $alt);
            }
            return Response::json($deps);
        } catch (Throwable $e) {
            // Fallback hard to doctors list on error
            try {
                $m = new DoctorModel();
                $alt = $m->listSpecializations();
                $deps = array_map(fn($r) => ['id' => $r['specialization'], 'name' => $r['specialization']], $alt);
                return Response::json($deps);
            } catch (Throwable $e2) {
                return Response::json(['error' => 'Failed to list specializations', 'details' => $e->getMessage()], 500);
            }
        }
    }

    public function doctors()
    {
        $spec = $_GET['specialization'] ?? null;
        $m = new DoctorModel();
        $rows = $m->getBySpecialization($spec ?: null);
        return Response::json($rows);
    }
}
