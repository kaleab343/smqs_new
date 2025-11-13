<?php

require_once __DIR__ . '/../core/Database.php';

class DoctorModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(array $data): int
    {
        $tbl = Database::table('doctors');
        $sql = "INSERT INTO {$tbl} (name, specialization, status, email) VALUES (:n, :s, :st, :e)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':n' => $data['name'],
            ':s' => $data['specialization'] ?? '',
            ':st' => $data['status'] ?? 'ACTIVE',
            ':e' => $data['email'] ?? null,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function listSpecializations(): array
    {
        $tbl = Database::table('doctors');
        $sql = "SELECT DISTINCT specialization FROM {$tbl} WHERE status = 'ACTIVE'";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    public function getBySpecialization(?string $spec = null): array
    {
        $tbl = Database::table('doctors');
        if ($spec) {
            $stmt = $this->db->prepare("SELECT * FROM {$tbl} WHERE specialization = :s AND status = 'ACTIVE' ORDER BY name");
            $stmt->execute([':s' => $spec]);
            return $stmt->fetchAll();
        }
        $stmt = $this->db->query("SELECT * FROM {$tbl} WHERE status = 'ACTIVE' ORDER BY specialization, name");
        return $stmt->fetchAll();
    }
}
