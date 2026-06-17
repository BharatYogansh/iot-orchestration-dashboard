-- ============================================================
-- IoT Device Management & OTA Orchestration System
-- PostgreSQL Schema (schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('Super Admin', 'Admin', 'Manager', 'Operator', 'Viewer');
CREATE TYPE user_department AS ENUM ('Engineering', 'Operations', 'Field Ops', 'Management', 'R&D');
CREATE TYPE user_presence_status AS ENUM ('Online', 'Offline');

CREATE TYPE group_status AS ENUM ('Active', 'Inactive');

CREATE TYPE device_status AS ENUM ('Online', 'Offline', 'Updating', 'Error');

CREATE TYPE firmware_status AS ENUM ('Active', 'Deprecated', 'Draft');

CREATE TYPE ota_status AS ENUM ('Success', 'In Progress', 'Failed');
CREATE TYPE ota_update_type AS ENUM ('Mandatory', 'Optional');

CREATE TYPE log_level AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TYPE security_event_status AS ENUM ('success', 'warning');

-- ============================================================
-- TRIGGER FUNCTION: auto-update `updated_at`
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS / TEAM MEMBERS
-- ============================================================

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'Viewer',
    department      user_department NOT NULL,
    status          user_presence_status NOT NULL DEFAULT 'Offline',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- 2. DEVICE GROUPS
-- ============================================================

CREATE TABLE device_groups (
    group_id        SERIAL PRIMARY KEY,
    name            VARCHAR(100) UNIQUE NOT NULL,
    icon            VARCHAR(50),               -- Lucide icon key
    theme_color     VARCHAR(7),                -- hex, e.g. #3b82f6
    description     TEXT,
    status          group_status NOT NULL DEFAULT 'Active',
    tags            TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_device_groups_updated_at
    BEFORE UPDATE ON device_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_device_groups_status ON device_groups(status);
CREATE INDEX idx_device_groups_tags ON device_groups USING GIN(tags);

-- ============================================================
-- 3. DEVICES
-- ============================================================

CREATE TABLE devices (
    device_id               VARCHAR(50) PRIMARY KEY,    -- e.g. 'ESP32-00124'
    custom_name              VARCHAR(150) NOT NULL,
    group_id                 INTEGER REFERENCES device_groups(group_id) ON DELETE SET NULL,
    status                    device_status NOT NULL DEFAULT 'Offline',
    device_type               VARCHAR(50) NOT NULL,       -- 'ESP32', 'ESP8266'
    ip_address                 INET,
    current_firmware_version  VARCHAR(50),
    last_seen_at               TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_devices_group_id ON devices(group_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_device_type ON devices(device_type);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);

-- ============================================================
-- 4. FIRMWARE REPOSITORY
-- ============================================================

CREATE TABLE firmware (
    firmware_id         SERIAL PRIMARY KEY,
    file_name            VARCHAR(255) NOT NULL,
    version               VARCHAR(50) UNIQUE NOT NULL,
    status                firmware_status NOT NULL DEFAULT 'Draft',
    compatible_devices    VARCHAR(255),               -- e.g. 'ESP32, ESP8266'
    size_bytes            BIGINT,
    checksum              VARCHAR(128) NOT NULL,        -- MD5/SHA256
    uploaded_by           UUID REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    file_path              TEXT NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_firmware_updated_at
    BEFORE UPDATE ON firmware
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_firmware_version ON firmware(version);
CREATE INDEX idx_firmware_status ON firmware(status);
CREATE INDEX idx_firmware_uploaded_by ON firmware(uploaded_by);

-- ============================================================
-- 5. OTA UPDATES (Rollout Jobs)
-- ============================================================

CREATE TABLE ota_updates (
    update_id           SERIAL PRIMARY KEY,
    job_name              VARCHAR(150) NOT NULL,
    firmware_id            INTEGER NOT NULL REFERENCES firmware(firmware_id) ON DELETE RESTRICT,
    target_group_id        INTEGER REFERENCES device_groups(group_id) ON DELETE CASCADE,
    status                  ota_status NOT NULL DEFAULT 'In Progress',
    progress_percentage     INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    update_type             ota_update_type NOT NULL DEFAULT 'Optional',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ota_updates_updated_at
    BEFORE UPDATE ON ota_updates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_ota_updates_status ON ota_updates(status);
CREATE INDEX idx_ota_updates_target_group ON ota_updates(target_group_id);
CREATE INDEX idx_ota_updates_firmware ON ota_updates(firmware_id);
CREATE INDEX idx_ota_updates_created_at ON ota_updates(created_at);

-- ============================================================
-- 6. SYSTEM LOGS & ALERTS
-- ============================================================

CREATE TABLE system_logs (
    log_id        BIGSERIAL PRIMARY KEY,
    level          log_level NOT NULL,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    source           VARCHAR(100) NOT NULL,   -- 'MQTT Broker', 'FastAPI', 'OTA Service'
    message          TEXT NOT NULL
);

CREATE INDEX idx_system_logs_occurred_at ON system_logs(occurred_at DESC);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_source ON system_logs(source);

-- ============================================================
-- 7. USER SECURITY ACTIVITY LOG
-- ============================================================

CREATE TABLE user_security_activity_log (
    activity_id    BIGSERIAL PRIMARY KEY,
    user_id          UUID REFERENCES users(user_id) ON DELETE CASCADE,
    event_action      TEXT NOT NULL,
    ip_address         INET,
    status              security_event_status NOT NULL DEFAULT 'success',
    occurred_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_log_user_id ON user_security_activity_log(user_id);
CREATE INDEX idx_security_log_occurred_at ON user_security_activity_log(occurred_at DESC);
CREATE INDEX idx_security_log_status ON user_security_activity_log(status);

-- ============================================================
-- END OF SCHEMA
-- ============================================================