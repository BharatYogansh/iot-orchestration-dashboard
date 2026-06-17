// src/api.js
// Centralized fetch client. Every dashboard data call goes through here
// so the base URL, error handling, and JSON parsing live in one place.

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: options.body instanceof FormData
      ? undefined
      : { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON, keep statusText
    }
    throw new Error(`${res.status} ${detail}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────
export const login = (email, password) =>
  request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const register = (data) =>
  request("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
export const logout = (email) =>
  request("/api/auth/logout", { method: "POST", body: JSON.stringify({ email }) });

// ── Devices ──────────────────────────────────────────────
export const getDevices = () => request("/api/devices");
export const createDevice = (data) =>
  request("/api/devices", { method: "POST", body: JSON.stringify(data) });
export const updateDeviceStatus = (id, status) =>
  request(`/api/devices/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const deleteDevice = (id) =>
  request(`/api/devices/${id}`, { method: "DELETE" });

// ── Device Groups ────────────────────────────────────────
export const getGroups = () => request("/api/groups");
export const createGroup = (data) =>
  request("/api/groups", { method: "POST", body: JSON.stringify(data) });

// ── Firmware ─────────────────────────────────────────────
export const getFirmware = () => request("/api/firmware");
export const uploadFirmware = (file, { version, compatibleDevices, uploadedBy }) => {
  const form = new FormData();
  form.append("file", file);
  form.append("version", version);
  form.append("compatible_devices", compatibleDevices || "ESP32");
  if (uploadedBy) form.append("uploaded_by", uploadedBy);
  return request("/api/firmware", { method: "POST", body: form });
};

// ── OTA Updates ──────────────────────────────────────────
export const getOtaUpdates = () => request("/api/ota-updates");
export const createOtaUpdate = (data) =>
  request("/api/ota-updates", { method: "POST", body: JSON.stringify(data) });
export const updateOtaStatus = (id, data) =>
  request(`/api/ota-updates/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ── Logs ─────────────────────────────────────────────────
export const getLogs = (limit = 100) => request(`/api/logs?limit=${limit}`);

// ── Users ────────────────────────────────────────────────
export const getUsers = () => request("/api/users");
export const createUser = (data) =>
  request("/api/users", { method: "POST", body: JSON.stringify(data) });
export const deleteUser = (studentId) =>
  request(`/api/users/${studentId}`, { method: "DELETE" });

// ── Dashboard summary (chart data + stat cards) ─────────────
export const getDashboardSummary = () => request("/api/dashboard/summary");