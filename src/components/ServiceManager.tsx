import { useState, Fragment } from "react"
import {
  Play,
  Square,
  RotateCcw,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react"
import { useEmulator } from "../lib/emulator"
import type { ServiceEntry, SvcStatus, LogLine } from "../lib/emulator"
import { servers } from "../data/fleet"
import { Label, Panel, Pill } from "./primitives"

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "active" | "failed" | "inactive"
type ServiceAction = "start" | "stop" | "restart" | "reload" | "enable" | "disable"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUptime(sec: number): string {
  if (sec <= 0) return "—"
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0 || parts.length === 0) parts.push(`${m}m`)
  return parts.slice(0, 3).join(" ")
}

function svcPillTone(status: SvcStatus): string {
  if (status === "active") return "ok"
  if (status === "failed") return "err"
  if (status === "inactive") return "off"
  return "warn"
}

function isTransitioning(status: SvcStatus): boolean {
  return status === "activating" || status === "deactivating" || status === "reloading"
}

function buildSystemctlOutput(svc: ServiceEntry): string[] {
  const server = servers.find((s) => s.id === svc.serverId)
  const hostname = server?.hostname.split(".")[0] ?? svc.serverId.toLowerCase()
  const active = svc.status === "active"
  const dot = active ? "●" : svc.status === "failed" ? "×" : "○"
  const unitBase = svc.name.split("@")[0].split("-")[0]

  const now = new Date()
  const sinceDate = new Date(now.getTime() - svc.uptimeSec * 1000)
  const sinceFmt =
    sinceDate.toISOString().replace("T", " ").slice(0, 19) + " UTC"
  const agoStr = svc.uptimeSec > 0 ? `${formatUptime(svc.uptimeSec)} ago` : "—"

  const lines: string[] = []
  lines.push(`${dot} ${svc.name}.service - ${svc.desc}`)
  lines.push(
    `   Loaded: loaded (/lib/systemd/system/${svc.name}.service; ${svc.enabled ? "enabled" : "disabled"}; vendor preset: enabled)`,
  )

  if (active) {
    lines.push(
      `   Active: active (running) since ${sinceFmt}; ${agoStr}`,
    )
    if (svc.pid > 0) {
      lines.push(` Main PID: ${svc.pid} (${unitBase})`)
      lines.push(`    Tasks: ${Math.max(1, Math.floor(svc.memMb / 25))} (limit: 4915)`)
      lines.push(`   Memory: ${svc.memMb.toFixed(1)}M`)
      lines.push(`      CPU: ${((svc.memMb / 20) * 0.01).toFixed(2)}s`)
      lines.push(`   CGroup: /system.slice/${svc.name}.service`)
      lines.push(`           └─${svc.pid} /usr/sbin/${unitBase} --system --no-daemon`)
    }
  } else if (svc.status === "failed") {
    lines.push(`   Active: failed (Result: exit-code) since ${sinceFmt}`)
    lines.push(
      `  Process: ${svc.pid || 9999} ExecStart=/usr/sbin/${unitBase} (code=exited, status=1/FAILURE)`,
    )
    lines.push(``)
    lines.push(
      `${hostname} systemd[1]: ${svc.name}.service: Main process exited, code=exited, status=1/FAILURE`,
    )
    lines.push(
      `${hostname} systemd[1]: ${svc.name}.service: Failed with result "exit-code".`,
    )
    lines.push(`${hostname} systemd[1]: Failed to start ${svc.desc}.`)
  } else {
    lines.push(`   Active: ${svc.status} (dead)`)
  }

  return lines
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "ok" | "err" | "off"
}) {
  const colorClass =
    tone === "ok"
      ? "text-[var(--color-ok)]"
      : tone === "err"
        ? "text-[var(--color-err)]"
        : tone === "off"
          ? "text-[var(--color-off)]"
          : "text-[var(--color-ink)]"

  return (
    <Panel className="flex flex-col gap-1.5 p-4">
      <Label>{label}</Label>
      <span className={`tabular text-[28px] font-semibold leading-none ${colorClass}`}>
        {value}
      </span>
    </Panel>
  )
}

