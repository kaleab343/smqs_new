<?php

require_once __DIR__ . '/../core/Database.php';

class AppointmentModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    public function create(int $patient_id, int $doctor_id, string $scheduled_time, string $status = 'pending', ?int $queue_number = null): int
    {
        $tbl = Database::table('appointments');
        $stmt = $this->db->prepare(
            "INSERT INTO {$tbl} (patient_id, doctor_id, scheduled_time, status, queue_number) VALUES (:pid, :did, :time, :status, :q)"
        );
        $stmt->execute([
            ':pid' => $patient_id,
            ':did' => $doctor_id,
            ':time' => $scheduled_time,
            ':status' => $status,
            ':q' => $queue_number,
        ]);
        return (int)$this->db->lastInsertId();
    }

    public function delete(int $appointment_id): bool
    {
        $tbl = Database::table('appointments');
        $stmt = $this->db->prepare("DELETE FROM {$tbl} WHERE appointment_id = :id");
        return $stmt->execute([':id' => $appointment_id]);
    }

    public function getCurrentForPatient(int $patient_id): ?array
    {
        // Latest pending appointment for patient with queue info and doctor specialization
        $appt = Database::table('appointments');
        $queue = Database::table('queue');
        $docs = Database::table('doctors');
        $sql = "SELECT a.*, q.queue_id, q.queue_number, q.position, d.specialization
                FROM {$appt} a
                LEFT JOIN {$queue} q ON q.appointment_id = a.appointment_id
                LEFT JOIN {$docs} d ON d.doctor_id = a.doctor_id
                WHERE a.patient_id = :pid AND (a.status = 'pending' OR a.status = 'scheduled')
                ORDER BY a.scheduled_time DESC, a.appointment_id DESC
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':pid' => $patient_id]);
        $row = $stmt->fetch();
        if (!$row) return null;

        return [
            'appointment' => [
                'appointment_id' => (int)$row['appointment_id'],
                'patient_id' => (int)$row['patient_id'],
                'doctor_id' => (int)$row['doctor_id'],
                'scheduled_time' => $row['scheduled_time'],
                'status' => $row['status'],
                'queue_number' => $row['queue_number'],
            ],
            'queue' => $row['queue_id'] ? [
                'queue_id' => (int)$row['queue_id'],
                'appointment_id' => (int)$row['appointment_id'],
                'queue_number' => (int)$row['queue_number'],
                'position' => (int)($row['position'] ?? 0),
                'specialization' => $row['specialization'] ?? null,
            ] : null,
        ];
    }
}
