-- ============================================================
-- IoT Device Management & OTA Orchestration System
-- Mock Data Seeding Script (seed.sql)
-- Run AFTER schema.sql
-- ============================================================

-- ----------------------------------------------------------
-- USERS
-- ----------------------------------------------------------
INSERT INTO users (user_id, student_id, full_name, email, password_hash, role, department, status, last_login_at)
VALUES
    (gen_random_uuid(), '221020124003', 'Bharat Yogansh', 'bharat.yogansh@rce.ac.in',
     crypt('demo1234', gen_salt('bf')), 'Super Admin', 'Engineering', 'Online', now() - INTERVAL '5 minutes'),
    (gen_random_uuid(), '221020124001', 'Aman Bansal', 'aman.bansal@rce.ac.in',
     crypt('demo1234', gen_salt('bf')), 'Admin', 'R&D', 'Offline', now() - INTERVAL '2 days');

-- Demo login: bharat.yogansh@rce.ac.in / demo1234
-- (crypt()/gen_salt() require the pgcrypto extension, already enabled in schema.sql)

-- ----------------------------------------------------------
-- DEVICE GROUPS
-- ----------------------------------------------------------
INSERT INTO device_groups (name, icon, theme_color, description, status, tags)
VALUES
    ('Factory A', 'factory', '#3b82f6', 'Primary production floor sensor network', 'Active', ARRAY['production', 'priority']),
    ('Factory B', 'factory', '#f59e0b', 'Secondary production floor sensor network', 'Active', ARRAY['production']),
    ('Office', 'building-2', '#10b981', 'Office environment monitoring nodes', 'Active', ARRAY['environment']),
    ('Warehouse', 'warehouse', '#6366f1', 'Storage and warehouse tracking nodes', 'Active', ARRAY['logistics']);

-- ----------------------------------------------------------
-- DEVICES
-- ----------------------------------------------------------
INSERT INTO devices (device_id, custom_name, group_id, status, device_type, ip_address, current_firmware_version, last_seen_at)
VALUES
    ('ESP32-00124', 'Sensor Node 1', (SELECT group_id FROM device_groups WHERE name = 'Factory A'),
     'Online', 'ESP32', '192.168.1.124', 'v1.1.0', now() - INTERVAL '1 minute'),
    ('ESP32-00127', 'Humidity Sensor', (SELECT group_id FROM device_groups WHERE name = 'Warehouse'),
     'Online', 'ESP32', '192.168.1.127', 'v1.0.8', now() - INTERVAL '3 minutes');

-- ----------------------------------------------------------
-- FIRMWARE REPOSITORY
-- ----------------------------------------------------------
INSERT INTO firmware (file_name, version, status, compatible_devices, size_bytes, checksum, uploaded_by, file_path)
VALUES
    ('firmware_v1.1.0.bin', 'v1.1.0', 'Active', 'ESP32, ESP8266', 1048576,
     'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
     (SELECT user_id FROM users WHERE student_id = '221020124003'),
     '/firmware/firmware_v1.1.0.bin'),
    ('firmware_v1.0.8.bin', 'v1.0.8', 'Deprecated', 'ESP32', 987654,
     'd2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2',
     (SELECT user_id FROM users WHERE student_id = '221020124001'),
     '/firmware/firmware_v1.0.8.bin');

-- ----------------------------------------------------------
-- OTA UPDATES (Rollout Jobs)
-- ----------------------------------------------------------
INSERT INTO ota_updates (job_name, firmware_id, target_group_id, status, progress_percentage, update_type)
VALUES
    ('Factory A Rollout - v1.1.0',
     (SELECT firmware_id FROM firmware WHERE version = 'v1.1.0'),
     (SELECT group_id FROM device_groups WHERE name = 'Factory A'),
     'Success', 100, 'Mandatory'),
    ('Warehouse Rollout - v1.0.8',
     (SELECT firmware_id FROM firmware WHERE version = 'v1.0.8'),
     (SELECT group_id FROM device_groups WHERE name = 'Warehouse'),
     'In Progress', 62, 'Optional');

-- ----------------------------------------------------------
-- SYSTEM LOGS & ALERTS
-- ----------------------------------------------------------
INSERT INTO system_logs (level, occurred_at, source, message)
VALUES
    ('INFO', now() - INTERVAL '10 minutes', 'MQTT Broker', 'Device ESP32-00124 connected successfully.'),
    ('INFO', now() - INTERVAL '8 minutes', 'OTA Service', 'Firmware v1.1.0 rollout to Factory A completed.'),
    ('WARN', now() - INTERVAL '6 minutes', 'FastAPI', 'High request latency detected on /api/devices endpoint.'),
    ('ERROR', now() - INTERVAL '4 minutes', 'MQTT Broker', 'Device ESP32-00130 disconnected unexpectedly.'),
    ('INFO', now() - INTERVAL '2 minutes', 'OTA Service', 'Warehouse rollout v1.0.8 in progress: 62% complete.');

-- ----------------------------------------------------------
-- USER SECURITY ACTIVITY LOG
-- ----------------------------------------------------------
INSERT INTO user_security_activity_log (user_id, event_action, ip_address, status, occurred_at)
VALUES
    ((SELECT user_id FROM users WHERE student_id = '221020124003'),
     'Login successful', '10.0.0.15', 'success', now() - INTERVAL '5 minutes'),
    ((SELECT user_id FROM users WHERE student_id = '221020124001'),
     'Password reset requested', '10.0.0.22', 'warning', now() - INTERVAL '2 days');

-- ============================================================
-- END OF SEED DATA
-- ============================================================