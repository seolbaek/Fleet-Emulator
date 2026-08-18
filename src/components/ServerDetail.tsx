import { useEffect, useRef, useState } from "react"
import {
  X,
  Power,
  RotateCw,
  TerminalSquare,
  Monitor,
  Thermometer,
  Fan,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Loader2,
  Layers,
  Gauge,
  Wind,
  Zap,
} from "lucide-react"
import type { Gpu, Server } from "../data/fleet"
import { statusLabel } from "../data/fleet"
import { useEmulator, useEmulatorSeries, useSmartScroll } from "../lib/emulator"
import { MiniArea } from "./charts"
import { Bar, Label, Pill, Ring, Segmented, StatusDot } from "./primitives"
import { SshTerminal } from "./SshTerminal"

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Cpu
  children: React.ReactNode
}) {
  return (
    <div className="glass rounded-[20px] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={15} className="text-[var(--color-ink-faint)]" />
        <h4 className="text-[13px] font-medium">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function Spec({ k, v, mono = true }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] py-1.5 last:border-0">
      <span className="text-[12px] text-[var(--color-ink-faint)]">{k}</span>
      <span className={`text-[12px] text-[var(--color-ink-dim)] ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  )
}

function GpuCard({ gpu, off }: { gpu: Gpu; off: boolean }) {
  const em = useEmulator()
  const [util, setUtil] = useState(gpu.util)
  const [temp, setTemp] = useState(gpu.tempC)
  const [vramUsed, setVramUsed] = useState(gpu.vramUsedMb)
  const [power, setPower] = useState(gpu.powerW)

  useEffect(() => {
    if (off) {
      setUtil(0); setTemp(24); setVramUsed(0); setPower(0)
      return
    }
    const id = setInterval(() => {
      setUtil((p) => Math.max(0, Math.min(100, p + (Math.random() - 0.5) * 8)))
      setTemp((p) => Math.max(24, Math.min(92, p + (Math.random() - 0.5) * 2)))
      setVramUsed((p) => Math.max(0, Math.min(gpu.vramTotalMb, p + (Math.random() - 0.5) * 500)))
      setPower((p) => Math.max(0, Math.min(gpu.powerLimitW, p + (Math.random() - 0.5) * 15)))
    }, 1800)
    return () => clearInterval(id)
  }, [off, gpu.vramTotalMb, gpu.powerLimitW])

  // suppress unused warning
  void em

  const vramPct = (vramUsed / gpu.vramTotalMb) * 100
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#5e5ce6]">GPU {gpu.index}</span>
            <span className="text-[12px] font-medium">Tesla V100 32GB</span>
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
            Volta GV100 · 5120 CUDA · 640 Tensor · PCIe 3.0 ×16
          </div>
        </div>
        {off ? <Pill tone="off">offline</Pill> : gpu.model ? <Pill tone="accent">{gpu.model}</Pill> : <Pill tone="muted">idle</Pill>}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Util", v: `${util.toFixed(0)}%`, c: "#5e5ce6" },
          { l: "Temp", v: `${temp.toFixed(0)}°C`, c: temp > 80 ? "var(--color-warn)" : "var(--color-ink)" },
          { l: "Fan", v: off ? "0%" : `${gpu.fanPct}%`, c: "var(--color-ink)" },
          { l: "Power", v: `${power.toFixed(0)}W`, c: "var(--color-ink)" },
        ].map((m) => (
          <div key={m.l}>
            <Label>{m.l}</Label>
            <div className="tabular mt-1 text-[15px] font-medium" style={{ color: m.c }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-[var(--color-ink-faint)]">
          <span>VRAM (HBM2)</span>
          <span>
            {(vramUsed / 1024).toFixed(1)} / 32.0 GB
            {!off && gpu.pid && <span className="ml-2 text-[var(--color-ink-dim)]">PID {gpu.pid}</span>}
          </span>
        </div>
        <Bar pct={vramPct} tone={vramPct > 90 ? "err" : "accent"} />
      </div>
    </div>
  )
}

// KVM console component
function KvmConsole({ server, onClose }: { server: Server; onClose: () => void }) {
  const em = useEmulator()
  const logs = em.serverLogs.get(server.id) ?? []
  const state = em.serverStates.get(server.id)
  const off = state?.status === "off"
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] shadow-2xl"
        style={{ height: "min(680px, 90vh)", background: "#050505", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Title bar */}
        <div
          className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-3"
          style={{ background: "#0a0a0a" }}
        >
          <Monitor size={14} className="text-[#ff9f0a]" />
          <div className="flex-1">
            <span className="font-mono text-[13px] text-[#e0e0e0]">IPMI KVM Console — {server.hostname}</span>
            <span className="ml-3 font-mono text-[11px] text-[#666]">BMC {server.ipmiIp} · Resolution 1280×1024</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${off ? "bg-[#ff453a]" : "bg-[#ff9f0a] shadow-[0_0_6px_#ff9f0a]"}`} />
            <span className="font-mono text-[10px] text-[#666]">{off ? "NO SIGNAL" : "LIVE"}</span>
          </div>
          <button onClick={onClose} className="ml-2 rounded-md p-1 text-[#666] hover:bg-white/10 hover:text-[#e0e0e0] transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Screen */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide" style={{ fontFamily: "'Courier New', monospace" }}>
          {off ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="font-mono text-[14px] text-[#333]">NO SIGNAL — SYSTEM POWERED OFF</div>
              <div className="mt-2 font-mono text-[12px] text-[#222]">BMC available · IPMI {server.ipmiIp}</div>
            </div>
          ) : (
            <div className="space-y-0">
              {logs.slice(-60).map((l) => (
                <div
                  key={l.id}
                  className="font-mono text-[11px] leading-[1.55] whitespace-pre-wrap"
                  style={{
                    color:
                      l.level === "err"
                        ? "#ff6b6b"
                        : l.level === "warn"
                          ? "#ffd60a"
                          : l.facility === "kernel" || l.facility === "BIOS"
                            ? "#a8daff"
                            : l.facility === "nvidia" || l.facility === "nvidia-smi"
                              ? "#c084fc"
                              : l.facility === "systemd"
                                ? "#86efac"
                                : l.facility === "dockerd"
                                  ? "#67e8f9"
                                  : "#a0a0a0",
                  }}
                >
                  <span style={{ color: "#555" }}>[{l.ts.slice(0, 8)}]</span>{" "}
                  <span style={{ color: "#888" }}>{l.facility.padEnd(12)}</span>
                  {l.msg}
                </div>
              ))}
              <div ref={bottomRef} />
              <div className="mt-1 font-mono text-[12px] text-[#4a9a4a]">
                {server.hostname.split(".")[0]} login: <span className="animate-pulse">█</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Emulator log viewer
function LogViewer({ serverId }: { serverId: string }) {
  const em = useEmulator()
  const logs = em.serverLogs.get(serverId) ?? []
  const { scrollRef, onScroll } = useSmartScroll(logs.length)

  const levelColor = (l: string) =>
    l === "err" ? "text-[var(--color-err)]" : l === "warn" ? "text-[var(--color-warn)]" : "text-[#58a6ff]"

  const facilityColor = (f: string) =>
    f === "kernel" || f === "BIOS"
      ? "#58a6ff"
      : f.startsWith("nvidia") || f === "cuda"
        ? "#c084fc"
        : f === "systemd"
          ? "#86efac"
          : f === "dockerd" || f === "docker"
            ? "#67e8f9"
            : f === "postgres" || f === "redis"
              ? "#fbbf24"
              : f === "IPMI"
                ? "#ff9f0a"
                : "#a0a0a0"

  return (
    <div className="glass rounded-[20px] p-4">
      <div className="mb-3 flex items-center gap-3">
        <Fan size={14} className="text-[var(--color-ink-faint)]" />
        <Label>syslog · journald · docker · nvidia-smi (live stream)</Label>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)] shadow-[0_0_6px_var(--color-ok)]" />
          <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">streaming</span>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[520px] overflow-y-auto rounded-[14px] p-4 scrollbar-hide"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="space-y-0.5">
          {logs.map((l) => (
            <div key={l.id} className="flex gap-3 font-mono text-[11px] leading-[1.6]">
              <span className="shrink-0 text-[#555]">{l.ts.slice(0, 12)}</span>
              <span
                className={`shrink-0 w-[14px] ${levelColor(l.level)}`}
                title={l.level}
              >
                {l.level === "err" ? "E" : l.level === "warn" ? "W" : "I"}
              </span>
              <span className="shrink-0 w-[100px] truncate text-[#888]" style={{ color: facilityColor(l.facility) }}>
                {l.facility}
              </span>
              <span className="min-w-0 flex-1 text-[#c7d0d8] break-all">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Services tab ─────────────────────────────────────────────────────────────

function ServicesTab({ server }: { server: Server }) {
  const em = useEmulator()
  const services = em.getServices(server.id)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())

  const doAction = (name: string, action: "start" | "stop" | "restart" | "reload") => {
    const key = `${server.id}::${name}`
    setPendingKeys((p) => new Set([...p, key]))
    em.serviceAction(server.id, name, action)
    setTimeout(() => setPendingKeys((p) => { const n = new Set(p); n.delete(key); return n }), 4000)
  }

  const filtered = services.filter((s) => {
    const matchSearch = !search || s.name.includes(search) || s.desc.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = { active: 0, inactive: 0, failed: 0 }
  for (const s of services) {
    if (s.status === "active") counts.active++
    else if (s.status === "failed") counts.failed++
    else counts.inactive++
  }

  const svcToneColor = (status: string) => {
    if (status === "active") return "var(--color-ok)"
    if (status === "failed") return "var(--color-err)"
    if (status === "activating" || status === "deactivating" || status === "reloading") return "var(--color-warn)"
    return "var(--color-off)"
  }

  return (
    <div>
      {/* KPI row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Active", value: counts.active, color: "var(--color-ok)" },
          { label: "Failed", value: counts.failed, color: "var(--color-err)" },
          { label: "Inactive", value: counts.inactive, color: "var(--color-off)" },
        ].map((k) => (
          <div key={k.label} className="glass rounded-[14px] p-3 text-center">
            <div className="font-mono text-[18px] font-semibold" style={{ color: k.color }}>{k.value}</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-ink-faint)]">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-3 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="서비스 검색…"
          className="glass-thin flex-1 rounded-full px-3 py-1.5 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
        />
        {["all", "active", "failed", "inactive"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${
              statusFilter === f
                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                : "glass-thin text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Service list */}
      <div
        className="max-h-[400px] overflow-y-auto rounded-[14px] scrollbar-hide"
        style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {filtered.map((svc) => {
          const key = `${server.id}::${svc.name}`
          const isPending = pendingKeys.has(key)
          const isActive = svc.status === "active"
          const isInactive = svc.status === "inactive" || svc.status === "failed"
          const isTransitioning = svc.status === "activating" || svc.status === "deactivating" || svc.status === "reloading" || isPending
          return (
            <div
              key={svc.name}
              className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${isTransitioning ? "animate-pulse" : ""}`}
                style={{ background: svcToneColor(svc.status) }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-[#c9d1d9]">{svc.name}</div>
                <div className="truncate font-mono text-[9px] text-[#666]">{svc.desc}</div>
              </div>
              {svc.status === "active" && (
                <span className="font-mono text-[9px] text-[#666]">
                  {svc.memMb > 0 ? `${svc.memMb.toFixed(0)}MB` : ""}
                </span>
              )}
              <div className="flex shrink-0 gap-1">
                <button
                  disabled={isActive || isTransitioning}
                  onClick={() => doAction(svc.name, "start")}
                  title="시작"
                  className="rounded-md p-1 text-[var(--color-ok)] transition-colors hover:bg-white/[0.05] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Play size={11} />
                </button>
                <button
                  disabled={isInactive || isTransitioning}
                  onClick={() => doAction(svc.name, "stop")}
                  title="정지"
                  className="rounded-md p-1 text-[var(--color-err)] transition-colors hover:bg-white/[0.05] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Square size={11} />
                </button>
                <button
                  disabled={isTransitioning}
                  onClick={() => doAction(svc.name, "restart")}
                  title="재시작"
                  className="rounded-md p-1 text-[var(--color-warn)] transition-colors hover:bg-white/[0.05] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                </button>
                <button
                  disabled={isInactive || isTransitioning}
                  onClick={() => doAction(svc.name, "reload")}
                  title="reload (SIGHUP)"
                  className="rounded-md p-1 text-[var(--color-accent)] transition-colors hover:bg-white/[0.05] disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <RotateCw size={11} />
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="py-8 text-center font-mono text-[12px] text-[#444]">검색 결과 없음</div>
        )}
      </div>
    </div>
  )
}

// ─── IPMI Sensors tab ─────────────────────────────────────────────────────────

function ri(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min))
}

function IpmiSensorsTab({ server, off }: { server: Server; off: boolean }) {
  // Simulated BMC sensor data — drifts with local state
  const [fans, setFans] = useState(() => [
    { name: "FAN1 (Front L)", rpm: ri(3200, 4200), ok: true },
    { name: "FAN2 (Front R)", rpm: ri(3200, 4200), ok: true },
    { name: "FAN3 (Mid)", rpm: ri(3000, 4000), ok: true },
    { name: "FAN4 (CPU)", rpm: ri(4000, 6000), ok: true },
    { name: "FAN5 (PSU)", rpm: ri(2000, 3500), ok: true },
  ])
  const [temps, setTemps] = useState(() => [
    { name: "CPU 0 Temp", c: ri(42, 68), warn: 80, crit: 90 },
    { name: "CPU 1 Temp", c: ri(40, 65), warn: 80, crit: 90 },
    { name: "PCH Temp", c: ri(38, 52), warn: 70, crit: 85 },
    { name: "Inlet Temp", c: ri(18, 26), warn: 40, crit: 50 },
    { name: "Outlet Temp", c: ri(30, 45), warn: 55, crit: 65 },
    { name: "DIMM A0", c: ri(35, 50), warn: 75, crit: 85 },
    { name: "DIMM B0", c: ri(35, 50), warn: 75, crit: 85 },
    ...(server.gpus.length > 0
      ? [
          { name: "GPU0 Board", c: ri(45, 72), warn: 82, crit: 90 },
          { name: "GPU0 Mem", c: ri(50, 78), warn: 85, crit: 92 },
        ]
      : []),
  ])
  const [psu, setPsu] = useState(() => ({
    psu1In: ri(340, 380), psu1Out: ri(280, 320),
    psu2In: ri(340, 380), psu2Out: ri(280, 320),
    psu1Status: "Presence detected",
    psu2Status: "Presence detected",
    totalW: ri(560, 640),
  }))
  const [voltages] = useState(() => [
    { name: "VCore", v: 1.05 + Math.random() * 0.04, nom: 1.05 },
    { name: "VDD 12V", v: 11.9 + Math.random() * 0.2, nom: 12.0 },
    { name: "VDD 3.3V", v: 3.28 + Math.random() * 0.04, nom: 3.3 },
    { name: "VBAT", v: 3.0 + Math.random() * 0.1, nom: 3.0 },
  ])

  useEffect(() => {
    if (off) return
    const id = setInterval(() => {
      setFans((prev) => prev.map((f) => ({ ...f, rpm: Math.max(1500, Math.min(7000, f.rpm + ri(-120, 120))) })))
      setTemps((prev) => prev.map((t) => ({ ...t, c: Math.max(18, Math.min(t.crit - 1, t.c + (Math.random() - 0.5) * 2.5)) })))
      setPsu((prev) => ({
        ...prev,
        psu1Out: Math.max(200, Math.min(400, prev.psu1Out + ri(-10, 10))),
        psu2Out: Math.max(200, Math.min(400, prev.psu2Out + ri(-10, 10))),
        totalW: Math.max(400, Math.min(800, prev.totalW + ri(-15, 15))),
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [off])

  if (off) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gauge size={32} className="mb-3 text-[var(--color-off)]" />
        <div className="font-mono text-[13px] text-[var(--color-ink-faint)]">BMC는 응답 중이지만</div>
        <div className="font-mono text-[12px] text-[var(--color-ink-faint)]">시스템 전원이 꺼져 있습니다</div>
        <div className="mt-2 font-mono text-[10px] text-[#444]">IPMI {server.ipmiIp} — Standby power OK</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Fan speeds */}
      <div className="glass rounded-[18px] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wind size={13} className="text-[var(--color-ink-faint)]" />
          <span className="text-[12px] font-medium">Fan Speeds (RPM)</span>
          <span className="ml-auto font-mono text-[10px] text-[var(--color-ink-faint)]">BMC sensor poll 2s</span>
        </div>
        <div className="space-y-2">
          {fans.map((f) => {
            const pct = Math.min(100, ((f.rpm - 1000) / 6000) * 100)
            const color = f.rpm < 1800 ? "var(--color-err)" : f.rpm < 2500 ? "var(--color-warn)" : "var(--color-ok)"
            return (
              <div key={f.name} className="flex items-center gap-3">
                <span className="w-[120px] shrink-0 font-mono text-[10px] text-[var(--color-ink-faint)]">{f.name}</span>
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
                <span className="w-[70px] text-right font-mono text-[11px]" style={{ color }}>{f.rpm.toLocaleString()} RPM</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Temperatures */}
      <div className="glass rounded-[18px] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Thermometer size={13} className="text-[var(--color-ink-faint)]" />
          <span className="text-[12px] font-medium">Thermal Sensors</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {temps.map((t) => {
            const color = t.c >= t.crit - 5 ? "var(--color-err)" : t.c >= t.warn - 5 ? "var(--color-warn)" : "var(--color-ink-dim)"
            return (
              <div key={t.name} className="flex items-center justify-between border-b border-black/[0.05] py-1 last:border-0">
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{t.name}</span>
                <span className="font-mono text-[12px]" style={{ color }}>{t.c.toFixed(1)}°C</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Power supply */}
      <div className="glass rounded-[18px] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap size={13} className="text-[var(--color-ink-faint)]" />
          <span className="text-[12px] font-medium">Power Supply Unit</span>
          <span className="ml-auto font-mono text-[12px] font-semibold text-[var(--color-accent)]">
            {psu.totalW}W total
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "PSU 1 Input", v: psu.psu1In, unit: "W" },
            { label: "PSU 1 Output", v: psu.psu1Out, unit: "W" },
            { label: "PSU 2 Input", v: psu.psu2In, unit: "W" },
            { label: "PSU 2 Output", v: psu.psu2Out, unit: "W" },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between border-b border-black/[0.05] py-1">
              <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{p.label}</span>
              <span className="font-mono text-[12px] text-[var(--color-ink-dim)]">{p.v}W</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <div className="flex-1 rounded-[10px] bg-[var(--color-ok)]/10 px-3 py-2 text-center">
            <div className="font-mono text-[9px] text-[var(--color-ink-faint)]">PSU 1</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ok)]">{psu.psu1Status}</div>
          </div>
          <div className="flex-1 rounded-[10px] bg-[var(--color-ok)]/10 px-3 py-2 text-center">
            <div className="font-mono text-[9px] text-[var(--color-ink-faint)]">PSU 2</div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ok)]">{psu.psu2Status}</div>
          </div>
        </div>
      </div>

      {/* Voltages */}
      <div className="glass rounded-[18px] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap size={13} className="text-[var(--color-ink-faint)]" />
          <span className="text-[12px] font-medium">Voltage Rails</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          {voltages.map((v) => {
            const deviation = Math.abs(v.v - v.nom) / v.nom
            const color = deviation > 0.05 ? "var(--color-err)" : deviation > 0.02 ? "var(--color-warn)" : "var(--color-ok)"
            return (
              <div key={v.name} className="flex items-center justify-between border-b border-black/[0.05] py-1.5 last:border-0">
                <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{v.name}</span>
                <span className="font-mono text-[12px]" style={{ color }}>{v.v.toFixed(3)}V</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ServerDetail({ server, onClose }: { server: Server; onClose: () => void }) {
  const [tab, setTab] = useState<"metrics" | "specs" | "logs" | "services" | "sensors">("metrics")
  const [sshOpen, setSshOpen] = useState(false)
  const [kvmOpen, setKvmOpen] = useState(false)
  const [confirm, setConfirm] = useState<"off" | "reboot" | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const em = useEmulator()
  const state = em.serverStates.get(server.id)!
  const off = state.status === "off"
  const cpuSeries = useEmulatorSeries(server.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const showMsg = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 5000)
  }

  const handlePower = () => {
    if (off) {
      em.powerOn(server.id)
      showMsg("전원 ON 명령 전송됨 — 부팅 시퀀스 시작")
    } else {
      setConfirm("off")
    }
  }

  const handleReboot = () => setConfirm("reboot")

  const confirmAction = () => {
    if (confirm === "off") {
      em.powerOff(server.id)
      showMsg("전원 OFF 명령 전송됨 — 시스템 종료 중")
    } else if (confirm === "reboot") {
      em.reboot(server.id)
      showMsg("리부트 명령 전송됨 — 재시작 중")
    }
    setConfirm(null)
  }

  const ramPct = server.ramTotalGb ? (state.ramUsedGb / server.ramTotalGb) * 100 : 0
  const tempPct = (state.cpuTempC / 95) * 100

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end p-4">
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" onClick={onClose} />
        <div className="glass-strong slide-in relative flex h-full w-full max-w-[720px] flex-col overflow-hidden rounded-[28px]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-black/[0.07] px-6 py-4">
            <StatusDot status={state.status} size={10} pulse={state.status !== "off"} />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-semibold">{server.id}</h2>
                <Pill tone={state.status}>{statusLabel[state.status]}</Pill>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-[var(--color-ink-faint)]">
                {server.hostname} · RACK-{server.rack}-U{String(server.slotStart).padStart(2, "0")} · {server.role}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-2 text-[var(--color-ink-dim)] transition-colors hover:bg-black/[0.05] hover:text-[var(--color-ink)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action feedback */}
          {actionMsg && (
            <div className="flex items-center gap-2 border-b border-[var(--color-ok)]/20 bg-[var(--color-ok)]/8 px-6 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
              <span className="font-mono text-[11px] text-[var(--color-ok)]">{actionMsg}</span>
            </div>
          )}

          {/* Confirm modal */}
          {confirm && (
            <div className="flex items-center gap-4 border-b border-[var(--color-err)]/20 bg-[var(--color-err)]/8 px-6 py-3">
              <AlertTriangle size={15} className="shrink-0 text-[var(--color-err)]" />
              <span className="flex-1 text-[12px] text-[var(--color-err)]">
                {confirm === "off" ? "서버를 강제 종료하시겠습니까? 실행 중인 모든 작업이 중단됩니다." : "서버를 재시작하시겠습니까?"}
              </span>
              <button
                onClick={confirmAction}
                className="rounded-full bg-[var(--color-err)] px-3 py-1 text-[11px] text-white transition-opacity hover:opacity-80"
              >
                확인
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="text-[11px] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                취소
              </button>
            </div>
          )}

          {/* IPMI controls */}
          <div className="flex items-center gap-2 border-b border-black/[0.07] px-6 py-3">
            <Label>IPMI / BMC</Label>
            <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{server.ipmiIp}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={handlePower}
                title={off ? "전원 켜기" : "전원 끄기"}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all active:scale-95 ${
                  off
                    ? "border-[var(--color-ok)]/30 bg-[var(--color-ok)]/8 text-[var(--color-ok)] hover:bg-[var(--color-ok)]/15"
                    : "border-[var(--color-err)]/30 bg-[var(--color-err)]/8 text-[var(--color-err)] hover:bg-[var(--color-err)]/15"
                }`}
              >
                <Power size={13} />
                {off ? "Power On" : "Power Off"}
              </button>

              <button
                onClick={handleReboot}
                disabled={off}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all active:scale-95 glass-thin text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCw size={13} />
                Reboot
              </button>

              <button
                onClick={() => !off && setSshOpen(true)}
                disabled={off}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all active:scale-95 glass-thin text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <TerminalSquare size={13} />
                SSH
              </button>

              <button
                onClick={() => !off && setKvmOpen(true)}
                disabled={off}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition-all active:scale-95 glass-thin text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Monitor size={13} />
                Web-KVM
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-black/[0.07] px-6 py-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { key: "metrics", label: "실시간 메트릭" },
                { key: "specs", label: "하드웨어 사양" },
                { key: "services", label: "서비스" },
                { key: "sensors", label: "IPMI 센서" },
                { key: "logs", label: "로그 스트림" },
              ]}
            />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {tab === "metrics" && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass flex items-center justify-center rounded-[20px] p-4">
                    <Ring pct={off ? 0 : state.cpuUtil} label="CPU" sub={off ? "offline" : `${state.cpuUtil.toFixed(0)}%`} />
                  </div>
                  <div className="glass flex items-center justify-center rounded-[20px] p-4">
                    <Ring
                      pct={off ? 0 : ramPct}
                      label="Memory"
                      sub={off ? "—" : `${state.ramUsedGb.toFixed(1)}/${server.ramTotalGb}GB`}
                    />
                  </div>
                  <div className="glass flex items-center justify-center rounded-[20px] p-4">
                    <Ring
                      pct={off ? 0 : tempPct}
                      label="CPU Temp"
                      sub={off ? "24°C" : `${state.cpuTempC.toFixed(0)}°C`}
                      tone={state.cpuTempC > 80 ? "var(--color-warn)" : "var(--color-accent)"}
                    />
                  </div>
                </div>

                <Section title="CPU 사용률 (실시간)" icon={Cpu}>
                  <MiniArea data={cpuSeries} unit="%" domainMax={100} height={90} />
                  <div className="mt-3 grid grid-cols-4 gap-3">
                    <Spec k="Cores" v={`${server.cores}C / ${server.threads}T`} />
                    <Spec k="Power" v={`${off ? 0 : state.cpuPowerW}W`} />
                    <Spec k="Temp" v={`${off ? "24" : state.cpuTempC.toFixed(0)}°C`} />
                    <Spec k="Uptime" v={off ? "—" : `${state.uptimeDays}d`} />
                  </div>
                </Section>

                {server.gpus.length > 0 && (
                  <Section title={`GPU (NVIDIA NVML · ${server.gpus.length}× Tesla V100)`} icon={Thermometer}>
                    <div className="space-y-3">
                      {server.gpus.map((g) => (
                        <GpuCard key={g.index} gpu={g} off={off} />
                      ))}
                    </div>
                  </Section>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Section title="Memory" icon={MemoryStick}>
                    <Bar pct={ramPct} />
                    <div className="mt-3 space-y-0">
                      <Spec k="Used" v={`${off ? "0" : state.ramUsedGb.toFixed(1)} / ${server.ramTotalGb} GB`} />
                      <Spec k="Swap" v={`${server.swapUsedGb} GB`} />
                      <Spec k="ECC Errors" v={`${server.eccErrors}`} />
                      <Spec k="Type" v={`${server.ramType}`} />
                    </div>
                  </Section>
                  <Section title="Storage (SMART)" icon={HardDrive}>
                    <Bar pct={server.storage.healthPct} tone={server.storage.healthPct < 80 ? "err" : "ok"} />
                    <div className="mt-3 space-y-0">
                      <Spec k="Health" v={`${server.storage.healthPct}%`} />
                      <Spec k="Read / Write" v={`${server.storage.readMbs} / ${server.storage.writeMbs} MB/s`} />
                      <Spec k="Array" v={server.storage.raid} />
                      <Spec k="State" v={server.storage.raidState} />
                    </div>
                  </Section>
                </div>

                <Section title="Network" icon={Network}>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { l: "RX", v: off ? "0" : state.netRxMbps.toFixed(0), u: "Mbps", c: "#007aff" },
                      { l: "TX", v: off ? "0" : state.netTxMbps.toFixed(0), u: "Mbps", c: "#007aff" },
                      { l: "Pkt Loss", v: `${server.packetLossPct}%`, u: "", c: server.packetLossPct > 1 ? "var(--color-err)" : "var(--color-ink)" },
                      { l: "Connections", v: off ? "0" : String(server.connections), u: "", c: "var(--color-ink)" },
                    ].map((m) => (
                      <div key={m.l}>
                        <Label>{m.l}</Label>
                        <div className="tabular mt-1 text-[15px] font-medium" style={{ color: m.c }}>
                          {m.v}
                          {m.u && <span className="ml-1 text-[11px] text-[var(--color-ink-faint)]">{m.u}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Spec k="NIC" v={server.nic} />
                  </div>
                </Section>
              </>
            )}

            {tab === "specs" && (
              <>
                <Section title="System" icon={Cpu}>
                  <Spec k="Hostname" v={server.hostname} />
                  <Spec k="OS" v={server.os} />
                  <Spec k="Uptime" v={off ? "—" : `${server.uptimeDays} days`} />
                  <Spec k="Data IP" v={server.dataIp} />
                  <Spec k="IPMI IP" v={server.ipmiIp} />
                </Section>
                <Section title="Processor" icon={Cpu}>
                  <Spec k="Model" v={server.cpuModel} />
                  <Spec k="Architecture" v={server.cpuArch} />
                  <Spec k="Cores / Threads" v={`${server.cores} / ${server.threads}`} />
                  <Spec k="Base Clock" v={`${server.cpuBaseMhz} MHz`} />
                  <Spec k="TDP" v={`${server.cpuTdp} W`} />
                  <Spec k="Socket" v="SP3 · PCIe 4.0" />
                </Section>
                <Section title="Memory" icon={MemoryStick}>
                  <Spec k="Total" v={`${server.ramTotalGb} GB`} />
                  <Spec k="Type" v={server.ramType} />
                  <Spec k="Speed" v={`DDR4-${server.ramSpeed}`} />
                  <Spec k="ECC" v="Multi-bit ECC (SECDED)" />
                </Section>
                {server.gpus.length > 0 && (
                  <Section title="Graphics" icon={Thermometer}>
                    <Spec k="Config" v={`${server.gpus.length}× Tesla V100-PCIE-32GB`} />
                    <Spec k="Architecture" v="Volta (GV100)" />
                    <Spec k="Total VRAM" v={`${server.gpus.length * 32} GB HBM2`} />
                    <Spec k="CUDA / Tensor" v="5120 / 640 per GPU" />
                    <Spec k="Power Limit" v="250 W per GPU" />
                    <Spec k="Cooling" v="Passive (High-CFM Shroud)" />
                  </Section>
                )}
                <Section title="Storage & Network" icon={HardDrive}>
                  <Spec k="Drives" v={server.storage.label} />
                  <Spec k="Array" v={server.storage.raid} />
                  <Spec k="NIC" v={server.nic} />
                  <Spec k="Management" v="Dedicated IPMI 1GbE (AST2500)" />
                  <Spec k="PSU" v="80 PLUS Platinum Redundant (1+1)" />
                </Section>
              </>
            )}

            {tab === "logs" && <LogViewer serverId={server.id} />}

            {tab === "services" && (
              <div className="glass rounded-[20px] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Layers size={15} className="text-[var(--color-ink-faint)]" />
                  <h4 className="text-[13px] font-medium">systemd 서비스 관리</h4>
                </div>
                <ServicesTab server={server} />
              </div>
            )}

            {tab === "sensors" && (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Gauge size={15} className="text-[var(--color-ink-faint)]" />
                  <h4 className="text-[13px] font-medium">IPMI BMC 센서</h4>
                  <span className="ml-auto font-mono text-[10px] text-[var(--color-ink-faint)]">{server.ipmiIp}</span>
                </div>
                <IpmiSensorsTab server={server} off={off} />
              </div>
            )}

            <div className="pt-1 text-center font-mono text-[10px] text-[var(--color-ink-faint)]">
              Agent: python-psutil + pynvml · 2s poll · InfluxDB retention 30d
            </div>
          </div>
        </div>
      </div>

      {sshOpen && <SshTerminal server={server} onClose={() => setSshOpen(false)} />}
      {kvmOpen && <KvmConsole server={server} onClose={() => setKvmOpen(false)} />}
    </>
  )
}
