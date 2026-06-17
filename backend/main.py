"""
IoT Device Management & OTA Orchestration System
FastAPI backend — built as a thin "view layer" over the normalized
PostgreSQL schema (schema.sql), shaping responses to match the exact
field names the React dashboard already expects (id, name, group,
status, firmware, ip, lastSeen, type, etc). This way the frontend
needs almost no reshaping logic — it just swaps mock arrays for fetch
calls.

Run:
    pip install fastapi uvicorn asyncpg python-multipart --break-system-packages
    export DATABASE_URL="postgresql://user:password@localhost:5432/iot_db"
    uvicorn main:app --reload --port 8000
"""

import hashlib
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import asyncpg
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/iot_db"
)
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
FIRMWARE_STORAGE_DIR = Path(os.environ.get("FIRMWARE_STORAGE_DIR", "./firmware_storage"))
FIRMWARE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Fixed colors so charts stay visually consistent with the original mock design
DEVICE_STATUS_COLORS = {
    "Online": "#10B981",
    "Offline": "#EF4444",
    "Updating": "#F59E0B",
    "Error": "#8B5CF6",
}
GROUP_FALLBACK_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pool sized for MQTT-driven write bursts, not just HTTP request volume —
    # see the architectural note at the bottom of this file.
    app.state.pool = await asyncpg.create_pool(
        dsn=DATABASE_URL, min_size=5, max_size=20
    )
    yield
    await app.state.pool.close()


