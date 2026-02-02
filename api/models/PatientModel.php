<?php

require_once __DIR__ . '/../core/Database.php';

class PatientModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function findByEmail(string $email): ?array
    {
        $tbl = Database::table('patients');
        $stmt = $this->db->prepare("SELECT * FROM {$tbl} WHERE email = :e");
        $stmt->execute([':e' => $email]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $tbl = Database::table('patients');
        $stmt = $this->db->prepare("INSERT INTO {$tbl} (user_id, name, email, phone) VALUES (:uid, :n, :e, :ph)");
        $stmt->execute([
            ':uid' => $data['user_id'],
            ':n'   => $data['name'],
            ':e'   => $data['email'],
            ':ph'  => $data['phone'],
        ]);
        return (int)$this->db->lastInsertId();
    }
}
