<?php

require_once __DIR__ . '/../core/Database.php';

class UserModel
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    private function ensureRoleSupports(string $role): void
    {
        if ($role === '') return;
        try {
            $dbName = Database::dbName();
            if (!$dbName) return;
            $stmt = $this->db->prepare("SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'");
            $stmt->execute([':db' => $dbName]);
            $row = $stmt->fetch();
            if (!$row || empty($row['COLUMN_TYPE'])) return;
            $colType = (string)$row['COLUMN_TYPE'];
            if (stripos($colType, 'enum(') === false) return; // not an ENUM; nothing to do
            if (strpos($colType, "'".$role."'") !== false) return; // already supported
            if (!preg_match_all("/\'([^\']*)\'/", $colType, $m)) return;
            $values = $m[1] ?? [];
            if (!in_array($role, $values, true)) {
                $values[] = $role;
                // Rebuild ENUM preserving order and adding missing role at end
                $quoted = implode(',', array_map(function ($v) { return $this->db->quote($v); }, $values));
                $default = in_array('patient', $values, true) ? 'patient' : ($values[0] ?? 'patient');
                $usersTable = Database::table('users');
                $sql = "ALTER TABLE {$usersTable} MODIFY `role` ENUM({$quoted}) NOT NULL DEFAULT " . $this->db->quote($default);
                $this->db->exec($sql);
            }
        } catch (Throwable $e) {
            // Silently ignore; do not block registration if we cannot alter schema
        }
    }

    public function findByUsernameOrEmail(string $identifier): ?array
    {
        // Try username
        $tbl = Database::table('users');
        $stmt = $this->db->prepare("SELECT * FROM {$tbl} WHERE username = :id");
        $stmt->execute([':id' => $identifier]);
        $user = $stmt->fetch();
        if ($user) return $user;

        // Try direct email on users table
        $tbl = Database::table('users');
        $stmt = $this->db->prepare("SELECT * FROM {$tbl} WHERE email = :id");
        $stmt->execute([':id' => $identifier]);
        $user = $stmt->fetch();
        if ($user) return $user;

        // Try email via patients table join
        $users = Database::table('users');
        $patients = Database::table('patients');
        $sql = "SELECT u.* FROM {$users} u INNER JOIN {$patients} p ON p.user_id = u.user_id WHERE p.email = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $identifier]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function createUser(array $data): int
    {
        $tbl = Database::table('users');
        $role = $data['role'] ?? 'patient';
        $this->ensureRoleSupports($role);
        $hasSpec = isset($data['specialization']) && $data['specialization'] !== '';
        if ($hasSpec) {
            $stmt = $this->db->prepare("INSERT INTO {$tbl} (username, password, role, email, specialization) VALUES (:u, :p, :r, :e, :s)");
            $stmt->execute([
                ':u' => $data['username'],
                ':p' => $data['password'],
                ':r' => $role,
                ':e' => $data['email'] ?? $data['username'],
                ':s' => $data['specialization'],
            ]);
        } else {
            $stmt = $this->db->prepare("INSERT INTO {$tbl} (username, password, role, email) VALUES (:u, :p, :r, :e)");
            $stmt->execute([
                ':u' => $data['username'],
                ':p' => $data['password'],
                ':r' => $role,
                ':e' => $data['email'] ?? $data['username'],
            ]);
        }
        return (int)$this->db->lastInsertId();
    }

    public function getAll(): array
    {
        $tbl = Database::table('users');
        $sql = "SELECT user_id, username, email, role, password, created_at, updated_at, specialization FROM {$tbl} ORDER BY created_at DESC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    public function getById(int $id): ?array
    {
        $tbl = Database::table('users');
        $stmt = $this->db->prepare("SELECT user_id, username, email, role, password, created_at, updated_at, specialization FROM {$tbl} WHERE user_id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function updateUser(int $id, array $data): bool
    {
        $tbl = Database::table('users');
        $fields = [];
        $params = [':id' => $id];
        if (isset($data['username']) && $data['username'] !== '') { $fields[] = 'username = :u'; $params[':u'] = $data['username']; }
        if (isset($data['email']) && $data['email'] !== '') { $fields[] = 'email = :e'; $params[':e'] = $data['email']; }
        if (isset($data['role']) && $data['role'] !== '') { $fields[] = 'role = :r'; $params[':r'] = $data['role']; $this->ensureRoleSupports($data['role']); }
        if (array_key_exists('specialization', $data)) { $fields[] = 'specialization = :s'; $params[':s'] = ($data['specialization'] !== '' ? $data['specialization'] : null); }
        if (isset($data['password']) && $data['password'] !== '') { $fields[] = 'password = :p'; $params[':p'] = $data['password']; }
        if (empty($fields)) return true;
        $sql = "UPDATE {$tbl} SET " . implode(', ', $fields) . " WHERE user_id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function deleteUser(int $id): bool
    {
        // Remove dependent patient row if exists
        try {
            $pt = Database::table('patients');
            $stmt = $this->db->prepare("DELETE FROM {$pt} WHERE user_id = :id");
            $stmt->execute([':id' => $id]);
        } catch (Throwable $e) { /* ignore */ }
        $tbl = Database::table('users');
        $stmt = $this->db->prepare("DELETE FROM {$tbl} WHERE user_id = :id");
        return $stmt->execute([':id' => $id]);
    }
}
