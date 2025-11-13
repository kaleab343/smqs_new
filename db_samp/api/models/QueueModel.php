<?php
require_once __DIR__ . '/../core/Database.php';

class QueueModel {
    /**
     * Promote the next queued appointment for a given doctor to the front (position=1)
     * and set its appointment status to 'in-consultation'. Returns the appointment_id promoted or null.
     */
    public function promoteNextForDoctor(int $doctor_id): ?int {
        $apptTbl = Database::table('appointments');
        $queueTbl = Database::table('queue');
        $this->db->beginTransaction();
        try {
            // Find the next queued appointment for this doctor by smallest position
            $sql = "SELECT q.appointment_id
                    FROM {$queueTbl} q
                    JOIN {$apptTbl} a ON a.appointment_id = q.appointment_id
                    WHERE a.doctor_id = :did
                    ORDER BY q.position ASC
                    LIMIT 1";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':did' => $doctor_id]);
            $row = $stmt->fetch();
            if (!$row || !isset($row['appointment_id'])) {
                $this->db->commit();
                return null; // nothing to promote
            }
            $nextAid = (int)$row['appointment_id'];

            // Move this appointment to the front of the queue
            $this->db->exec("UPDATE {$queueTbl} SET position = position + 1");
            $stmt = $this->db->prepare("UPDATE {$queueTbl} SET position = 1 WHERE appointment_id = :aid");
            $stmt->execute([':aid' => $nextAid]);

            // Mark the appointment as in-consultation
            $stmt = $this->db->prepare("UPDATE {$apptTbl} SET status = 'in-consultation' WHERE appointment_id = :aid");
            $stmt->execute([':aid' => $nextAid]);

            $this->db->commit();
            return $nextAid;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }


    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Backfill: enqueue all appointments in pending/scheduled that are missing from queue.
     * Returns number of rows enqueued.
     */
    public function backfillFromAppointments(): int {
        $apptTbl = Database::table('appointments');
        $queueTbl = Database::table('queue');
        $this->db->beginTransaction();
        try {
            // Find all appointment_ids missing from queue with relevant statuses
            $sql = "SELECT a.appointment_id
                    FROM {$apptTbl} a
                    LEFT JOIN {$queueTbl} q ON q.appointment_id = a.appointment_id
                    WHERE q.appointment_id IS NULL AND (a.status = 'pending' OR a.status = 'scheduled')
                    ORDER BY a.scheduled_time ASC, a.appointment_id ASC";
            $missing = $this->db->query($sql)->fetchAll();
            if (!$missing) {
                $this->db->commit();
                return 0;
            }

            $enqueued = 0;
            foreach ($missing as $row) {
                $aid = (int)$row['appointment_id'];
                $qnum = $this->nextQueueNumber();
                $pos = $this->getLastPosition();
                $stmt = $this->db->prepare("INSERT INTO {$queueTbl} (appointment_id, queue_number, position) VALUES (:aid, :qnum, :pos)");
                $stmt->execute([':aid' => $aid, ':qnum' => $qnum, ':pos' => $pos]);
                $enqueued++;
            }

            $this->db->commit();
            return $enqueued;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
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
