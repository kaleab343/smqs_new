<?php

class Database
{
    private static ?PDO $pdoInstance = null;
    private static ?string $dbName = null;

    public static function getConnection(): PDO
    {
        $pdo = self::$pdoInstance;
        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $config = require __DIR__ . '/../config.php';
        $db = $config['db'] ?? [];
        self::$dbName = $db['dbname'] ?? null;

        $host = $db['host'] ?? 'localhost';
        $name = $db['dbname'] ?? 'smart_queue_management';
        $user = $db['user'] ?? 'root';
        $pass = $db['pass'] ?? '';
        $charset = $db['charset'] ?? 'utf8mb4';

        // Build DSN; include dbname but also handle environments that ignore it
        $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";

        $pdo = new PDO(
            $dsn,
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        self::$pdoInstance = $pdo;

        // Ensure database is selected explicitly (some environments ignore dbname in DSN)
        if (!empty($name)) {
            $safe = str_replace('`','``',$name);
            $pdo->exec('USE `'.$safe.'`');
            try {
                $currentDb = $pdo->query('SELECT DATABASE()')->fetchColumn();
                if (!$currentDb || strcasecmp($currentDb, $name) !== 0) {
                    // Attempt again; if still not selected, throw detailed error
                    $pdo->exec('USE `'.$safe.'`');
                    $currentDb = $pdo->query('SELECT DATABASE()')->fetchColumn();
                    if (!$currentDb || strcasecmp($currentDb, $name) !== 0) {
                        throw new RuntimeException('Database not selected after USE: expected ' . $name . ', got ' . ($currentDb ?: 'NULL'));
                    }
                }
            } catch (Throwable $e) {
                // Surface helpful message
                throw new PDOException('Failed to select database "'.$name.'": '.$e->getMessage(), 0, $e);
            }
        }

        return $pdo;
    }

    public static function dbName(): ?string
    {
        if (self::$dbName === null) {
            $config = require __DIR__ . '/../config.php';
            self::$dbName = $config['db']['dbname'] ?? null;
        }
        // Fallback to default schema name if config fails for any reason
        return self::$dbName ?: 'smart_queue_management';
    }

    public static function table(string $name): string
    {
        $db = self::dbName();
        $safe = str_replace('`','``',$name);
        if ($db) {
            $safeDb = str_replace('`','``',$db);
            return "`{$safeDb}`.`{$safe}`";
        }
        return "`{$safe}`";
    }
}
