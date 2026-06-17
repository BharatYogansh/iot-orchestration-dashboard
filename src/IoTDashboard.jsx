import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Cpu, Layers, Microchip, Upload, FileText,
  Bell, Users, Settings, ChevronLeft, ChevronRight, Search,
  Moon, Sun, TrendingUp, TrendingDown, Minus, Wifi, WifiOff,
  RefreshCw, AlertTriangle, Eye, MoreVertical, CheckCircle2,
  XCircle, Clock, Activity, Shield, Zap, Database, Server,
  GitBranch, Package, ChevronDown, X, Info, ArrowRight,
  BarChart3, Home, LogOut, Lock, Mail, User, Plus, Filter,
  Download, Trash2, Edit2, Play, Pause, RotateCcw, Check,
  AlertCircle, Terminal, Radio, HardDrive, Gauge, Grid,
  List, UploadCloud, FilePlus, Tag, Monitor, Smartphone,
  Laptop, Globe, Key, Save, ToggleLeft, ToggleRight,
  ChevronUp, Building2, Factory, Warehouse, Briefcase,
  Send, MapPin, Calendar, Hash, Sliders, Power,
  Signal, Bolt, Link2, ExternalLink, Copy, Star,
  ShieldCheck, UserCheck, BookOpen, Award
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  BarChart, Bar, Legend
} from "recharts";
import { useDashboardData } from "./context/DataContext.jsx";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "./api";

// ─────────────────────────────────────────────────────────────
// THEME CONSTANTS
// ─────────────────────────────────────────────────────────────
const DARK = {
  bg: "#0B0F19", card: "#111827", sidebar: "#0D1117",
  border: "rgba(255,255,255,0.07)", text: "#F1F5F9",
  muted: "#64748B", accent: "#3B82F6", success: "#10B981",
  warn: "#F59E0B", error: "#EF4444", purple: "#8B5CF6",
  hover: "rgba(59,130,246,0.08)", active: "rgba(59,130,246,0.15)",
  input: "#1A2035", badge: "#1E2A3A", header: "#0E1320",
  tableRow: "rgba(255,255,255,0.015)", tableHover: "rgba(255,255,255,0.04)",
  tableHead: "rgba(255,255,255,0.03)", divider: "rgba(255,255,255,0.05)",
  terminal: "#0A0D14", subtext: "#94A3B8",
};
const LIGHT = {
  bg: "#F0F4FF", card: "#FFFFFF", sidebar: "#1E293B",
  border: "rgba(0,0,0,0.08)", text: "#0F172A",
  muted: "#64748B", accent: "#2563EB", success: "#059669",
  warn: "#D97706", error: "#DC2626", purple: "#7C3AED",
  hover: "rgba(37,99,235,0.06)", active: "rgba(37,99,235,0.12)",
  input: "#EEF2FF", badge: "#DBEAFE", header: "#1E293B",
  tableRow: "rgba(0,0,0,0.01)", tableHover: "rgba(37,99,235,0.04)",
  tableHead: "rgba(0,0,0,0.03)", divider: "rgba(0,0,0,0.06)",
  terminal: "#0A0D14", subtext: "#475569",
};

// ─────────────────────────────────────────────────────────────
// DATA
// (Mock arrays removed — devices, groups, firmware, OTA updates,
// logs, and users now come from useDashboardData(), backed by
// the FastAPI + PostgreSQL service. See src/context/DataContext.jsx)
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { id: "devices",        label: "Devices",        icon: Cpu },
  { id: "device-groups",  label: "Device Groups",  icon: Layers },
  { id: "firmware",       label: "Firmware",       icon: Microchip },
  { id: "ota-updates",    label: "OTA Updates",    icon: Upload },
  { id: "logs",           label: "Logs & Alerts",  icon: FileText },
  { id: "users",          label: "Users",          icon: Users },
  { id: "settings",       label: "Settings",       icon: Settings },
];

// Built fresh each render from live data instead of a static module
// constant, since devices/firmware/groups now change at runtime.
function buildSearchSuggestions(devices) {
  return [
    ...devices.map(d => d.id),
    ...devices.map(d => d.name),
    "Factory A", "Factory B", "Office", "Warehouse", "R&D Lab", "Remote Sites",
    "v1.1.0", "v1.0.9", "v1.0.8", "v1.0.7",
    "Online", "Offline", "Updating", "Error",
    "ESP32", "ESP8266", "MQTT", "OTA", "Firmware",
  ];
}

// Lucide icon lookup for groups — backend sends the icon as a string
// key (e.g. "Factory"), this maps it back to the actual component.
const GROUP_ICONS = { Factory, Building2, Warehouse, Briefcase, Globe, Layers };

// ─────────────────────────────────────────────────────────────
// SEARCH DROPDOWN HOOK
// ─────────────────────────────────────────────────────────────
function useSearchDropdown(suggestions) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const ref = useRef(null);

  const filtered = query.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 7)
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === "Enter" && focused >= 0) { setQuery(filtered[focused]); setOpen(false); }
    if (e.key === "Escape") setOpen(false);
  };

  const pick = (val) => { setQuery(val); setOpen(false); setFocused(-1); };

  return { query, setQuery, open, setOpen, filtered, focused, ref, handleKeyDown, pick };
}

// ─────────────────────────────────────────────────────────────
// UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Online:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    Offline:      "bg-red-500/15 text-red-400 border-red-500/25",
    Updating:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
    Error:        "bg-rose-500/15 text-rose-400 border-rose-500/25",
    Success:      "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    "In Progress":"bg-blue-500/15 text-blue-400 border-blue-500/25",
    Failed:       "bg-red-500/15 text-red-400 border-red-500/25",
    Active:       "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    Deprecated:   "bg-red-500/15 text-red-400 border-red-500/25",
    Draft:        "bg-slate-500/15 text-slate-400 border-slate-500/25",
    Mandatory:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
    Optional:     "bg-purple-500/15 text-purple-400 border-purple-500/25",
    "Super Admin":"bg-amber-500/15 text-amber-400 border-amber-500/25",
    Admin:        "bg-blue-500/15 text-blue-400 border-blue-500/25",
    Manager:      "bg-purple-500/15 text-purple-400 border-purple-500/25",
    Operator:     "bg-teal-500/15 text-teal-400 border-teal-500/25",
  };
  const pulse = ["Online","Updating","In Progress"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${map[status] || "bg-slate-500/15 text-slate-400 border-slate-500/25"}`}>
      {pulse && <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${status==="Online"?"bg-emerald-400":status==="In Progress"?"bg-blue-400":"bg-amber-400"}`} />}
      {status}
    </span>
  );
}

