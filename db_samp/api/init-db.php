<?php
/**
 * Database Initialization Script
 * Automatically creates all required tables if they don't exist
 */

require_once __DIR__ . '/core/Database.php';

class DatabaseInitializer {
    private $pdo;
    
    public function __construct() {
        try {
            $this->pdo = Database::getConnection();
        } catch (Exception $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * Initialize all database tables
     */
    public function initializeTables() {
        $results = [];
        
        try {
            // Create tables in order (respecting foreign key dependencies)
            $results['users'] = $this->createUsersTable();
            $results['doctors'] = $this->createDoctorsTable();
            $results['patients'] = $this->createPatientsTable();
            $results['appointments'] = $this->createAppointmentsTable();
            $results['queue'] = $this->createQueueTable();
            $results['customer_satisfaction'] = $this->createCustomerSatisfactionTable();
            $results['hospital_information'] = $this->createHospitalInformationTable();
            
            return [
                'success' => true,
                'message' => 'Database initialized successfully',
                'tables' => $results
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Database initialization failed: ' . $e->getMessage(),
                'tables' => $results
            ];
        }
    }
    
    private function createUsersTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `users` (
            `user_id` int(11) NOT NULL AUTO_INCREMENT,
            `username` varchar(191) NOT NULL,
            `password` varchar(191) NOT NULL,
            `role` enum('patient','doctor','admin','staff','super_admin','receptionist') NOT NULL DEFAULT 'patient',
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `updated_at` datetime DEFAULT NULL,
            `email` varchar(255) NOT NULL,
            `specialization` varchar(120) DEFAULT NULL,
            PRIMARY KEY (`user_id`),
            UNIQUE KEY `username` (`username`),
            UNIQUE KEY `email` (`email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('users') ? 'created/verified' : 'failed';
    }
    
    private function createDoctorsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `doctors` (
            `doctor_id` int(11) NOT NULL AUTO_INCREMENT,
            `name` varchar(191) NOT NULL,
            `specialization` varchar(191) NOT NULL,
            `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `email` varchar(190) DEFAULT NULL,
            PRIMARY KEY (`doctor_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('doctors') ? 'created/verified' : 'failed';
    }
    
    private function createPatientsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `patients` (
            `patient_id` int(11) NOT NULL AUTO_INCREMENT,
            `user_id` int(11) NOT NULL,
            `name` varchar(191) NOT NULL,
            `email` varchar(191) NOT NULL,
            `phone` varchar(50) NOT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`patient_id`),
            UNIQUE KEY `email` (`email`),
            KEY `fk_pat_user` (`user_id`),
            CONSTRAINT `fk_pat_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('patients') ? 'created/verified' : 'failed';
    }
    
    private function createAppointmentsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `appointments` (
            `appointment_id` int(11) NOT NULL AUTO_INCREMENT,
            `patient_id` int(11) NOT NULL,
            `doctor_id` int(11) NOT NULL,
            `scheduled_time` datetime NOT NULL,
            `status` varchar(50) NOT NULL DEFAULT 'pending',
            `queue_number` int(11) DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`appointment_id`),
            KEY `fk_appt_doctor` (`doctor_id`),
            KEY `idx_appt_patient_status` (`patient_id`,`status`),
            KEY `idx_appt_sched` (`scheduled_time`),
            CONSTRAINT `fk_appt_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`doctor_id`) ON DELETE CASCADE,
            CONSTRAINT `fk_appt_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('appointments') ? 'created/verified' : 'failed';
    }
    
    private function createQueueTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `queue` (
            `queue_id` int(11) NOT NULL AUTO_INCREMENT,
            `appointment_id` int(11) NOT NULL,
            `queue_number` int(11) NOT NULL,
            `position` int(11) NOT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (`queue_id`),
            UNIQUE KEY `appointment_id` (`appointment_id`),
            KEY `idx_queue_pos` (`position`),
            KEY `idx_queue_number` (`queue_number`),
            CONSTRAINT `fk_queue_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`appointment_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('queue') ? 'created/verified' : 'failed';
    }
    
    private function createCustomerSatisfactionTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `customer_satisfaction` (
            `id` int(11) NOT NULL AUTO_INCREMENT,
            `patient_id` int(11) NOT NULL,
            `rate` int(11) DEFAULT NULL,
            `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
            `updated_date` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
            PRIMARY KEY (`id`),
            KEY `idx_satisfaction_patient` (`patient_id`),
            CONSTRAINT `fk_satisfaction_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('customer_satisfaction') ? 'created/verified' : 'failed';
    }
    
    private function createHospitalInformationTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `hospital_information` (
            `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
            `Hospital_Name` varchar(255) NOT NULL,
            `Email` varchar(190) DEFAULT NULL,
            `Phone` varchar(30) DEFAULT NULL,
            PRIMARY KEY (`id`),
            UNIQUE KEY `Email` (`Email`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->pdo->exec($sql);
        return $this->tableExists('hospital_information') ? 'created/verified' : 'failed';
    }
    
    private function tableExists($tableName) {
        try {
            $result = $this->pdo->query("SELECT 1 FROM `{$tableName}` LIMIT 1");
            return $result !== false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Check if all required tables exist
     */
    public function checkTables() {
        $requiredTables = [
            'users',
            'doctors', 
            'patients',
            'appointments',
            'queue',
            'customer_satisfaction',
            'hospital_information'
        ];
        
        $status = [];
        foreach ($requiredTables as $table) {
            $status[$table] = $this->tableExists($table);
        }
        
        return [
            'all_exist' => !in_array(false, $status),
            'tables' => $status
        ];
    }
}

// If called directly, initialize the database
if (php_sapi_name() === 'cli' || (isset($_GET['init']) && $_GET['init'] === 'true')) {
    try {
        $initializer = new DatabaseInitializer();
        $result = $initializer->initializeTables();
        
        header('Content-Type: application/json');
        echo json_encode($result, JSON_PRETTY_PRINT);
    } catch (Exception $e) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ], JSON_PRETTY_PRINT);
    }
}