app = FastAPI(title="IoT OTA Orchestration API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AUTH
# ============================================================
# NOTE for a college project this keeps things simple: no JWT/session
# tokens, just a credential check that returns the user record. Add a
# token layer (e.g. fastapi-users, or a hand-rolled JWT) before this
# goes anywhere near production.

@app.post("/api/auth/login")
async def login(payload: dict):
    email = payload.get("email")
    password = payload.get("password")
    if not email or not password:
        raise HTTPException(400, "email and password are required")

    row = await pool(app).fetchrow(
        """
        SELECT user_id, full_name, email, role, department, student_id
        FROM users
        WHERE email = $1 AND password_hash = crypt($2, password_hash)
        """,
        email, password,
    )
    if not row:
        raise HTTPException(401, "Invalid email or password")

    await pool(app).execute(
        "UPDATE users SET status = 'Online', last_login_at = now() WHERE user_id = $1",
        row["user_id"],
    )
    return {
        "userId": str(row["user_id"]), "name": row["full_name"], "email": row["email"],
        "role": row["role"], "dept": row["department"], "studentId": row["student_id"],
    }


@app.post("/api/auth/register", status_code=201)
async def register(payload: dict):
    required = ["name", "email", "password", "studentId", "department"]
    if not all(payload.get(k) for k in required):
        raise HTTPException(400, "name, email, password, studentId, and department are required")

    try:
        row = await pool(app).fetchrow(
            """
            INSERT INTO users (student_id, full_name, email, password_hash, role, department, status, last_login_at)
            VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), 'Viewer', $5, 'Online', now())
            RETURNING user_id
            """,
            payload["studentId"], payload["name"], payload["email"], payload["password"],
            payload["department"],
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "A user with that email or student ID already exists")

    return {
        "userId": str(row["user_id"]), "name": payload["name"], "email": payload["email"],
        "role": "Viewer", "dept": payload["department"], "studentId": payload["studentId"],
    }


@app.post("/api/auth/logout")
async def logout(payload: dict):
    email = payload.get("email")
    if email:
        await pool(app).execute("UPDATE users SET status = 'Offline' WHERE email = $1", email)
    return {"status": "ok"}


def pool(app_: FastAPI) -> asyncpg.Pool:
    return app_.state.pool


# ---------------------------------------------------------------
# Formatting helpers — keep API output identical in shape/style to
# the original frontend mock data so JSX needs no changes.
# ---------------------------------------------------------------

def fmt_relative(dt: Optional[datetime]) -> str:
    if dt is None:
        return "—"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        return f"{seconds // 60} min ago"
    if seconds < 86400:
        return f"{seconds // 3600} hr ago"
    return f"{seconds // 86400} day(s) ago"


def fmt_datetime_long(dt: Optional[datetime]) -> str:
    if dt is None:
        return "—"
    # %-d (no leading zero) is a Linux/Mac-only strftime extension and
    # raises ValueError on Windows — build the day number manually instead
    # so this works the same on every OS.
    return f"{dt.day} {dt.strftime('%b %Y, %I:%M %p')}"


def fmt_date_short(dt: Optional[datetime]) -> str:
    if dt is None:
        return "—"
    return f"{dt.day} {dt.strftime('%b %Y')}"


def fmt_log_time(dt: Optional[datetime]) -> str:
    if dt is None:
        return "—"
    return dt.strftime("%d %b %H:%M:%S")


def fmt_size(size_bytes: Optional[int]) -> str:
    if not size_bytes:
        return "—"
    mb = size_bytes / (1024 * 1024)
    return f"{mb:.1f} MB"


# ============================================================
# DEVICES
# ============================================================

@app.get("/api/devices")
async def list_devices():
    rows = await pool(app).fetch(
        """
        SELECT d.device_id, d.custom_name, dg.name AS group_name, d.status,
               d.current_firmware_version, d.ip_address, d.last_seen_at, d.device_type
        FROM devices d
        LEFT JOIN device_groups dg ON d.group_id = dg.group_id
        ORDER BY d.device_id
        """
    )
    return [
        {
            "id": r["device_id"],
            "name": r["custom_name"],
            "group": r["group_name"] or "Unassigned",
            "status": r["status"],
            "firmware": r["current_firmware_version"],
            "ip": str(r["ip_address"]) if r["ip_address"] else None,
            "lastSeen": "Updating" if r["status"] == "Updating" else fmt_relative(r["last_seen_at"]),
            "type": r["device_type"],
        }
        for r in rows
    ]


@app.post("/api/devices", status_code=201)
async def create_device(payload: dict):
    required = ["id", "name", "group", "type"]
    if not all(payload.get(k) for k in required):
        raise HTTPException(400, "id, name, group, and type are required")

    async with pool(app).acquire() as conn:
        group_row = await conn.fetchrow(
            "SELECT group_id FROM device_groups WHERE name = $1", payload["group"]
        )
        if not group_row:
            raise HTTPException(404, f"Group '{payload['group']}' not found")

        await conn.execute(
            """
            INSERT INTO devices (device_id, custom_name, group_id, status, device_type,
                                  ip_address, current_firmware_version, last_seen_at)
            VALUES ($1, $2, $3, 'Offline', $4, $5, $6, now())
            """,
            payload["id"], payload["name"], group_row["group_id"], payload["type"],
            payload.get("ip"), payload.get("firmware"),
        )
    return {"id": payload["id"], "status": "created"}


@app.patch("/api/devices/{device_id}")
async def update_device_status(device_id: str, payload: dict):
    status = payload.get("status")
    if status not in ("Online", "Offline", "Updating", "Error"):
        raise HTTPException(400, "Invalid status")
    result = await pool(app).execute(
        "UPDATE devices SET status = $1, last_seen_at = now() WHERE device_id = $2",
        status, device_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Device not found")
    return {"id": device_id, "status": status}


@app.delete("/api/devices/{device_id}", status_code=204)
async def delete_device(device_id: str):
    result = await pool(app).execute("DELETE FROM devices WHERE device_id = $1", device_id)
    if result == "DELETE 0":
        raise HTTPException(404, "Device not found")


# ============================================================
# DEVICE GROUPS
# ============================================================

@app.get("/api/groups")
async def list_groups():
    rows = await pool(app).fetch(
        """
        SELECT dg.group_id, dg.name, dg.icon, dg.theme_color, dg.description, dg.tags,
               COUNT(d.device_id) AS total,
               COUNT(*) FILTER (WHERE d.status = 'Online')   AS online,
               COUNT(*) FILTER (WHERE d.status = 'Offline')  AS offline,
               COUNT(*) FILTER (WHERE d.status = 'Updating') AS updating
        FROM device_groups dg
        LEFT JOIN devices d ON d.group_id = dg.group_id
        GROUP BY dg.group_id
        ORDER BY dg.name
        """
    )
    return [
        {
            "id": r["group_id"],
            "name": r["name"],
            "icon": r["icon"] or "Layers",
            "color": r["theme_color"] or GROUP_FALLBACK_COLORS[i % len(GROUP_FALLBACK_COLORS)],
            "total": r["total"],
            "online": r["online"],
            "offline": r["offline"],
            "updating": r["updating"],
            "desc": r["description"] or "",
            "tags": r["tags"] or [],
        }
        for i, r in enumerate(rows)
    ]


@app.post("/api/groups", status_code=201)
async def create_group(payload: dict):
    if not payload.get("name"):
        raise HTTPException(400, "name is required")
    try:
        row = await pool(app).fetchrow(
            """
            INSERT INTO device_groups (name, icon, theme_color, description, tags)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING group_id
            """,
            payload["name"], payload.get("icon", "Layers"), payload.get("color", "#3B82F6"),
            payload.get("description", ""), payload.get("tags", []),
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, f"A group named '{payload['name']}' already exists")
    return {
        "id": row["group_id"], "name": payload["name"], "icon": payload.get("icon", "Layers"),
        "color": payload.get("color", "#3B82F6"), "total": 0, "online": 0, "offline": 0,
        "updating": 0, "desc": payload.get("description", ""), "tags": payload.get("tags", []),
    }


# ============================================================
# FIRMWARE
# ============================================================

@app.get("/api/firmware")
async def list_firmware():
    rows = await pool(app).fetch(
        """
        SELECT f.firmware_id, f.file_name, f.version, f.status, f.compatible_devices,
               f.size_bytes, f.checksum, f.uploaded_at, u.full_name AS uploaded_by
        FROM firmware f
        LEFT JOIN users u ON f.uploaded_by = u.user_id
        ORDER BY f.uploaded_at DESC
        """
    )
    return [
        {
            "id": r["firmware_id"],
            "name": r["file_name"],
            "version": r["version"],
            "status": r["status"],
            "devices": r["compatible_devices"] or "—",
            "uploadedBy": r["uploaded_by"] or "Unknown",
            "uploadedAt": fmt_datetime_long(r["uploaded_at"]),
            "size": fmt_size(r["size_bytes"]),
            "checksum": (r["checksum"] or "")[:8],
        }
        for r in rows
    ]


@app.post("/api/firmware", status_code=201)
async def upload_firmware(
    file: UploadFile = File(...),
    version: str = Form(...),
    compatible_devices: str = Form("ESP32"),
    uploaded_by: Optional[str] = Form(None),  # user_id (UUID) as string
):
    contents = await file.read()
    checksum = hashlib.sha256(contents).hexdigest()
    dest_path = FIRMWARE_STORAGE_DIR / f"{version}_{file.filename}"
    dest_path.write_bytes(contents)

    row = await pool(app).fetchrow(
        """
        INSERT INTO firmware (file_name, version, status, compatible_devices,
                               size_bytes, checksum, uploaded_by, file_path)
        VALUES ($1, $2, 'Draft', $3, $4, $5, $6, $7)
        RETURNING firmware_id
        """,
        file.filename, version, compatible_devices, len(contents), checksum,
        uploaded_by, str(dest_path),
    )
    return {"id": row["firmware_id"], "version": version, "checksum": checksum[:8]}


# ============================================================
# OTA UPDATES
# ============================================================

@app.get("/api/ota-updates")
async def list_ota_updates():
    rows = await pool(app).fetch(
        """
        SELECT o.update_id, o.job_name, f.version AS firmware_version,
               dg.name AS target_group, o.status, o.progress_percentage,
               o.update_type, o.created_at
        FROM ota_updates o
        JOIN firmware f ON o.firmware_id = f.firmware_id
        LEFT JOIN device_groups dg ON o.target_group_id = dg.group_id
        ORDER BY o.created_at DESC
        """
    )
    return [
        {
            "id": r["update_id"],
            "name": r["job_name"],
            "firmware": r["firmware_version"],
            "target": r["target_group"] or "—",
            "status": r["status"],
            "progress": r["progress_percentage"],
            "created": fmt_datetime_long(r["created_at"]),
            "type": r["update_type"],
        }
        for r in rows
    ]


@app.post("/api/ota-updates", status_code=201)
async def create_ota_update(payload: dict):
    required = ["name", "firmware", "target", "type"]
    if not all(payload.get(k) for k in required):
        raise HTTPException(400, "name, firmware, target, and type are required")

    async with pool(app).acquire() as conn:
        firmware_row = await conn.fetchrow(
            "SELECT firmware_id FROM firmware WHERE version = $1", payload["firmware"]
        )
        if not firmware_row:
            raise HTTPException(404, f"Firmware '{payload['firmware']}' not found")

        group_row = await conn.fetchrow(
            "SELECT group_id FROM device_groups WHERE name = $1", payload["target"]
        )
        if not group_row:
            raise HTTPException(404, f"Group '{payload['target']}' not found")

        row = await conn.fetchrow(
            """
            INSERT INTO ota_updates (job_name, firmware_id, target_group_id, status,
                                      progress_percentage, update_type)
            VALUES ($1, $2, $3, 'In Progress', 0, $4)
            RETURNING update_id, created_at
            """,
            payload["name"], firmware_row["firmware_id"], group_row["group_id"], payload["type"],
        )
    return {
        "id": row["update_id"],
        "name": payload["name"],
        "firmware": payload["firmware"],
        "target": payload["target"],
        "status": "In Progress",
        "progress": 0,
        "created": fmt_datetime_long(row["created_at"]),
        "type": payload["type"],
    }


@app.patch("/api/ota-updates/{update_id}")
async def update_ota_status(update_id: int, payload: dict):
    status = payload.get("status")
    if status not in ("Success", "In Progress", "Failed"):
        raise HTTPException(400, "Invalid status")
    progress = payload.get("progress")
    if progress is not None and not (0 <= progress <= 100):
        raise HTTPException(400, "progress must be between 0 and 100")

    if progress is not None:
        result = await pool(app).execute(
            "UPDATE ota_updates SET status = $1, progress_percentage = $2 WHERE update_id = $3",
            status, progress, update_id,
        )
    else:
        result = await pool(app).execute(
            "UPDATE ota_updates SET status = $1 WHERE update_id = $2", status, update_id,
        )
    if result == "UPDATE 0":
        raise HTTPException(404, "OTA update not found")
    return {"id": update_id, "status": status, "progress": progress}


# ============================================================
# SYSTEM LOGS
# ============================================================

@app.get("/api/logs")
async def list_logs(limit: int = 100):
    rows = await pool(app).fetch(
        "SELECT level, occurred_at, source, message FROM system_logs "
        "ORDER BY occurred_at DESC LIMIT $1",
        limit,
    )
    return [
        {
            "level": r["level"],
            "time": fmt_log_time(r["occurred_at"]),
            "source": r["source"],
            "msg": r["message"],
        }
        for r in rows
    ]


# ============================================================
# USERS
# ============================================================

@app.get("/api/users")
async def list_users():
    rows = await pool(app).fetch(
        "SELECT user_id, full_name, student_id, role, email, status, department, last_login_at "
        "FROM users ORDER BY full_name"
    )
    return [
        {
            "id": r["student_id"],
            "userId": str(r["user_id"]),
            "name": r["full_name"],
            "role": r["role"],
            "email": r["email"],
            "status": r["status"],
            "dept": r["department"],
            "lastLogin": fmt_date_short(r["last_login_at"]),
        }
        for r in rows
    ]


@app.post("/api/users", status_code=201)
async def create_user(payload: dict):
    required = ["name", "id", "role", "email", "dept"]
    if not all(payload.get(k) for k in required):
        raise HTTPException(400, "name, id, role, email, and dept are required")
    try:
        row = await pool(app).fetchrow(
            """
            INSERT INTO users (student_id, full_name, email, password_hash, role, department, status)
            VALUES ($1, $2, $3, 'CHANGE_ME', $4, $5, 'Offline')
            RETURNING user_id
            """,
            payload["id"], payload["name"], payload["email"], payload["role"], payload["dept"],
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "A user with that student ID or email already exists")
    return {"userId": str(row["user_id"]), "id": payload["id"], "name": payload["name"]}


@app.delete("/api/users/{student_id}", status_code=204)
async def delete_user(student_id: str):
    result = await pool(app).execute("DELETE FROM users WHERE student_id = $1", student_id)
    if result == "DELETE 0":
        raise HTTPException(404, "User not found")


# ============================================================
# DASHBOARD SUMMARY (charts + top stat cards)
# ============================================================

@app.get("/api/dashboard/summary")
async def dashboard_summary():
    async with pool(app).acquire() as conn:
        status_rows = await conn.fetch(
            "SELECT status, COUNT(*) AS value FROM devices GROUP BY status"
        )
        group_rows = await conn.fetch(
            """
            SELECT dg.name, dg.theme_color, COUNT(d.device_id) AS count
            FROM device_groups dg
            LEFT JOIN devices d ON d.group_id = dg.group_id
            GROUP BY dg.group_id
            ORDER BY count DESC
            """
        )
        ota_trend_rows = await conn.fetch(
            """
            SELECT to_char(created_at, 'DD Mon') AS day,
                   COUNT(*) FILTER (WHERE status = 'Success')     AS success,
                   COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
                   COUNT(*) FILTER (WHERE status = 'Failed')      AS failed
            FROM ota_updates
            WHERE created_at > now() - INTERVAL '7 days'
            GROUP BY day, date_trunc('day', created_at)
            ORDER BY date_trunc('day', created_at)
            """
        )
        total_devices = await conn.fetchval("SELECT COUNT(*) FROM devices")
        online_devices = await conn.fetchval("SELECT COUNT(*) FROM devices WHERE status = 'Online'")
        total_firmware = await conn.fetchval("SELECT COUNT(*) FROM firmware")
        total_ota = await conn.fetchval("SELECT COUNT(*) FROM ota_updates")
        active_alerts = await conn.fetchval(
            "SELECT COUNT(*) FROM system_logs WHERE level IN ('WARN','ERROR') "
            "AND occurred_at > now() - INTERVAL '24 hours'"
        )

    total_group_devices = sum(r["count"] for r in group_rows) or 1

    return {
        "deviceStatusData": [
            {
                "name": r["status"],
                "value": r["value"],
                "color": DEVICE_STATUS_COLORS.get(r["status"], "#94A3B8"),
            }
            for r in status_rows
        ],
        "devicesByGroup": [
            {
                "name": r["name"],
                "count": r["count"],
                "pct": round((r["count"] / total_group_devices) * 100),
                "color": r["theme_color"] or GROUP_FALLBACK_COLORS[i % len(GROUP_FALLBACK_COLORS)],
            }
            for i, r in enumerate(group_rows)
        ],
        "otaChartData": [
            {
                "day": r["day"],
                "success": r["success"],
                "inProgress": r["in_progress"],
                "failed": r["failed"],
            }
            for r in ota_trend_rows
        ],
        "stats": {
            "totalDevices": total_devices,
            "online": online_devices,
            "totalFirmware": total_firmware,
            "otaUpdates": total_ota,
            "activeAlerts": active_alerts,
        },
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ============================================================
# Architectural note — FastAPI + DB pool under MQTT load
# ============================================================
# Size the asyncpg pool (min_size/max_size above) to the rate of MQTT
# telemetry writes, not HTTP request volume — bursty sensor traffic hits
# the DB far harder than dashboard page loads. Don't INSERT per MQTT
# packet: buffer messages in the broker callback and flush in batches
# (executemany / COPY) on a short interval. Keep pool_pre_ping-style
# health checks (asyncpg recycles dead connections via max_inactive_connection_lifetime)
# so a flaky connection doesn't silently stall the next batch write.