<?php
require_once __DIR__ . '/../core/Database.php';

class QueueModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Get the next global queue number (monotonic).
     */
    public function nextQueueNumber(): int {
        $tbl = Database::table('queue');
        $row = $this->db->query("SELECT MAX(queue_number) AS max_q FROM {$tbl}")->fetch();
        return (int)($row['max_q'] ?? 0) + 1;
    }

    /**
     * Get the next position at the end of the current queue.
     */
    public function getLastPosition(): int {
        $tbl = Database::table('queue');
        $row = $this->db->query("SELECT MAX(position) AS max_pos FROM {$tbl}")->fetch();
        return (int)($row['max_pos'] ?? 0) + 1;
    }

    /**
     * Return the full queue ordered by position ascending.
     */
    public function listAll(): array {
        $tbl = Database::table('queue');
        $sql = "SELECT q.queue_id, q.appointment_id, q.queue_number, q.position
                FROM {$tbl} q
                ORDER BY q.position ASC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Enqueue an appointment at the tail of the queue (unless position is provided).
     * Returns the created queue_id.
     */
    public function enqueue(int $appointment_id, ?int $queue_number = null, ?int $position = null): int {
        if ($queue_number === null) {
            $queue_number = $this->nextQueueNumber();
        }
        if ($position === null) {
            $position = $this->getLastPosition();
        }

        $tbl = Database::table('queue');
        $stmt = $this->db->prepare(
            "INSERT INTO {$tbl} (appointment_id, queue_number, position) VALUES (:aid, :qnum, :pos)"
        );
        $stmt->execute([
            ':aid'  => $appointment_id,
            ':qnum' => $queue_number,
            ':pos'  => $position,
        ]);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Remove a queue entry by appointment id.
     */
    public function removeByAppointment(int $appointment_id): bool {
        $tbl = Database::table('queue');
        $stmt = $this->db->prepare("DELETE FROM {$tbl} WHERE appointment_id = :aid");
        return $stmt->execute([':aid' => $appointment_id]);
    }

    /**
     * Promote an appointment to the front of the queue (position = 1)
     * and shift others down by +1.
     */
    public function emergency(int $appointment_id): bool {
        $this->db->beginTransaction();
        try {
            // Fetch current position if exists
            $stmt = $this->db->prepare('SELECT position FROM queue WHERE appointment_id = :aid FOR UPDATE');
            $stmt->execute([':aid' => $appointment_id]);
            $row = $stmt->fetch();

            if ($row) {
                $currentPos = (int)$row['position'];
                if ($currentPos > 1) {
                    // Make room at the top: shift everyone currently at >= 1 down by 1
                    $tbl = Database::table('queue');
                    $this->db->exec("UPDATE {$tbl} SET position = position + 1");
                    // Move this one to the front
                    $tbl = Database::table('queue');
                    $stmt = $this->db->prepare("UPDATE {$tbl} SET position = 1 WHERE appointment_id = :aid");
                    $stmt->execute([':aid' => $appointment_id]);
                }
                // else already at front
            } else {
                // Not in queue yet -> insert at front and shift others
                $tbl = Database::table('queue');
                $this->db->exec("UPDATE {$tbl} SET position = position + 1");

                $qnum = $this->nextQueueNumber();
                $tbl = Database::table('queue');
                $stmt = $this->db->prepare(
                    "INSERT INTO {$tbl} (appointment_id, queue_number, position) VALUES (:aid, :qnum, 1)"
                );
                $stmt->execute([
                    ':aid'  => $appointment_id,
                    ':qnum' => $qnum,
                ]);
            }

            $this->db->commit();
            return true;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e; // Let caller handle
        }
    }
}
