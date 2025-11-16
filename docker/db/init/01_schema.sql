-- Clean schema for Smart Queue Management System
CREATE DATABASE IF NOT EXISTS `smart_queue_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_queue_management`;

-- users
CREATE TABLE IF NOT EXISTS `users` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- doctors
CREATE TABLE IF NOT EXISTS `doctors` (
  `doctor_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `specialization` varchar(191) NOT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(190) DEFAULT NULL,
  PRIMARY KEY (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- patients
CREATE TABLE IF NOT EXISTS `patients` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- appointments
CREATE TABLE IF NOT EXISTS `appointments` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- queue
CREATE TABLE IF NOT EXISTS `queue` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- customer_satisfaction
CREATE TABLE IF NOT EXISTS `customer_satisfaction` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_id` int(11) NOT NULL,
  `rate` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_date` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_satisfaction_patient` (`patient_id`),
  CONSTRAINT `fk_satisfaction_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- hospital_information
CREATE TABLE IF NOT EXISTS `hospital_information` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `Hospital_Name` varchar(255) NOT NULL,
  `Email` varchar(190) DEFAULT NULL,
  `Phone` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
