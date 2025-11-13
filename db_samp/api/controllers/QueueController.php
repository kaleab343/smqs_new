<?php

require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../models/QueueModel.php';

class QueueController
{
    public function list()
    {
        $m = new QueueModel();
        return Response::json($m->listAll());
    }

    public function emergency()
    {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $appointment_id = (int)($body['appointment_id'] ?? 0);
        if (!$appointment_id) {
            return Response::json(['error' => 'Missing appointment_id'], 400);
        }
        $m = new QueueModel();
        $m->emergency($appointment_id);
        return Response::json(['success' => true]);
    }
}