function Modal({ title, onClose, children, wide, t }) {
  const bg   = t ? t.card : "#111827";
  const border = t ? t.border : "rgba(255,255,255,0.1)";
  const text   = t ? t.text  : "#F1F5F9";
  const divider = t ? t.divider : "rgba(255,255,255,0.08)";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className={`border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col ${wide ? "w-full max-w-3xl max-h-[90vh]" : "w-full max-w-lg max-h-[85vh]"}`}
        style={{ background: bg, borderColor: border }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${divider}` }}>
          <h2 className="font-bold text-base" style={{ color: text }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
            <X size={15} className="text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function ProgressBar({ value, color = "#3B82F6" }) {
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

// Theme-aware Card
function Card({ children, className = "", t }) {
  const T = t || DARK;
  return (
    <div className={`rounded-xl ${className}`} style={{ background: T.card, border: `1px solid ${T.border}` }}>
      {children}
    </div>
  );
}

// Theme-aware Input
function Input({ label, icon: Icon, type = "text", placeholder, value, onChange, className = "", t }) {
  const T = t || DARK;
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>{label}</label>}
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.muted }} />}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg text-sm outline-none transition-all"
          style={{
            background: T.input, border: `1px solid ${T.border}`,
            color: T.text, padding: Icon ? "10px 12px 10px 36px" : "10px 12px",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEARCH BAR WITH SUGGESTIONS
// ─────────────────────────────────────────────────────────────
function SearchBar({ placeholder, suggestions, value, onChange, onSelect, t, className = "" }) {
  const T = t || DARK;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const ref = useRef(null);

  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 7)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => Math.min(f + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === "Enter") {
      if (focused >= 0 && filtered[focused]) { onSelect(filtered[focused]); setOpen(false); }
      else setOpen(false);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const pick = (val) => { onSelect(val); setOpen(false); setFocused(-1); };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.muted }} />
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setFocused(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg text-xs outline-none transition-all pl-8 pr-4 py-2.5"
        style={{ background: T.input, border: `1px solid ${T.border}`, color: T.text }}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 overflow-hidden"
          style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <span className="text-xs font-semibold" style={{ color: T.muted }}>Suggestions</span>
          </div>
          {filtered.map((s, i) => (
            <button key={s} onClick={() => pick(s)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors"
              style={{
                background: focused === i ? T.active : "transparent",
                color: focused === i ? T.accent : T.text,
              }}
              onMouseEnter={() => setFocused(i)}>
              <Search size={10} style={{ color: T.muted }} />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTH PAGE
// ─────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [view, setView] = useState("login");
  const [form, setForm] = useState({
    email: "bharat.yogansh@rce.ac.in", password: "demo1234", name: "", confirm: "",
    studentId: "", department: "Engineering",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setErr("");
    if (view === "register" && form.password !== form.confirm) { setErr("Passwords do not match."); return; }
    setLoading(true);
    try {
      const user = view === "login"
        ? await apiLogin(form.email, form.password)
        : await apiRegister({
            name: form.name, email: form.email, password: form.password,
            studentId: form.studentId, department: form.department,
          });
      onLogin(user);
    } catch (err) {
      setErr(err.message.replace(/^\d+\s/, "")); // strip leading "401 "/"409 " status code
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-5" style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-5" style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-4">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">IoT OTA Orchestration</h1>
          <p className="text-slate-500 text-sm mt-1">Roorkee College of Engineering</p>
        </div>

        <div className="bg-[#111827] border border-white/8 rounded-2xl p-8 shadow-2xl shadow-black/50">
          <div className="flex bg-white/5 rounded-lg p-1 mb-6">
            {["login","register"].map(v => (
              <button key={v} onClick={() => { setView(v); setErr(""); }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all ${view===v ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "text-slate-400 hover:text-white"}`}>
                {v === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handle} className="space-y-4">
            {view === "register" && (
              <>
                <Input label="Full Name" icon={User} placeholder="Enter your full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Student ID" icon={Tag} placeholder="e.g. 221020124003" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})} />
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-slate-400">Department</label>
                    <select value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                      className="w-full rounded-lg text-sm outline-none px-3 py-2.5 bg-white/5 border border-white/10 text-white">
                      <option>Engineering</option><option>Operations</option><option>Field Ops</option>
                      <option>Management</option><option>R&D</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <Input label="Email Address" icon={Mail} type="email" placeholder="admin@iot.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <Input label="Password" icon={Lock} type="password" placeholder="Enter your password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            {view === "register" && (
              <Input label="Confirm Password" icon={Lock} type="password" placeholder="Confirm password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
            )}
            {err && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-xs">{err}</span>
              </div>
            )}
            {view === "login" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input type="checkbox" className="rounded" /> Remember me
                </label>
                <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</button>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading ? <><RefreshCw size={15} className="animate-spin" /> Authenticating...</> : <>{view === "login" ? "Sign In to Dashboard" : "Create Account"}</>}
            </button>
          </form>

          {view === "login" && (
            <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/15 rounded-lg">
              <p className="text-xs text-slate-500 text-center">Demo: <span className="text-blue-400 font-mono">bharat.yogansh@rce.ac.in</span> / <span className="text-blue-400 font-mono">demo1234</span></p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">Guide: Ms. Pooja Pramar · Project Under Development</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, trend, trendVal, icon: Icon, color, t }) {
  const T = t || DARK;
  const up = trend === "up", flat = trend === "flat";
  return (
    <div className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4 group transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider font-medium" style={{ color: T.muted }}>{label}</p>
        <p className="text-2xl font-black mt-0.5" style={{ color: T.text }}>{value}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {flat ? <Minus size={11} className="text-slate-500" /> : up ? <TrendingUp size={11} className="text-emerald-400" /> : <TrendingDown size={11} className="text-red-400" />}
          <span className={`text-xs font-semibold ${flat?"text-slate-500":up?"text-emerald-400":"text-red-400"}`}>{trendVal}</span>
          <span className="text-xs ml-0.5" style={{ color: T.muted }}>vs last month</span>
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.06] group-hover:opacity-10 transition-opacity" style={{ background: color }} />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0F1420] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, total, t }) {
  const T = t || DARK;
  const [active, setActive] = useState(null);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative flex-shrink-0" style={{ width: 164, height: 164 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none"
              onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
              {data.map((e, i) => <Cell key={i} fill={e.color} opacity={active===null||active===i?1:0.35} style={{cursor:"pointer",transition:"opacity 0.2s"}} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black" style={{ color: T.text }}>{active!==null ? data[active].value.toLocaleString() : total.toLocaleString()}</span>
          <span className="text-xs" style={{ color: T.muted }}>{active!==null ? data[active].name : "Total"}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 text-sm flex-1">
        {data.map((d,i) => (
          <div key={i} className={`flex items-center gap-2 cursor-pointer transition-opacity ${active!==null&&active!==i?"opacity-35":"opacity-100"}`}
            onMouseEnter={()=>setActive(i)} onMouseLeave={()=>setActive(null)}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:d.color}}/>
            <span className="flex-1 text-xs" style={{ color: T.muted }}>{d.name}</span>
            <span className="font-bold text-xs" style={{ color: T.text }}>{d.value.toLocaleString()}</span>
            <span className="text-xs" style={{ color: T.muted }}>({((d.value/total)*100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
function DashboardPage({ onAbout, setActiveNav, t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { summary, devices, otaUpdates, logs } = useDashboardData();
  const { stats, deviceStatusData, devicesByGroup, otaChartData } = summary;
  const recentAlerts = logs.filter(l => l.level === "ERROR" || l.level === "WARN").slice(0, 4);
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Devices"  value={stats.totalDevices.toLocaleString()} trend="up"   trendVal="↑12.5%" icon={Cpu}    color="#3B82F6" t={T}/>
        <StatCard label="Online"         value={stats.online.toLocaleString()}   trend="up"   trendVal="↑8.3%"  icon={Wifi}   color="#10B981" t={T}/>
        <StatCard label="Total Firmware" value={stats.totalFirmware.toLocaleString()}    trend="flat" trendVal="No change" icon={Microchip} color="#F59E0B" t={T}/>
        <StatCard label="OTA Updates"    value={stats.otaUpdates.toLocaleString()}   trend="up"   trendVal="↑18.7%" icon={Upload}  color="#8B5CF6" t={T}/>
        <StatCard label="Active Alerts"  value={stats.activeAlerts.toLocaleString()}     trend="down" trendVal="↓12.5%" icon={Bell}    color="#EF4444" t={T}/>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5" t={T}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{ color: T.text }}>Device Status</h3>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ color: T.muted, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}>This Month</span>
          </div>
          <DonutChart data={deviceStatusData} total={stats.totalDevices} t={T}/>
          {/* Req 3: "See All" → devices page */}
          <button onClick={() => setActiveNav("devices")} className="mt-4 text-xs flex items-center gap-1 transition-colors hover:gap-2" style={{ color: T.accent }}>
            View all devices <ArrowRight size={11}/>
          </button>
        </Card>

        <Card className="lg:col-span-2 p-5" t={T}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{ color: T.text }}>OTA Update Overview</h3>
            <span className="text-xs px-2 py-1 rounded-lg" style={{ color: T.muted, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}>This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={otaChartData} margin={{top:5,right:5,left:-20,bottom:0}}>
              <defs>
                {[["gS","#10B981"],["gP","#F59E0B"],["gF","#EF4444"]].map(([id,c])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1a2535" : "#e2e8f0"} vertical={false}/>
              <XAxis dataKey="day" tick={{fill: isDark ? "#4b5563" : "#94a3b8", fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill: isDark ? "#4b5563" : "#94a3b8", fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="success"    name="Success"     stroke="#10B981" strokeWidth={2} fill="url(#gS)" dot={{fill:"#10B981",r:3,strokeWidth:0}}/>
              <Area type="monotone" dataKey="inProgress" name="In Progress" stroke="#F59E0B" strokeWidth={2} fill="url(#gP)" dot={{fill:"#F59E0B",r:3,strokeWidth:0}}/>
              <Area type="monotone" dataKey="failed"     name="Failed"      stroke="#EF4444" strokeWidth={2} fill="url(#gF)" dot={{fill:"#EF4444",r:3,strokeWidth:0}}/>
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            {[["#10B981","Success"],["#F59E0B","In Progress"],["#EF4444","Failed"]].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: T.muted }}>
                <span className="w-6 h-0.5 rounded" style={{background:c}}/>{l}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Group breakdown + Alerts + Dev Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5" t={T}>
          <h3 className="font-bold text-sm mb-4" style={{ color: T.text }}>Devices by Group</h3>
          <div className="relative mb-3" style={{height:120}}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={devicesByGroup} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={3} dataKey="count" stroke="none">
                {devicesByGroup.map((e,i)=><Cell key={i} fill={e.color}/>)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black" style={{ color: T.text }}>{stats.totalDevices.toLocaleString()}</span>
              <span className="text-xs" style={{ color: T.muted }}>Total</span>
            </div>
          </div>
          {devicesByGroup.map(d=>(
            <div key={d.name} className="flex items-center gap-2 mb-2 text-xs">
              <span className="w-2 h-2 rounded-full" style={{background:d.color}}/>
              <span className="flex-1" style={{ color: T.muted }}>{d.name} ({d.pct}%)</span>
              <span className="font-bold" style={{ color: T.text }}>{d.count}</span>
            </div>
          ))}
        </Card>

        <Card className="p-5" t={T}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm" style={{ color: T.text }}>Active Alerts</h3>
            <span className="bg-red-500/15 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/20">7</span>
          </div>
          <div className="space-y-2.5">
            {recentAlerts.map((a,i)=>(
              <div key={i} className="flex gap-2.5 rounded-lg px-3 py-2.5" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                <AlertTriangle size={13} className={`mt-0.5 flex-shrink-0 ${a.level==="ERROR"?"text-red-400":"text-amber-400"}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug" style={{ color: T.subtext }}>{a.msg}</p>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>{a.source} · {a.time}</p>
                </div>
              </div>
            ))}
            {recentAlerts.length===0 && <p className="text-xs" style={{ color: T.muted }}>No active alerts.</p>}
          </div>
        </Card>

        <Card className="p-5" t={T}>
          <h3 className="font-bold text-sm mb-4" style={{ color: T.text }}>Dev Progress</h3>
          <div className="space-y-3">
            {[
              {label:"MQTT Communication", done:100, s:"done"},
              {label:"FastAPI Backend",     done:60,  s:"wip"},
              {label:"OTA Payload Delivery",done:45,  s:"wip"},
              {label:"Device Registration", done:10,  s:"pending"},
              {label:"Dashboard Integration",done:5,  s:"pending"},
            ].map(item=>(
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: T.muted }}>{item.label}</span>
                  <span className={`text-xs font-bold ${item.s==="done"?"text-emerald-400":item.s==="wip"?"text-amber-400":"text-slate-600"}`}>{item.done}%</span>
                </div>
                <ProgressBar value={item.done} color={item.s==="done"?"#10B981":item.s==="wip"?"#F59E0B":"#374151"}/>
              </div>
            ))}
          </div>
          <button onClick={onAbout} className="mt-5 w-full text-xs border rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: T.accent }}>
            <Info size={12}/> View Project Info
          </button>
        </Card>
      </div>

      {/* Recent tables — Req 3: "See All" bindings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card t={T}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <h3 className="font-bold text-sm" style={{ color: T.text }}>Recent Devices</h3>
            {/* Req 3: Navigates to Devices page */}
            <button onClick={() => setActiveNav("devices")} className="text-xs flex items-center gap-1 transition-colors hover:gap-2" style={{ color: T.accent }}>
              See All <ArrowRight size={11}/>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.divider}`, background: T.tableHead }}>
                  {["Device ID","Group","Status","Firmware","Last Seen"].map(h=>(
                    <th key={h} className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs" style={{ color: T.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.slice(0,5).map((d,i)=>(
                  <tr key={i} className="transition-colors" style={{ borderBottom: `1px solid ${T.divider}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Cpu size={11} style={{ color: T.accent }}/><span className="font-mono" style={{ color: T.subtext }}>{d.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: T.muted }}>{d.group}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status}/></td>
                    <td className="px-4 py-3 font-mono" style={{ color: T.muted }}>{d.firmware}</td>
                    <td className="px-4 py-3" style={{ color: T.muted }}>{d.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card t={T}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <h3 className="font-bold text-sm" style={{ color: T.text }}>Recent OTA Updates</h3>
            {/* Req 3: Navigates to OTA Updates page */}
            <button onClick={() => setActiveNav("ota-updates")} className="text-xs flex items-center gap-1 transition-colors hover:gap-2" style={{ color: T.accent }}>
              See All <ArrowRight size={11}/>
            </button>
          </div>
          <div style={{ borderTop: "none" }}>
            {otaUpdates.slice(0,5).map((u,i)=>(
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 transition-colors" style={{ borderBottom: i < Math.min(otaUpdates.length,5) - 1 ? `1px solid ${T.divider}` : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${u.status==="Success"?"bg-emerald-500/15":u.status==="In Progress"?"bg-blue-500/15":"bg-red-500/15"}`}>
                  {u.status==="Success"&&<CheckCircle2 size={15} className="text-emerald-400"/>}
                  {u.status==="In Progress"&&<RefreshCw size={15} className="text-blue-400 animate-spin"/>}
                  {u.status==="Failed"&&<XCircle size={15} className="text-red-400"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: T.subtext }}>{u.name}</p>
                  <div className="mt-1"><ProgressBar value={u.progress} color={u.status==="Success"?"#10B981":u.status==="In Progress"?"#3B82F6":"#EF4444"}/></div>
                </div>
                <StatusBadge status={u.status}/>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEVICES PAGE (with search dropdown)
// ─────────────────────────────────────────────────────────────
function DevicesPage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { devices, addDevice: addDeviceApi, removeDevice } = useDashboardData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [newDev, setNewDev] = useState({ id:"", name:"", group:"Factory A", type:"ESP32", ip:"", firmware:"v1.1.0" });

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = d.id.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || d.group.toLowerCase().includes(q);
    const matchFilter = filter==="All" || d.status===filter;
    return matchSearch && matchFilter;
  });

  const handleAddDevice = async () => {
    if (!newDev.id) return;
    await addDeviceApi(newDev);
    setShowAdd(false);
    setNewDev({ id:"", name:"", group:"Factory A", type:"ESP32", ip:"", firmware:"v1.1.0" });
  };

  const counts = { All: devices.length, Online: devices.filter(d=>d.status==="Online").length, Offline: devices.filter(d=>d.status==="Offline").length, Error: devices.filter(d=>d.status==="Error").length };
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Total Devices",counts.All,"#3B82F6",Cpu],["Online",counts.Online,"#10B981",Wifi],["Offline",counts.Offline,"#EF4444",WifiOff],["Error",counts.Error,"#8B5CF6",AlertCircle]].map(([l,v,c,Icon])=>(
          <Card key={l} className="p-4 flex items-center gap-3" t={T}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${c}22`}}>
              <Icon size={16} style={{color:c}}/>
            </div>
            <div>
              <p className="text-xs" style={{ color: T.muted }}>{l}</p>
              <p className="text-xl font-black" style={{ color: T.text }}>{v}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card t={T}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          {/* Req 2: Device search with suggestions dropdown */}
          <SearchBar
            placeholder="Search devices by ID, name or group..."
            suggestions={buildSearchSuggestions(devices)}
            value={search}
            onChange={setSearch}
            onSelect={setSearch}
            t={T}
            className="flex-1 min-w-0 w-full sm:w-auto"
          />
          <div className="flex gap-1">
            {["All","Online","Offline","Error"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: filter===f ? T.accent : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: filter===f ? "#fff" : T.muted }}>
                {f} <span className="ml-1 opacity-60">({counts[f]})</span>
              </button>
            ))}
          </div>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg whitespace-nowrap" style={{ background: T.accent }}>
            <Plus size={13}/> Add Device
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.divider}`, background: T.tableHead }}>
                {["Device ID","Name","Group","Status","Firmware","IP Address","Last Seen","Actions"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide" style={{ color: T.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d,i)=>(
                <tr key={i} className="transition-colors group" style={{ borderBottom: `1px solid ${T.divider}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Cpu size={11} style={{ color: T.accent }}/><span className="font-mono" style={{ color: T.subtext }}>{d.id}</span></div></td>
                  <td className="px-4 py-3 font-medium" style={{ color: T.subtext }}>{d.name}</td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{d.group}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status}/></td>
                  <td className="px-4 py-3 font-mono" style={{ color: T.muted }}>{d.firmware}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: T.muted }}>{d.ip}</td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{d.lastSeen}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Eye size={12} style={{ color: T.muted }}/></button>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-amber-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Edit2 size={12} style={{ color: T.muted }}/></button>
                      <button onClick={()=>removeDevice(d.id)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Trash2 size={12} className="text-red-400"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 text-xs" style={{ borderTop: `1px solid ${T.divider}`, color: T.muted }}>
          Showing {filtered.length} of {devices.length} devices
        </div>
      </Card>

      {showAdd && (
        <Modal title="Add New Device" onClose={()=>setShowAdd(false)} t={T}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Device ID / Serial *" icon={Hash} placeholder="e.g. ESP32-00200" value={newDev.id} onChange={e=>setNewDev({...newDev,id:e.target.value})} t={T}/>
              <Input label="Device Name" icon={Tag} placeholder="e.g. Sensor Node 10" value={newDev.name} onChange={e=>setNewDev({...newDev,name:e.target.value})} t={T}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Device Group</label>
                <select value={newDev.group} onChange={e=>setNewDev({...newDev,group:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["Factory A","Factory B","Office","Warehouse","R&D Lab"].map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Device Type</label>
                <select value={newDev.type} onChange={e=>setNewDev({...newDev,type:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["ESP32","ESP8266","Arduino","Raspberry Pi"].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="IP Address" icon={Globe} placeholder="192.168.1.x" value={newDev.ip} onChange={e=>setNewDev({...newDev,ip:e.target.value})} t={T}/>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Firmware Version</label>
                <select value={newDev.firmware} onChange={e=>setNewDev({...newDev,firmware:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["v1.1.0","v1.0.9","v1.0.8"].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-lg text-sm transition-colors" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
              <button onClick={handleAddDevice} className="flex-1 py-2.5 rounded-lg text-sm text-white font-bold transition-all shadow-lg" style={{ background: T.accent }}>Create Device</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DEVICE GROUPS PAGE
// ─────────────────────────────────────────────────────────────
function DeviceGroupsPage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const [showAdd, setShowAdd] = useState(false);
  const { groups, addGroup } = useDashboardData();
  const totalDevices = groups.reduce((sum,g)=>sum+g.total,0);
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  const GROUP_TYPE_TO_ICON = { Production: "Factory", Office: "Building2", Warehouse: "Warehouse", "R&D": "Briefcase", Remote: "Globe" };
  const [newGroup, setNewGroup] = useState({ name: "", description: "", type: "Production" });
  const [groupError, setGroupError] = useState("");

  const handleAddGroup = async () => {
    if (!newGroup.name) { setGroupError("Group name is required"); return; }
    try {
      setGroupError("");
      await addGroup({
        name: newGroup.name,
        description: newGroup.description,
        icon: GROUP_TYPE_TO_ICON[newGroup.type] || "Layers",
        tags: [newGroup.type.toLowerCase()],
      });
      setShowAdd(false);
      setNewGroup({ name: "", description: "", type: "Production" });
    } catch (err) {
      setGroupError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl" style={{ color: T.text }}>Device Groups</h2>
          <p className="text-sm mt-0.5" style={{ color: T.muted }}>{groups.length} groups · {totalDevices.toLocaleString()} total devices</p>
        </div>
        <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg" style={{ background: T.accent }}>
          <Plus size={13}/> Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(g=>{
          const Icon = GROUP_ICONS[g.icon] || Layers;
          return (
          <Card key={g.name} className="p-5 transition-all duration-300 hover:-translate-y-0.5 group cursor-pointer" t={T}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${g.color}22`}}>
                  <Icon size={18} style={{color:g.color}}/>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: T.text }}>{g.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: T.muted }}>{g.total} devices</p>
                </div>
              </div>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><MoreVertical size={13} style={{ color: T.muted }}/></button>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: T.muted }}>{g.desc}</p>
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-medium">Online</span>
                  <span style={{ color: T.muted }}>{g.online} ({g.total ? ((g.online/g.total)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}>
                  <div className="h-full bg-emerald-400 rounded-full" style={{width:`${g.total ? (g.online/g.total)*100 : 0}%`}}/>
                </div>
              </div>
              <div className="flex gap-4 text-xs" style={{ color: T.muted }}>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"/>{g.offline} Offline</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block"/>{g.updating} Updating</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.tags.map(tag=>(
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", color: T.muted, border: `1px solid ${T.border}` }}>#{tag}</span>
              ))}
            </div>
          </Card>
        );})}
      </div>

      {showAdd && (
        <Modal title="Add New Group" onClose={()=>setShowAdd(false)} t={T}>
          <div className="p-6 space-y-4">
            <Input label="Group Name *" icon={Tag} placeholder="e.g. Production Line C" value={newGroup.name} onChange={e=>setNewGroup({...newGroup, name:e.target.value})} t={T}/>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Description</label>
              <textarea value={newGroup.description} onChange={e=>setNewGroup({...newGroup, description:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5 resize-none" rows={3} placeholder="Brief description of this group..." style={{ background: T.input, border: `1px solid ${T.border}`, color: T.text }}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Group Type</label>
                <select value={newGroup.type} onChange={e=>setNewGroup({...newGroup, type:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  <option>Production</option><option>Office</option><option>Warehouse</option><option>R&D</option><option>Remote</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Status</label>
                <select className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  <option>Active</option><option>Inactive</option>
                </select>
              </div>
            </div>
            {groupError && <p className="text-xs text-red-400">{groupError}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-lg text-sm transition-colors" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
              <button onClick={handleAddGroup} className="flex-1 py-2.5 rounded-lg text-sm text-white font-bold transition-all" style={{ background: T.accent }}>Create Group</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FIRMWARE PAGE
// ─────────────────────────────────────────────────────────────
function FirmwarePage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { firmware, addFirmwareFile } = useDashboardData();
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [version, setVersion] = useState("");
  const [deviceType, setDeviceType] = useState("ESP32");
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  const handleUpload = async () => {
    if (!uploadFile || !version) { setUploadError("File and version are required"); return; }
    setUploadError("");
    setUploading(true);
    try {
      await addFirmwareFile(uploadFile, { version, compatibleDevices: deviceType });
      setUploading(false);
      setUploadDone(true);
      setTimeout(()=>{ setShowUpload(false); setUploadDone(false); setUploadFile(null); setVersion(""); },1500);
    } catch (err) {
      setUploading(false);
      setUploadError(err.message);
    }
  };

  const counts = {
    total: firmware.length,
    active: firmware.filter(f=>f.status==="Active").length,
    deprecated: firmware.filter(f=>f.status==="Deprecated").length,
    draft: firmware.filter(f=>f.status==="Draft").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Total Firmware",counts.total,"#3B82F6",Package],["Active",counts.active,"#10B981",CheckCircle2],["Deprecated",counts.deprecated,"#EF4444",XCircle],["Drafts",counts.draft,"#94A3B8",FileText]].map(([l,v,c,Icon])=>(
          <Card key={l} className="p-4 flex items-center gap-3" t={T}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${c}22`}}><Icon size={16} style={{color:c}}/></div>
            <div><p className="text-xs" style={{ color: T.muted }}>{l}</p><p className="text-xl font-black" style={{ color: T.text }}>{v}</p></div>
          </Card>
        ))}
      </div>

      <Card t={T}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <h3 className="font-bold text-sm" style={{ color: T.text }}>Firmware Repository</h3>
          <button onClick={()=>setShowUpload(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg" style={{ background: T.accent }}>
            <UploadCloud size={13}/> Upload Firmware
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.divider}`, background: T.tableHead }}>
                {["Firmware","Version","Status","Compatible Devices","Uploaded By","Uploaded At","Checksum","Actions"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide" style={{ color: T.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {firmware.map((f,i)=>(
                <tr key={i} className="transition-colors group" style={{ borderBottom: `1px solid ${T.divider}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Microchip size={12} className="text-amber-400"/><span className="font-semibold" style={{ color: T.subtext }}>{f.name}</span></div></td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: T.accent }}>{f.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status}/></td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{f.devices}</td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{f.uploadedBy}</td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{f.uploadedAt}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs px-2 py-0.5 rounded" style={{ color: T.muted, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>{f.checksum}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Eye size={12} style={{ color: T.muted }}/></button>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Download size={12} style={{ color: T.muted }}/></button>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Trash2 size={12} className="text-red-400"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showUpload && (
        <Modal title="Upload Firmware" onClose={()=>{setShowUpload(false);setUploadFile(null);setUploadDone(false);}} wide t={T}>
          <div className="p-6 space-y-5">
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);setUploadFile(e.dataTransfer.files[0])}}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragOver?"border-blue-500 bg-blue-500/10":uploadFile?"border-emerald-500 bg-emerald-500/5":"hover:border-white/25"}`}
              style={{ borderColor: dragOver ? "#3B82F6" : uploadFile ? "#10B981" : T.border }}>
              {uploadFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 size={32} className="text-emerald-400"/>
                  <p className="font-semibold text-sm" style={{ color: T.text }}>{uploadFile.name}</p>
                  <p className="text-xs" style={{ color: T.muted }}>{(uploadFile.size/1024/1024).toFixed(2)} MB</p>
                  <button onClick={()=>setUploadFile(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">Remove</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <UploadCloud size={36} style={{ color: T.muted }}/>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: T.text }}>Drag and drop firmware here</p>
                    <p className="text-xs mt-1" style={{ color: T.muted }}>or <label className="cursor-pointer hover:opacity-80" style={{ color: T.accent }}>browse files<input type="file" className="hidden" onChange={e=>setUploadFile(e.target.files[0])}/></label></p>
                  </div>
                  <p className="text-xs" style={{ color: T.muted }}>Accepted: .bin, .hex, .img, .zip · Max 500 MB</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Firmware Name *" icon={Package} placeholder="e.g. Firmware v1.2.0" t={T}/>
              <Input label="Version *" icon={Tag} placeholder="e.g. v1.2.0" value={version} onChange={e=>setVersion(e.target.value)} t={T}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Device Type / Model</label>
                <select value={deviceType} onChange={e=>setDeviceType(e.target.value)} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  <option>ESP32</option><option>ESP8266</option><option>Arduino</option>
                </select>
              </div>
              <Input label="Release Notes" icon={FileText} placeholder="Brief release notes (optional)" t={T}/>
            </div>
            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            <div className="flex gap-3">
              <button onClick={()=>{setShowUpload(false);setUploadFile(null);setUploadError("");}} className="flex-1 py-2.5 rounded-lg text-sm transition-colors" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading||uploadDone} className="flex-1 py-2.5 rounded-lg text-sm text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg" style={{ background: T.accent }}>
                {uploadDone ? <><CheckCircle2 size={14}/> Uploaded!</> : uploading ? <><RefreshCw size={14} className="animate-spin"/> Uploading...</> : <><UploadCloud size={14}/> Upload Firmware</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OTA UPDATES PAGE
// ─────────────────────────────────────────────────────────────
function OTAUpdatesPage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { otaUpdates: updates, addOtaUpdate, setOtaStatus } = useDashboardData();
  const [showCreate, setShowCreate] = useState(false);
  const [newUpdate, setNewUpdate] = useState({ name:"", firmware:"v1.1.0", target:"Factory A", type:"Mandatory" });
  const [createError, setCreateError] = useState("");
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  const createUpdate = async () => {
    if (!newUpdate.name) { setCreateError("Update name is required"); return; }
    try {
      setCreateError("");
      await addOtaUpdate(newUpdate);
      setShowCreate(false);
      setNewUpdate({ name:"", firmware:"v1.1.0", target:"Factory A", type:"Mandatory" });
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const totals = { total:updates.length, success:updates.filter(u=>u.status==="Success").length, inProgress:updates.filter(u=>u.status==="In Progress").length, failed:updates.filter(u=>u.status==="Failed").length };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Total Updates",totals.total,"#3B82F6",Upload],["Success",totals.success,"#10B981",CheckCircle2],["In Progress",totals.inProgress,"#F59E0B",RefreshCw],["Failed",totals.failed,"#EF4444",XCircle]].map(([l,v,c,Icon])=>(
          <Card key={l} className="p-4 flex items-center gap-3" t={T}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${c}22`}}><Icon size={16} style={{color:c}}/></div>
            <div><p className="text-xs" style={{ color: T.muted }}>{l}</p><p className="text-xl font-black" style={{ color: T.text }}>{v}</p></div>
          </Card>
        ))}
      </div>

      <Card t={T}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <h3 className="font-bold text-sm" style={{ color: T.text }}>Update Rollouts</h3>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg" style={{ background: T.accent }}>
            <Plus size={13}/> Create Update
          </button>
        </div>
        <div>
          {updates.map((u,i)=>(
            <div key={i} className="px-5 py-4 transition-colors" style={{ borderBottom: i < updates.length - 1 ? `1px solid ${T.divider}` : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.status==="Success"?"bg-emerald-500/15":u.status==="In Progress"?"bg-blue-500/15":"bg-red-500/15"}`}>
                    {u.status==="Success"&&<CheckCircle2 size={16} className="text-emerald-400"/>}
                    {u.status==="In Progress"&&<RefreshCw size={16} className="text-blue-400 animate-spin"/>}
                    {u.status==="Failed"&&<XCircle size={16} className="text-red-400"/>}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: T.text }}>{u.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: T.muted }}>Firmware:</span>
                      <span className="font-mono text-xs font-bold" style={{ color: T.accent }}>{u.firmware}</span>
                      <span style={{ color: T.muted }}>·</span>
                      <span className="text-xs" style={{ color: T.muted }}>Target: {u.target}</span>
                      <span style={{ color: T.muted }}>·</span>
                      <span className="text-xs" style={{ color: T.muted }}>{u.created}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={u.type}/>
                  <StatusBadge status={u.status}/>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={u.progress} color={u.status==="Success"?"#10B981":u.status==="In Progress"?"#3B82F6":"#EF4444"}/>
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: T.text }}>{u.progress}%</span>
                {u.status==="In Progress"&&(
                  <button onClick={()=>setOtaStatus(updates[i].id, {status:"Failed"})} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center">
                    <Pause size={11} className="text-red-400"/>
                  </button>
                )}
                {u.status==="Failed"&&(
                  <button onClick={()=>setOtaStatus(updates[i].id, {status:"In Progress", progress:0})} className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center">
                    <RotateCcw size={11} className="text-amber-400"/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5" t={T}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Shield size={15} style={{ color: T.accent }}/> Security Architecture</h3>
          <div className="space-y-3 text-xs" style={{ color: T.muted }}>
            {["Cryptographic checksum validation on all firmware payloads before flashing","MQTT TLS encryption for all OTA payload transmissions","Automatic rollback on checksum mismatch or failed boot verification"].map((s,i)=>(
              <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                <Check size={13} className="text-emerald-400 mt-0.5"/>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5" t={T}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Zap size={15} className="text-amber-400"/> Orchestration Engine</h3>
          <div className="space-y-3 text-xs" style={{ color: T.muted }}>
            {["One-to-many MQTT payload distribution via FastAPI → Broker → Nodes","Batch group rollouts replace sequential per-device manual flashing","Sub-second telemetry feedback on update progress per device node"].map((s,i)=>(
              <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                <Bolt size={13} className="text-amber-400 mt-0.5"/>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {showCreate && (
        <Modal title="Create OTA Update" onClose={()=>setShowCreate(false)} t={T}>
          <div className="p-6 space-y-4">
            <Input label="Update Name *" icon={Tag} placeholder="e.g. Update v1.1.0 - Factory C" value={newUpdate.name} onChange={e=>setNewUpdate({...newUpdate,name:e.target.value})} t={T}/>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Firmware Version</label>
                <select value={newUpdate.firmware} onChange={e=>setNewUpdate({...newUpdate,firmware:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["v1.1.0","v1.0.9","v1.0.8"].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Target Group</label>
                <select value={newUpdate.target} onChange={e=>setNewUpdate({...newUpdate,target:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["Factory A","Factory B","Office","Warehouse","R&D Lab","All Devices"].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: T.muted }}>Update Type</label>
              <div className="grid grid-cols-2 gap-3">
                {["Mandatory","Optional"].map(tp=>(
                  <button key={tp} onClick={()=>setNewUpdate({...newUpdate,type:tp})}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{ border: `1px solid ${newUpdate.type===tp ? T.accent : T.border}`, background: newUpdate.type===tp ? `${T.accent}15` : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                    <p className="text-xs font-bold" style={{ color: T.text }}>{tp}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.muted }}>{tp==="Mandatory"?"Devices will be required to install":"Devices can choose when to install"}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {createError && <p className="text-xs text-red-400 w-full">{createError}</p>}
              <button onClick={()=>setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm transition-colors" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
              <button onClick={createUpdate} className="flex-1 py-2.5 rounded-lg text-sm text-white font-bold transition-all flex items-center justify-center gap-2" style={{ background: T.accent }}>
                <Send size={13}/> Launch Update
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGS PAGE (with search dropdown)
// ─────────────────────────────────────────────────────────────
function LogsPage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { logs } = useDashboardData();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const logSuggestions = [
    ...logs.map(l => l.source),
    "Checksum mismatch", "ESP32-00128", "ESP32-00127", "MongoDB", "FastAPI",
    "ERROR", "WARN", "INFO", "OTA Service", "MQTT Broker", "Auth Service",
  ];

  const filtered = logs.filter(l => {
    const matchLevel = filter==="ALL" || l.level===filter;
    const matchSearch = search==="" || l.msg.toLowerCase().includes(search.toLowerCase()) || l.source.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const levelColor = { INFO:"text-blue-400 bg-blue-500/10", WARN:"text-amber-400 bg-amber-500/10", ERROR:"text-red-400 bg-red-500/10" };
  const eventCounts = {
    total: logs.length,
    info: logs.filter(l=>l.level==="INFO").length,
    warn: logs.filter(l=>l.level==="WARN").length,
    error: logs.filter(l=>l.level==="ERROR").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Total Events",eventCounts.total,"#3B82F6",Terminal],["Info",eventCounts.info,"#3B82F6",Info],["Warnings",eventCounts.warn,"#F59E0B",AlertTriangle],["Errors",eventCounts.error,"#EF4444",XCircle]].map(([l,v,c,Icon])=>(
          <Card key={l} className="p-4 flex items-center gap-3" t={T}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${c}22`}}><Icon size={16} style={{color:c}}/></div>
            <div><p className="text-xs" style={{ color: T.muted }}>{l}</p><p className="text-xl font-black" style={{ color: T.text }}>{v}</p></div>
          </Card>
        ))}
      </div>

      <Card t={T}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          {/* Req 2: Logs search with suggestions */}
          <SearchBar
            placeholder="Search logs by message or source..."
            suggestions={logSuggestions}
            value={search}
            onChange={setSearch}
            onSelect={setSearch}
            t={T}
            className="flex-1 min-w-0 w-full"
          />
          <div className="flex gap-1">
            {["ALL","INFO","WARN","ERROR"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: filter===f ? T.accent : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: filter===f ? "#fff" : T.muted }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal always stays dark for authenticity */}
        <div className="bg-[#0A0D14] m-4 rounded-xl border border-white/8 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-white/3">
            <span className="w-3 h-3 rounded-full bg-red-500/60"/><span className="w-3 h-3 rounded-full bg-amber-500/60"/><span className="w-3 h-3 rounded-full bg-emerald-500/60"/>
            <span className="ml-2 text-slate-600 text-xs font-mono">system.log — IoT OTA Orchestration</span>
          </div>
          <div className="p-4 space-y-1 font-mono text-xs max-h-[500px] overflow-y-auto">
            {filtered.map((l,i)=>(
              <div key={i} className="flex gap-3 py-1.5 hover:bg-white/3 rounded px-1 group transition-colors">
                <span className="text-slate-600 flex-shrink-0 w-32">{l.time}</span>
                <span className={`flex-shrink-0 w-14 px-1.5 py-0.5 rounded text-center font-bold text-xs leading-none h-fit ${levelColor[l.level]}`}>{l.level}</span>
                <span className="text-emerald-400 flex-shrink-0 w-28">[{l.source}]</span>
                <span className="text-slate-300 leading-relaxed">{l.msg}</span>
                <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={10} className="text-slate-600 hover:text-slate-400"/></button>
              </div>
            ))}
            {filtered.length===0 && <p className="text-slate-600 text-center py-8">No logs match the current filters.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// USERS PAGE
// ─────────────────────────────────────────────────────────────
function UsersPage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const { users, addUser: addUserApi, removeUser } = useDashboardData();
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ name:"", id:"", role:"Operator", email:"", status:"Active", dept:"Engineering", lastLogin:"—" });
  const [addError, setAddError] = useState("");
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  const addUser = async () => {
    if (!newUser.name) return;
    try {
      setAddError("");
      await addUserApi(newUser);
      setShowAdd(false);
      setNewUser({ name:"", id:"", role:"Operator", email:"", status:"Active", dept:"Engineering", lastLogin:"—" });
    } catch (err) {
      setAddError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Total Users","4","#3B82F6",Users],["Active","3","#10B981",CheckCircle2],["Inactive","1","#EF4444",XCircle],["Locked","0","#F59E0B",Lock]].map(([l,v,c,Icon])=>(
          <Card key={l} className="p-4 flex items-center gap-3" t={T}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${c}22`}}><Icon size={16} style={{color:c}}/></div>
            <div><p className="text-xs" style={{ color: T.muted }}>{l}</p><p className="text-xl font-black" style={{ color: T.text }}>{v}</p></div>
          </Card>
        ))}
      </div>

      <Card t={T}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <h3 className="font-bold text-sm" style={{ color: T.text }}>Team Members</h3>
          <button onClick={()=>setShowAdd(true)} className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg" style={{ background: T.accent }}>
            <Plus size={13}/> Add User
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.divider}`, background: T.tableHead }}>
                {["User","Student ID","Role","Email","Department","Status","Last Login","Actions"].map(h=>(
                  <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wide" style={{ color: T.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={i} className="transition-colors group" style={{ borderBottom: `1px solid ${T.divider}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{background:["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899"][i%5]}}>
                        {u.name[0]}
                      </div>
                      <span className="font-semibold" style={{ color: T.subtext }}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: T.muted }}>{u.id}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.role}/></td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{u.email}</td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{u.dept}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status}/></td>
                  <td className="px-4 py-3" style={{ color: T.muted }}>{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Edit2 size={12} style={{ color: T.muted }}/></button>
                      <button onClick={()=>removeUser(u.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}><Trash2 size={12} className="text-red-400"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <Modal title="Add New User" onClose={()=>setShowAdd(false)} t={T}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Full Name *" icon={User} placeholder="Full name" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} t={T}/>
              <Input label="Student ID" icon={Hash} placeholder="221020124XXX" value={newUser.id} onChange={e=>setNewUser({...newUser,id:e.target.value})} t={T}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email" icon={Mail} type="email" placeholder="user@iot.com" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} t={T}/>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Role</label>
                <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["Super Admin","Admin","Manager","Operator","Viewer"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: T.muted }}>Department</label>
                <select value={newUser.dept} onChange={e=>setNewUser({...newUser,dept:e.target.value})} className="w-full rounded-lg text-sm outline-none px-3 py-2.5" style={selectStyle}>
                  {["Engineering","Operations","Field Ops","Management","R&D"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <Input label="Initial Password" icon={Lock} type="password" placeholder="Set a password" t={T}/>
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 rounded-lg text-sm transition-colors" style={{ border: `1px solid ${T.border}`, color: T.muted }}>Cancel</button>
              <button onClick={addUser} className="flex-1 py-2.5 rounded-lg text-sm text-white font-bold transition-all" style={{ background: T.accent }}>Create User</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────
function SettingsPage({ theme, setTheme, t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    mqttHost:"mqtt.iot.local", mqttPort:"1883", mqttTLS:true,
    apiUrl:"http://localhost:8000", apiKey:"sk-iot-xxxx-xxxx",
    otaChunkSize:"4096", otaTimeout:"30",
    emailAlerts:true, slackAlerts:false,
    retentionDays:"90", autoBackup:true,
  });

  const save = async () => {
    await new Promise(r=>setTimeout(r,800));
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  const Toggle = ({ val, onToggle }) => (
    <button onClick={onToggle} className={`relative w-10 h-5 rounded-full transition-colors ${val?"bg-blue-500":"bg-white/15"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val?"translate-x-5":""}`}/>
    </button>
  );

  const sectionBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const selectStyle = { background: T.input, border: `1px solid ${T.border}`, color: T.text };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-5" t={T}>
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Monitor size={15} style={{ color: T.accent }}/> Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: T.subtext }}>Theme Mode</p>
            <p className="text-xs mt-0.5" style={{ color: T.muted }}>Switch between dark and light theme</p>
          </div>
          <div className="flex rounded-lg p-1 gap-1" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            {[["dark","Dark",Moon],["light","Light",Sun],["system","System",Monitor]].map(([v,l,Icon])=>(
              <button key={v} onClick={()=>setTheme(v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{ background: theme===v ? T.accent : "transparent", color: theme===v ? "#fff" : T.muted }}>
                <Icon size={12}/>{l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5" t={T}>
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Radio size={15} className="text-emerald-400"/> MQTT Broker Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Broker Host" icon={Server} placeholder="mqtt.iot.local" value={settings.mqttHost} onChange={e=>setSettings({...settings,mqttHost:e.target.value})} t={T}/>
          <Input label="Port" icon={Hash} placeholder="1883" value={settings.mqttPort} onChange={e=>setSettings({...settings,mqttPort:e.target.value})} t={T}/>
        </div>
        <div className="flex items-center justify-between mt-4 rounded-lg px-4 py-3" style={{ background: sectionBg }}>
          <div><p className="text-sm font-medium" style={{ color: T.subtext }}>TLS Encryption</p><p className="text-xs" style={{ color: T.muted }}>Encrypt MQTT transport layer</p></div>
          <Toggle val={settings.mqttTLS} onToggle={()=>setSettings({...settings,mqttTLS:!settings.mqttTLS})}/>
        </div>
      </Card>

      <Card className="p-5" t={T}>
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Zap size={15} className="text-amber-400"/> FastAPI Backend</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="API Base URL" icon={Globe} value={settings.apiUrl} onChange={e=>setSettings({...settings,apiUrl:e.target.value})} t={T}/>
          <Input label="API Key" icon={Key} type="password" value={settings.apiKey} onChange={e=>setSettings({...settings,apiKey:e.target.value})} t={T}/>
        </div>
      </Card>

      <Card className="p-5" t={T}>
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Upload size={15} className="text-purple-400"/> OTA Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Chunk Size (bytes)" icon={HardDrive} value={settings.otaChunkSize} onChange={e=>setSettings({...settings,otaChunkSize:e.target.value})} t={T}/>
          <Input label="Timeout (seconds)" icon={Clock} value={settings.otaTimeout} onChange={e=>setSettings({...settings,otaTimeout:e.target.value})} t={T}/>
        </div>
      </Card>

      <Card className="p-5" t={T}>
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}><Bell size={15} className="text-red-400"/> Notifications</h3>
        <div className="space-y-3">
          {[["Email Alerts","Send system alerts via email","emailAlerts"],["Slack Integration","Push notifications to Slack channel","slackAlerts"],["Auto Backup","Automatically backup device configs","autoBackup"]].map(([label,desc,key])=>(
            <div key={key} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: sectionBg }}>
              <div><p className="text-sm font-medium" style={{ color: T.subtext }}>{label}</p><p className="text-xs" style={{ color: T.muted }}>{desc}</p></div>
              <Toggle val={settings[key]} onToggle={()=>setSettings({...settings,[key]:!settings[key]})}/>
            </div>
          ))}
        </div>
      </Card>

      <button onClick={save} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2" style={{ background: T.accent }}>
        {saved?<><CheckCircle2 size={15}/> Settings Saved!</>:<><Save size={15}/> Save Settings</>}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Req 5: PROFILE PAGE
// ─────────────────────────────────────────────────────────────
function ProfilePage({ t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const sectionBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const { users } = useDashboardData();

  const privileges = [
    { icon: Shield,      label: "OTA Orchestration",  desc: "Create, manage, and abort OTA update jobs",  granted: true  },
    { icon: Cpu,         label: "Device Management",  desc: "Register, edit, and decommission devices",   granted: true  },
    { icon: Users,       label: "User Administration",desc: "Create users and assign roles",              granted: true  },
    { icon: Database,    label: "Database Access",    desc: "Query telemetry and audit logs",             granted: true  },
    { icon: Settings,    label: "System Settings",    desc: "Modify broker and API configuration",        granted: true  },
    { icon: Trash2,      label: "Destructive Actions",desc: "Permanently delete records",                 granted: false },
  ];

  const securityLog = [
    { event:"Signed in",       ip:"192.168.1.1",  time:"18 May 2024, 10:28",  status:"success" },
    { event:"OTA job created", ip:"192.168.1.1",  time:"17 May 2024, 14:15",  status:"success" },
    { event:"Password changed",ip:"192.168.1.1",  time:"15 May 2024, 09:00",  status:"success" },
    { event:"Failed login",    ip:"10.0.0.14",    time:"12 May 2024, 03:44",  status:"warning" },
  ];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Profile hero card */}
      <Card className="overflow-hidden" t={T}>
        <div className="h-24 relative" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 50%, #0891b2 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "20px 20px" }}/>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl border-4 flex items-center justify-center text-white text-2xl font-black shadow-xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", borderColor: T.card }}>
                BY
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-black" style={{ color: T.text }}>Bharat Yogansh</h2>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status="Super Admin"/>
                  <span className="text-xs font-mono" style={{ color: T.muted }}>221020124003</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: `${T.accent}15`, color: T.accent, border: `1px solid ${T.accent}30` }}>
                <Edit2 size={12}/> Edit Profile
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: sectionBg, color: T.muted, border: `1px solid ${T.border}` }}>
                <Download size={12}/> Export Data
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            {[
              { label:"Department",   value:"Engineering",    icon:Briefcase },
              { label:"Email",        value:"bharat@iot.com", icon:Mail },
              { label:"Last Login",   value:"18 May 2024",   icon:Clock },
              { label:"Member Since", value:"Jan 2024",       icon:Calendar },
            ].map(item=>(
              <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: sectionBg }}>
                <item.icon size={14} className="mt-0.5 flex-shrink-0" style={{ color: T.accent }}/>
                <div>
                  <p className="text-xs" style={{ color: T.muted }}>{item.label}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: T.text }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Access privileges */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5" t={T}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}>
              <ShieldCheck size={15} style={{ color: T.accent }}/> Administrative Access Privileges
            </h3>
            <div className="space-y-2.5">
              {privileges.map(priv=>(
                <div key={priv.label} className="flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ background: sectionBg }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${priv.granted ? "bg-emerald-500/15" : "bg-red-500/10"}`}>
                    <priv.icon size={14} className={priv.granted ? "text-emerald-400" : "text-red-400"}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: T.text }}>{priv.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.muted }}>{priv.desc}</p>
                  </div>
                  {priv.granted
                    ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0"/>
                    : <XCircle size={15} className="text-red-400 flex-shrink-0"/>
                  }
                </div>
              ))}
            </div>
          </Card>

          {/* Security log */}
          <Card className="p-5" t={T}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}>
              <Lock size={15} className="text-amber-400"/> Security Activity Log
            </h3>
            <div className="space-y-2">
              {securityLog.map((ev,i)=>(
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: sectionBg }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ev.status==="success"?"bg-emerald-400":"bg-amber-400 animate-pulse"}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: T.text }}>{ev.event}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: T.muted }}>from {ev.ip}</p>
                  </div>
                  <span className="text-xs" style={{ color: T.muted }}>{ev.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: team grid + profile settings */}
        <div className="space-y-4">
          <Card className="p-5" t={T}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}>
              <Users size={15} style={{ color: T.accent }}/> Project Team
            </h3>
            <div className="space-y-3">
              {users.map((m,i)=>(
                <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${m.name==="Bharat Yogansh" ? "ring-1" : ""}`}
                  style={{ background: m.name==="Bharat Yogansh" ? `${T.accent}12` : sectionBg, ringColor: T.accent }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{background:["#3B82F6","#10B981","#F59E0B","#8B5CF6"][i]}}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold truncate" style={{ color: T.text }}>{m.name}</p>
                      {m.name==="Bharat Yogansh" && <Star size={10} className="text-amber-400 flex-shrink-0" fill="#F59E0B"/>}
                    </div>
                    <p className="text-xs font-mono mt-0.5 truncate" style={{ color: T.muted }}>{m.id}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status==="Online" ? "bg-emerald-400" : "bg-slate-500"}`}/>
                </div>
              ))}
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: sectionBg }}>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs flex-shrink-0">G</div>
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text }}>Ms. Pooja Pramar</p>
                  <p className="text-xs" style={{ color: T.muted }}>Project Guide</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5" t={T}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: T.text }}>
              <Settings size={15} style={{ color: T.muted }}/> Profile Settings
            </h3>
            <div className="space-y-3">
              {[
                { label:"Two-Factor Authentication", val:true  },
                { label:"Email Notifications",       val:true  },
                { label:"API Access Tokens",         val:false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: sectionBg }}>
                  <p className="text-xs font-medium" style={{ color: T.subtext }}>{item.label}</p>
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${item.val ? "bg-blue-500" : isDark ? "bg-white/15" : "bg-black/15"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.val ? "translate-x-4" : ""}`}/>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all" style={{ background: T.accent }}>
              Update Password
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ABOUT MODAL
// ─────────────────────────────────────────────────────────────
function AboutModal({ onClose, t }) {
  const T = t || DARK;
  const { users } = useDashboardData();
  return (
    <Modal title="About This Project" onClose={onClose} wide t={T}>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${T.accent}0D`, border: `1px solid ${T.accent}25` }}>
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30"><Activity size={22} className="text-white"/></div>
          <div>
            <h3 className="font-black text-base" style={{ color: T.text }}>IoT Device Management & OTA Orchestration System</h3>
            <p className="text-xs mt-0.5" style={{ color: T.muted }}>Roorkee College of Engineering · Project Under Development</p>
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: T.muted }}>Project Team</h4>
          <div className="grid grid-cols-2 gap-2">
            {users.map((m,i)=>(
              <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: isDarkCheck(T) ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{background:["#3B82F6","#10B981","#F59E0B","#8B5CF6"][i]}}>
                  {m.name[0]}
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text }}>{m.name}</p>
                  <p className="text-xs font-mono" style={{ color: T.muted }}>{m.id}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: isDarkCheck(T) ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: `1px solid ${T.border}` }}>
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">G</div>
            <div><p className="text-xs" style={{ color: T.muted }}>Project Guide</p><p className="text-xs font-bold" style={{ color: T.text }}>Ms. Pooja Pramar</p></div>
          </div>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: T.muted }}>System Architecture</h4>
          <div className="flex items-center gap-2 flex-wrap">
            {[["ESP32 Devices","#3B82F6"],["→",""],["MQTT Broker","#10B981"],["↔",""],["FastAPI Backend","#F59E0B"],["→",""],["Dashboard UI","#8B5CF6"],["→",""],["PostgreSQL / MongoDB","#EC4899"]].map(([l,c],i)=>(
              l==="→"||l==="↔" ? <span key={i} style={{ color: T.muted }} className="text-sm">{l}</span> :
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{background:`${c}20`,color:c,border:`1px solid ${c}30`}}>{l}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: `1px solid ${T.divider}`, color: T.muted }}>
          <span>Status: <span className="text-amber-400 font-semibold">Project Under Development</span></span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>v1.0.0-alpha</span>
        </div>
      </div>
    </Modal>
  );
}

function isDarkCheck(T) { return T === DARK || T.bg === DARK.bg; }

// ─────────────────────────────────────────────────────────────
// Req 4: NOTIFICATION BELL DROPDOWN
// ─────────────────────────────────────────────────────────────
function NotificationDropdown({ onClose, t }) {
  const T = t || DARK;
  const isDark = T === DARK;
  const [read, setRead] = useState(false);
  const { logs } = useDashboardData();
  const criticalLogs = logs.filter(l => l.level === "ERROR" || l.level === "WARN").slice(0, 4);

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: T.text }}/>
          <span className="font-bold text-sm" style={{ color: T.text }}>Notifications</span>
          {!read && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{criticalLogs.length}</span>}
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10">
          <X size={12} style={{ color: T.muted }}/>
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {criticalLogs.map((log, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 transition-colors"
            style={{ borderBottom: i < criticalLogs.length - 1 ? `1px solid ${T.divider}` : "none", background: !read ? (log.level === "ERROR" ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)") : "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = T.tableHover}
            onMouseLeave={e => e.currentTarget.style.background = !read ? (log.level === "ERROR" ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)") : "transparent"}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${log.level === "ERROR" ? "bg-red-500/15" : "bg-amber-500/15"}`}>
              {log.level === "ERROR"
                ? <AlertCircle size={13} className="text-red-400"/>
                : <AlertTriangle size={13} className="text-amber-400"/>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-snug" style={{ color: T.text }}>{log.msg}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: T.muted }}>{log.source}</span>
                <span style={{ color: T.muted }}>·</span>
                <span className="text-xs" style={{ color: T.muted }}>{log.time}</span>
              </div>
            </div>
            {!read && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"/>}
          </div>
        ))}
      </div>

      <div className="px-4 py-3" style={{ borderTop: `1px solid ${T.divider}` }}>
        <button onClick={() => setRead(true)}
          className="w-full text-xs font-semibold py-2 rounded-lg transition-colors"
          style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: read ? T.muted : T.accent }}>
          {read ? "✓ All notifications read" : "Mark all as read"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed]     = useState(false);
  const [user, setUser]         = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme]       = useState("dark");
  const [showAbout, setShowAbout] = useState(false);
  const [time, setTime]         = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);
  // Req 4: notification bell state
  const [showNotif, setShowNotif] = useState(false);
  // Req 2: global header search state
  const [headerSearch, setHeaderSearch] = useState("");
  const notifRef = useRef(null);
  const headerSearchRef = useRef(null);
  const [headerDropOpen, setHeaderDropOpen] = useState(false);
  // Called unconditionally (before the auth early-return below) so the
  // hook order stays stable across the logged-out → logged-in transition.
  const { devices } = useDashboardData();

  useEffect(() => {
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setTheme(mq.matches ? "dark" : "light");
    }
  }, [theme]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close header search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(e.target)) setHeaderDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isDark = theme !== "light";
  const T = isDark ? DARK : LIGHT;

  const handleLogin = (userData) => { setUser(userData); setAuthed(true); };
  const handleLogout = () => {
    if (user?.email) apiLogout(user.email).catch(() => {}); // best-effort, don't block UI on it
    setAuthed(false); setUser(null); setActiveNav("dashboard");
  };

  if (!authed) return <AuthPage onLogin={handleLogin}/>;

  const headerSearchFiltered = headerSearch.length > 0
    ? buildSearchSuggestions(devices).filter(s => s.toLowerCase().includes(headerSearch.toLowerCase())).slice(0, 6)
    : [];

  const renderPage = () => {
    switch(activeNav) {
      case "dashboard":     return <DashboardPage onAbout={()=>setShowAbout(true)} setActiveNav={setActiveNav} t={T}/>;
      case "devices":       return <DevicesPage t={T}/>;
      case "device-groups": return <DeviceGroupsPage t={T}/>;
      case "firmware":      return <FirmwarePage t={T}/>;
      case "ota-updates":   return <OTAUpdatesPage t={T}/>;
      case "logs":          return <LogsPage t={T}/>;
      case "users":         return <UsersPage t={T}/>;
      case "settings":      return <SettingsPage theme={theme} setTheme={setTheme} t={T}/>;
      case "profile":       return <ProfilePage t={T}/>;  // Req 5
      default:              return <DashboardPage onAbout={()=>setShowAbout(true)} setActiveNav={setActiveNav} t={T}/>;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: T.bg, color: T.text, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&family=DM+Mono:wght@400;500&display=swap');
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
        .nav-btn{transition:all 0.2s ease}
        select option{background:#111827;color:white}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .page-enter{animation:fadeIn 0.22s ease}
      `}</style>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={()=>setMobileOpen(false)}/>}

      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-50 lg:z-auto h-screen flex flex-col transition-all duration-300 flex-shrink-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "w-16" : "w-56"}`}
        style={{ background: T.sidebar, borderRight: `1px solid rgba(255,255,255,0.06)` }}>

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 ${collapsed?"justify-center":""}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/40">
            <Activity size={15} className="text-white"/>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-black text-sm leading-none">IoT OTA</p>
              <p className="text-slate-500 text-xs mt-0.5 truncate">Orchestration</p>
            </div>
          )}
        </div>

        <button onClick={()=>setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-14 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 items-center justify-center hover:bg-slate-600 transition-colors z-10 shadow-md">
          {collapsed ? <ChevronRight size={11} className="text-slate-300"/> : <ChevronLeft size={11} className="text-slate-300"/>}
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={()=>{setActiveNav(item.id);setMobileOpen(false);}}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 ${collapsed?"justify-center":""}`}
              style={{
                background: activeNav===item.id ? "rgba(59,130,246,0.18)" : "transparent",
                borderLeft: activeNav===item.id ? "2px solid #3B82F6" : "2px solid transparent",
                color: activeNav===item.id ? "#60A5FA" : "#94A3B8",
                fontWeight: activeNav===item.id ? 600 : 400,
              }}
              onMouseEnter={e => { if (activeNav!==item.id) e.currentTarget.style.background = "rgba(59,130,246,0.08)"; }}
              onMouseLeave={e => { if (activeNav!==item.id) e.currentTarget.style.background = "transparent"; }}>
              <item.icon size={16} className="flex-shrink-0"/>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Theme + User footer */}
        <div className="p-3 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {!collapsed && (
            <div className="flex items-center gap-2 px-1">
              {isDark ? <Moon size={12} className="text-slate-500"/> : <Sun size={12} className="text-amber-400"/>}
              <span className="text-xs text-slate-500 flex-1">Theme</span>
              <button onClick={()=>setTheme(isDark?"light":"dark")}
                className={`relative w-9 h-5 rounded-full transition-colors ${isDark?"bg-blue-500":"bg-amber-400"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark?"translate-x-4":""}`}/>
              </button>
            </div>
          )}
          {/* Req 5: clicking profile area in sidebar footer → profile page */}
          <button
            onClick={()=>{ setActiveNav("profile"); setMobileOpen(false); }}
            className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 ${collapsed?"justify-center":""}`}>
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.name?.[0] || "A"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs text-white font-bold truncate">{user?.name || "Admin"}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || "admin@iot.com"}</p>
                </div>
                <button onClick={e=>{e.stopPropagation();handleLogout();}} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors" title="Logout">
                  <LogOut size={11} className="text-slate-500 hover:text-red-400"/>
                </button>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ background: T.header, borderColor: "rgba(255,255,255,0.06)" }}>
          <button onClick={()=>setMobileOpen(true)} className="lg:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <Grid size={14} className="text-slate-400"/>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
              <Home size={10}/>
              <span>/</span>
              <span className="capitalize" style={{ color: T.subtext }}>{activeNav.replace("-"," ")}</span>
            </div>
            <h1 className="font-black text-base capitalize" style={{ color: "#FFFFFF" }}>{activeNav === "profile" ? "My Profile" : activeNav.replace("-"," ")}</h1>
          </div>

          {/* Req 2: Global header search with suggestions */}
          <div ref={headerSearchRef} className="hidden md:block relative w-52">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10"/>
            <input
              placeholder="Search..."
              value={headerSearch}
              onChange={e=>{ setHeaderSearch(e.target.value); setHeaderDropOpen(true); }}
              onFocus={()=>setHeaderDropOpen(true)}
              className="w-full rounded-lg text-xs pl-8 pr-4 py-2 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}
              autoComplete="off"
            />
            {headerDropOpen && headerSearchFiltered.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${T.divider}` }}>
                  <span className="text-xs font-semibold" style={{ color: T.muted }}>Quick Search</span>
                </div>
                {headerSearchFiltered.map((s,i)=>(
                  <button key={s} onClick={()=>{ setHeaderSearch(s); setHeaderDropOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/5"
                    style={{ color: T.text }}>
                    <Search size={10} style={{ color: T.muted }}/>{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block text-xs font-mono text-slate-500">{time.toLocaleTimeString()}</div>

          {/* Req 4: Notification bell with dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={()=>setShowNotif(v=>!v)}
              className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showNotif ? "bg-blue-500/20" : "bg-white/5 hover:bg-white/10"}`}>
              <Bell size={14} className={showNotif ? "text-blue-400" : "text-slate-400"}/>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-black">5</span>
            </button>
            {showNotif && <NotificationDropdown onClose={()=>setShowNotif(false)} t={T}/>}
          </div>

          {/* Req 5: Profile avatar → profile page */}
          <button
            onClick={()=>setActiveNav("profile")}
            className={`w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-black text-white transition-all ${activeNav==="profile" ? "ring-2 ring-blue-300 ring-offset-1 ring-offset-transparent" : "hover:ring-2 hover:ring-blue-500/50"}`}
            title="View Profile">
            {user?.name?.[0] || "A"}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5 page-enter" key={activeNav}>
          {renderPage()}
        </main>

        {/* Footer */}
        <footer className="border-t px-5 py-2 flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.05)", background: T.header }}>
          <span className="text-xs" style={{ color: T.muted }}>IoT OTA Orchestration · Roorkee College of Engineering · Guide: Ms. Pooja Pramar</span>
          <button onClick={()=>setShowAbout(true)} className="flex items-center gap-1 text-xs transition-colors hover:opacity-80" style={{ color: T.accent }}>
            <Info size={10}/> About
          </button>
        </footer>
      </div>

      {showAbout && <AboutModal onClose={()=>setShowAbout(false)} t={T}/>}
    </div>
  );
}