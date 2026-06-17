// src/context/DataContext.jsx
// One fetch on mount, shared everywhere. Pages that used to do
// `useState(INITIAL_DEVICES)` etc. now call useDashboardData() instead —
// same shapes, just backed by the real API.

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "../api";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [firmware, setFirmware] = useState([]);
  const [otaUpdates, setOtaUpdates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    deviceStatusData: [], devicesByGroup: [], otaChartData: [],
    stats: { totalDevices: 0, online: 0, totalFirmware: 0, otaUpdates: 0, activeAlerts: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, g, f, o, l, u, s] = await Promise.all([
        api.getDevices(), api.getGroups(), api.getFirmware(),
        api.getOtaUpdates(), api.getLogs(), api.getUsers(),
        api.getDashboardSummary(),
      ]);
      setDevices(d); setGroups(g); setFirmware(f);
      setOtaUpdates(o); setLogs(l); setUsers(u); setSummary(s);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Mutations: call the API, then patch local state so the UI
  // updates immediately without a full refetch. ──
  const addDevice = async (data) => {
    await api.createDevice(data);
    setDevices((prev) => [...prev, { ...data, status: "Offline", lastSeen: "Just now" }]);
  };

  const removeDevice = async (id) => {
    await api.deleteDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const addOtaUpdate = async (data) => {
    const created = await api.createOtaUpdate(data);
    setOtaUpdates((prev) => [created, ...prev]);
  };

  const setOtaStatus = async (id, statusPatch) => {
    await api.updateOtaStatus(id, statusPatch);
    setOtaUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, ...statusPatch } : u)));
  };

  const addUser = async (data) => {
    await api.createUser(data);
    setUsers((prev) => [...prev, { ...data, status: "Offline", lastLogin: "—" }]);
  };

  const removeUser = async (studentId) => {
    await api.deleteUser(studentId);
    setUsers((prev) => prev.filter((u) => u.id !== studentId));
  };

  const addFirmwareFile = async (file, meta) => {
    await api.uploadFirmware(file, meta);
    await refetch(); // simplest: re-pull firmware list + stats after upload
  };

  const addGroup = async (data) => {
    const created = await api.createGroup(data);
    setGroups((prev) => [...prev, created]);
  };

  const value = {
    devices, groups, firmware, otaUpdates, logs, users, summary,
    loading, error, refetch,
    addDevice, removeDevice, addOtaUpdate, addUser, removeUser, addFirmwareFile, addGroup,
    setOtaStatus,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDashboardData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDashboardData must be used inside <DataProvider>");
  return ctx;
}