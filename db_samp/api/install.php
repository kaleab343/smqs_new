<?php
// Simple installer to create database tables using db_schema.sql
header('Content-Type: text/plain');

$cfg = require __DIR__ . '/config.php';
$host = $cfg['db']['host'] ?? 'localhost';
$user = $cfg['db']['user'] ?? 'root';
$pass = $cfg['db']['pass'] ?? '';
$dbname = $cfg['db']['dbname'] ?? 'smart_queue_management';
$charset = $cfg['db']['charset'] ?? 'utf8mb4';

$schemaPath = realpath(__DIR__ . '/../db_schema.sql');
if (!$schemaPath || !is_readable($schemaPath)) {
    http_response_code(500);
    echo "db_schema.sql not found at project root.\n";
    exit;
}

$sql = file_get_contents($schemaPath);
if ($sql === false) {
    http_response_code(500);
    echo "Failed to read db_schema.sql\n";
    exit;
}

try {
    // Connect to server without selecting DB to allow creating it
    $dsn = "mysql:host={$host};charset={$charset}";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo "Database connection failed: " . $e->getMessage() . "\n";
    exit;
}

try {
    // Ensure database exists and is selected
    $pdo->exec('CREATE DATABASE IF NOT EXISTS `'.str_replace('`','``',$dbname).'` CHARACTER SET '.$pdo->quote($charset));
    $pdo->exec('USE `'.str_replace('`','``',$dbname).'`');

    // Split by semicolon; support both \n and \r\n and end-of-file
    $parts = preg_split('/;\s*(?:\r?\n|$)/', $sql);
    $count = 0;
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) continue;
        // Skip CREATE DATABASE/USE if present in file; we already handled
        if (preg_match('/^CREATE\s+DATABASE/i', $stmt)) continue;
        if (preg_match('/^USE\s+/i', $stmt)) continue;
        $pdo->exec($stmt);
        $count++;
    }
    echo "OK - Executed {$count} statements.\n";

    // Show tables for verification
    $tables = [];
    foreach ($pdo->query('SHOW TABLES') as $row) { $tables[] = array_values($row)[0]; }
    echo "Tables: " . implode(', ', $tables) . "\n";

    // Create trigger to auto-enqueue appointments inserted outside API
    try {
        $pdo->exec("DROP TRIGGER IF EXISTS trg_appointments_after_insert");
        $pdo->exec(<<<SQL
CREATE TRIGGER trg_appointments_after_insert
AFTER INSERT ON appointments
FOR EACH ROW
BEGIN
  DECLARE next_q INT;
  DECLARE next_pos INT;
  SELECT IFNULL(MAX(queue_number), 0) + 1 INTO next_q FROM queue;
  SELECT IFNULL(MAX(position), 0) + 1 INTO next_pos FROM queue;
  INSERT INTO queue (appointment_id, queue_number, position)
  VALUES (NEW.appointment_id,
          COALESCE(NEW.queue_number, next_q),
          next_pos);
END
SQL);
        echo "Trigger trg_appointments_after_insert created.\n";
    } catch (Throwable $te) {
        echo "Trigger creation skipped/failed: " . $te->getMessage() . "\n";
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo "Install error: " . $e->getMessage() . "\n";
}
