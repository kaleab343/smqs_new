<?php
return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'dbname' => getenv('DB_NAME') ?: 'smart_queue_management',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => getenv('DB_CHARSET') ?: 'utf8mb4'
    ]
];