<?php
// Simple PHP wrapper to serve the API tester page via PHP
// This lets you open http://localhost/dave%20assaiment/test_api.php under XAMPP
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Tester - Hospital Queue Backend</title>
  <link rel="stylesheet" href="test_api.css" />
</head>
<body>
  <header>
    <h1>Hospital Queue Backend - API Tester (PHP)</h1>
    <div id="envInfo"></div>
  </header>

  <main>
    <section class="card">
      <h2>Auth</h2>
      <div class="grid">
        <div>
          <h3>Register</h3>
          <label>Name <input id="reg_name" /></label>
          <label>Phone <input id="reg_phone" /></label>
          <label>Email <input id="reg_email" /></label>
          <label>Password <input id="reg_password" type="password" /></label>
          <button onclick="actions.register()">POST /auth/register</button>
        </div>
        <div>
          <h3>Login</h3>
          <label>Email/Username <input id="login_id" /></label>
          <label>Password <input id="login_password" type="password" /></label>
          <button onclick="actions.login()">POST /auth/login</button>
        </div>
      </div>
      <div class="inline">
        <div class="pill">User ID: <span id="user_id">-</span></div>
        <div class="pill">Role: <span id="user_role">-</span></div>
        <div class="pill">Patient ID: <span id="patient_id">-</span></div>
      </div>
    </section>

    <section class="card">
      <h2>Meta</h2>
      <div class="grid">
        <div>
          <h3>Departments</h3>
          <button onclick="actions.getDepartments()">GET /departments</button>
          <pre class="out" id="out_departments"></pre>
        </div>
        <div>
          <h3>Doctors</h3>
          <label>Specialization <input id="doc_spec" placeholder="(optional)" /></label>
          <button onclick="actions.getDoctors()">GET /doctors</button>
          <pre class="out" id="out_doctors"></pre>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Appointments</h2>
      <div class="grid">
        <div>
          <h3>Create</h3>
          <label>Patient ID <input id="appt_patient" placeholder="(defaults to logged patient)" /></label>
          <label>Doctor ID <input id="appt_doctor" /></label>
          <label>Time <input id="appt_time" type="datetime-local" /></label>
          <button onclick="actions.createAppointment()">POST /appointments</button>
          <pre class="out" id="out_create_appt"></pre>
        </div>
        <div>
          <h3>Current for Patient</h3>
          <label>Patient ID <input id="cur_patient" placeholder="(defaults to logged patient)" /></label>
          <button onclick="actions.getCurrent()">GET /appointments/current</button>
          <pre class="out" id="out_current"></pre>
        </div>
        <div>
          <h3>Delete by ID</h3>
          <label>Appointment ID <input id="del_appt_id" /></label>
          <button class="danger" onclick="actions.deleteAppointment()">DELETE /appointments/{id}</button>
          <pre class="out" id="out_delete"></pre>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Queue</h2>
      <div class="grid">
        <div>
          <h3>List</h3>
          <button onclick="actions.listQueue()">GET /queue</button>
          <pre class="out" id="out_queue"></pre>
        </div>
        <div>
          <h3>Emergency front</h3>
          <label>Appointment ID <input id="emg_appt_id" /></label>
          <button class="warn" onclick="actions.emergency()">POST /queue/emergency</button>
          <pre class="out" id="out_emergency"></pre>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Raw Output</h2>
      <pre class="out" id="out"></pre>
    </section>
  </main>

  <footer>
    <small>Tip: If your site runs in a subfolder, requests will be sent to relative path <code>api</code>.</small>
  </footer>

  <script src="test_api.js"></script>
</body>
</html>