function SvcStatusDot({ status }: { status: SvcStatus }) {
  if (isTransitioning(status)) {
    return (
      <Loader2
        size={10}
        className="animate-spin shrink-0"
        style={{ color: "var(--color-warn)" }}
      />
    )
  }
  const color =
    status === "active"
      ? "var(--color-ok)"
      : status === "failed"
        ? "var(--color-err)"
        : "var(--color-off)"

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {status === "active" && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping"
          style={{ backgroundColor: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  disabled,
  spinning,
  onClick,
}: {
  icon: typeof Play
  label: string
  disabled: boolean
  spinning: boolean
  onClick: () => void
}) {
  return (
    <button
      title={label}
      disabled={disabled || spinning}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
        disabled || spinning
          ? "cursor-not-allowed opacity-25"
          : "cursor-pointer text-[var(--color-ink-dim)] hover:bg-black/[0.07] hover:text-[var(--color-ink)]"
      }`}
    >
      {spinning ? (
        <Loader2
          size={12}
          className="animate-spin"
          style={{ color: "var(--color-warn)" }}
        />
      ) : (
        <Icon size={12} />
      )}
    </button>
  )
}

function DetailPanel({
  svc,
  logs,
  onOpen,
}: {
  svc: ServiceEntry
  logs: LogLine[]
  onOpen: (id: string) => void
}) {
  const statusLines = buildSystemctlOutput(svc)
  const recentLogs = logs.slice(-12)
  const server = servers.find((s) => s.id === svc.serverId)

  return (
    <div className="space-y-4 bg-black/[0.02] px-6 pb-5 pt-3">
      {/* Meta row */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
        <div className="min-w-[200px] flex-1 space-y-0.5">
          <Label>Description</Label>
          <p className="text-[12px] leading-relaxed text-[var(--color-ink)]">
            {svc.desc}
          </p>
        </div>
        <div className="space-y-0.5">
          <Label>PID</Label>
          <p className="font-mono text-[12px] text-[var(--color-ink)]">
            {svc.pid > 0 ? svc.pid : "—"}
          </p>
        </div>
        <div className="space-y-0.5">
          <Label>Hostname</Label>
          <button
            onClick={() => onOpen(svc.serverId)}
            className="block font-mono text-[12px] text-[var(--color-accent)] hover:underline"
          >
            {server?.hostname ?? svc.serverId}
          </button>
        </div>
        <div className="space-y-0.5">
          <Label>Role</Label>
          <p className="text-[12px] text-[var(--color-ink-dim)]">{svc.role}</p>
        </div>
      </div>

      {/* systemctl status block */}
      <div>
        <Label>systemctl status {svc.name}</Label>
        <div
          className="mt-1.5 max-h-[160px] overflow-auto rounded-xl p-3 font-mono text-[11px] leading-[1.7]"
          style={{ background: "#0d1117" }}
        >
          {statusLines.map((line, i) => {
            const isTitle = i === 0
            const color = isTitle
              ? svc.status === "active"
                ? "#3fb950"
                : svc.status === "failed"
                  ? "#f85149"
                  : "#8b949e"
              : "#c9d1d9"
            return (
              <div
                key={i}
                className="whitespace-pre"
                style={{ color }}
              >
                {line || " "}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent journal lines */}
      {recentLogs.length > 0 && (
        <div>
          <Label>
            Recent Journal — {server?.hostname.split(".")[0] ?? svc.serverId}
          </Label>
          <div
            className="mt-1.5 max-h-[120px] overflow-auto rounded-xl p-3 font-mono text-[11px] leading-[1.7]"
            style={{ background: "#0d1117" }}
          >
            {recentLogs.map((line) => (
              <div key={line.id} className="flex gap-2.5">
                <span className="shrink-0" style={{ color: "#484f58" }}>
                  {line.ts}
                </span>
                <span
                  className="w-[80px] shrink-0 truncate"
                  style={{
                    color:
                      line.level === "err"
                        ? "#f85149"
                        : line.level === "warn"
                          ? "#d29922"
                          : "#388bfd",
                  }}
                >
                  {line.facility}
                </span>
                <span className="break-all" style={{ color: "#c9d1d9" }}>
                  {line.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ServiceManager({ onOpen }: { onOpen: (id: string) => void }) {
  const em = useEmulator()

  const [search, setSearch] = useState("")
  const [serverFilter, setServerFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [pendingActions, setPendingActions] = useState<Map<string, ServiceAction>>(
    new Map(),
  )
  const [enabledOverrides, setEnabledOverrides] = useState<Map<string, boolean>>(
    new Map(),
  )

  const serverOptions = [
    { id: "all", label: "All Servers" },
    ...servers.map((s) => ({ id: s.id, label: s.id })),
  ]

  const statusFilterOpts: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "failed", label: "Failed" },
    { key: "inactive", label: "Inactive" },
  ]

  // Always fresh: getServices reads live Maps; useEmulator re-renders on tick
  const allServices = em.getServices(
    serverFilter === "all" ? undefined : serverFilter,
  )

  const q = search.toLowerCase()
  const filtered = allServices.filter((svc) => {
    if (
      q &&
      !svc.name.toLowerCase().includes(q) &&
      !svc.desc.toLowerCase().includes(q)
    )
      return false
    if (statusFilter === "active" && svc.status !== "active") return false
    if (statusFilter === "failed" && svc.status !== "failed") return false
    if (statusFilter === "inactive" && svc.status !== "inactive") return false
    return true
  })

  const total = allServices.length
  const activeCount = allServices.filter((s) => s.status === "active").length
  const failedCount = allServices.filter((s) => s.status === "failed").length
  const inactiveCount = allServices.filter((s) => s.status === "inactive").length

  function dispatchAction(
    serverId: string,
    name: string,
    action: ServiceAction,
  ) {
    const key = `${serverId}::${name}`
    if (action === "enable") {
      setEnabledOverrides((prev) => new Map(prev).set(key, true))
    } else if (action === "disable") {
      setEnabledOverrides((prev) => new Map(prev).set(key, false))
    } else {
      setPendingActions((prev) => new Map(prev).set(key, action))
      setTimeout(() => {
        setPendingActions((prev) => {
          const next = new Map(prev)
          next.delete(key)
          return next
        })
      }, 5000)
    }
    em.serviceAction(serverId, name, action)
  }

  return (
    <div className="space-y-5">
      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Services" value={total} />
        <KpiCard label="Active" value={activeCount} tone="ok" />
        <KpiCard label="Failed" value={failedCount} tone="err" />
        <KpiCard label="Inactive" value={inactiveCount} tone="off" />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <Panel className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex min-w-[180px] flex-1 items-center">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 text-[var(--color-ink-faint)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or description…"
              className="w-full rounded-full border border-[var(--color-hairline)] bg-black/[0.04] py-1.5 pl-8 pr-3 text-[12px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)]/60"
            />
          </div>

          {/* Server dropdown */}
          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="cursor-pointer rounded-full border border-[var(--color-hairline)] bg-black/[0.04] px-3 py-1.5 text-[12px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
          >
            {serverOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Status pills */}
          <div className="flex items-center gap-1">
            {statusFilterOpts.map((o) => (
              <button
                key={o.key}
                onClick={() => setStatusFilter(o.key)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  statusFilter === o.key
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-hairline)] bg-black/[0.04] text-[var(--color-ink-dim)] hover:bg-black/[0.08]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {/* ── Services table ──────────────────────────────────────────────────── */}
      <Panel className="overflow-hidden">
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="glass-strong">
                <th className="w-8 px-3 py-2.5 text-left" />
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-faint)]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-faint)]">
                  Service
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--color-ink-faint)]">
                  Server
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-faint)]">
                  Memory
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-[var(--color-ink-faint)]">
                  Uptime
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-[var(--color-ink-faint)]">
                  Enabled
                </th>
                <th className="px-4 py-2.5 text-center font-medium text-[var(--color-ink-faint)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((svc) => {
                const key = `${svc.serverId}::${svc.name}`
                const expanded = expandedKey === key
                const pending = pendingActions.get(key)
                const { status, memMb, uptimeSec } = svc
                const enabled = enabledOverrides.has(key)
                  ? enabledOverrides.get(key)!
                  : svc.enabled

                // Spinner derivation
                const startSpinning =
                  status === "activating" || pending === "start"
                const stopSpinning =
                  (status === "deactivating" && pending !== "restart") ||
                  pending === "stop"
                const restartSpinning = pending === "restart"
                const reloadSpinning =
                  status === "reloading" || pending === "reload"

                // Disabled derivation
                const startDisabled =
                  status === "active" || status === "activating"
                const stopDisabled =
                  status === "inactive" ||
                  status === "failed" ||
                  status === "deactivating"
                const restartDisabled = status !== "active"
                const reloadDisabled = status !== "active"

                return (
                  <Fragment key={key}>
                    <tr
                      className="cursor-pointer border-t border-[var(--color-hairline)] transition-colors hover:bg-black/[0.025]"
                      onClick={() =>
                        setExpandedKey((prev) => (prev === key ? null : key))
                      }
                    >
                      {/* Expand chevron */}
                      <td className="px-3 py-2.5 text-[var(--color-ink-faint)]">
                        {expanded ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <SvcStatusDot status={status} />
                          <Pill tone={svcPillTone(status)}>{status}</Pill>
                        </div>
                      </td>

                      {/* Service name */}
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-medium text-[var(--color-ink)]">
                          {svc.name}
                        </span>
                      </td>

                      {/* Server link */}
                      <td className="px-4 py-2.5">
                        <button
                          className="font-mono text-[var(--color-accent)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpen(svc.serverId)
                          }}
                        >
                          {svc.serverId}
                        </button>
                      </td>

                      {/* Memory */}
                      <td className="px-4 py-2.5 text-right tabular text-[var(--color-ink-dim)]">
                        {status === "active" && memMb > 0
                          ? `${Math.round(memMb)} MB`
                          : "—"}
                      </td>

                      {/* Uptime */}
                      <td className="px-4 py-2.5 text-right tabular text-[var(--color-ink-dim)]">
                        {status === "active" && uptimeSec > 0
                          ? formatUptime(uptimeSec)
                          : "—"}
                      </td>

                      {/* Enabled toggle */}
                      <td
                        className="px-4 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            dispatchAction(
                              svc.serverId,
                              svc.name,
                              enabled ? "disable" : "enable",
                            )
                          }
                          className="transition-opacity hover:opacity-70"
                        >
                          <Pill tone={enabled ? "ok" : "off"}>
                            {enabled ? "enabled" : "disabled"}
                          </Pill>
                        </button>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <ActionBtn
                            icon={Play}
                            label="Start"
                            disabled={startDisabled}
                            spinning={startSpinning}
                            onClick={() =>
                              dispatchAction(svc.serverId, svc.name, "start")
                            }
                          />
                          <ActionBtn
                            icon={Square}
                            label="Stop"
                            disabled={stopDisabled}
                            spinning={stopSpinning}
                            onClick={() =>
                              dispatchAction(svc.serverId, svc.name, "stop")
                            }
                          />
                          <ActionBtn
                            icon={RotateCcw}
                            label="Restart"
                            disabled={restartDisabled}
                            spinning={restartSpinning}
                            onClick={() =>
                              dispatchAction(svc.serverId, svc.name, "restart")
                            }
                          />
                          <ActionBtn
                            icon={RefreshCw}
                            label="Reload"
                            disabled={reloadDisabled}
                            spinning={reloadSpinning}
                            onClick={() =>
                              dispatchAction(svc.serverId, svc.name, "reload")
                            }
                          />
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded && (
                      <tr className="border-t border-[var(--color-hairline)]">
                        <td colSpan={8} className="p-0">
                          <DetailPanel
                            svc={svc}
                            logs={em.serverLogs.get(svc.serverId) ?? []}
                            onOpen={onOpen}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-[11px] text-[var(--color-ink-faint)]"
                  >
                    No services match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
