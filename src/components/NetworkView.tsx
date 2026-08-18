import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Activity,
  AlertTriangle,
  Globe,
  Network,
  Layers3,
} from "lucide-react"
import { servers, type Server, type Status } from "../data/fleet"
import { useEmulator } from "../lib/emulator"
import { Label, Panel, Pill } from "./primitives"

type LiveRow = Server & { liveRx: number; liveTx: number; liveStatus: Status }

function PageHead({ title, desc, right }: { title: string; desc: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-[var(--color-ink-dim)]">{desc}</p>
      </div>
      {right}
    </div>
  )
}

function fmtMbps(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} Gbps`
  return `${v.toFixed(0)} Mbps`
}

function BandwidthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.08]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

type SortKey = "rx" | "tx" | "loss" | "conns" | "role"
type FilterMode = "all" | "gpu" | "infra" | "warn"

export function NetworkView({ onOpen }: { onOpen: (id: string) => void }) {
  const em = useEmulator()
  const [sort, setSort] = useState<SortKey>("rx")
  const [filter, setFilter] = useState<FilterMode>("all")
  const [view, setView] = useState<"table" | "topology">("table")

  // Merge live state into server rows
  const rows: LiveRow[] = servers.map((s) => {
    const st = em.serverStates.get(s.id)
    return {
      ...s,
      liveRx: st?.netRxMbps ?? s.netRxMbps,
      liveTx: st?.netTxMbps ?? s.netTxMbps,
      liveStatus: (st?.status ?? s.status) as Status,
    }
  })

  const filtered = rows.filter((r) => {
    if (filter === "gpu") return r.role === "AI/GPU"
    if (filter === "infra") return r.role !== "AI/GPU"
    if (filter === "warn") return r.packetLossPct > 0 || r.liveStatus !== "ok"
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "rx") return b.liveRx - a.liveRx
    if (sort === "tx") return b.liveTx - a.liveTx
    if (sort === "loss") return b.packetLossPct - a.packetLossPct
    if (sort === "conns") return b.connections - a.connections
    return a.role.localeCompare(b.role)
  })

  // Aggregate stats
  const online = rows.filter((r) => r.liveStatus !== "off")
  const totalRx = online.reduce((s, r) => s + r.liveRx, 0)
  const totalTx = online.reduce((s, r) => s + r.liveTx, 0)
  const totalConns = online.reduce((s, r) => s + r.connections, 0)
  const warnCount = online.filter((r) => r.packetLossPct > 0).length
  const maxBw = Math.max(...rows.map((r) => Math.max(r.liveRx, r.liveTx)), 1)

  // Role bandwidth aggregates
  const byRole = Object.entries(
    rows.reduce<Record<string, { rx: number; tx: number; count: number }>>((acc, r) => {
      if (!acc[r.role]) acc[r.role] = { rx: 0, tx: 0, count: 0 }
      acc[r.role].rx += r.liveRx
      acc[r.role].tx += r.liveTx
      acc[r.role].count++
      return acc
    }, {})
  ).sort((a, b) => b[1].rx + b[1].tx - (a[1].rx + a[1].tx))

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => setSort(k)}
      className={`rounded-md px-2 py-0.5 font-mono text-[10px] transition-colors ${
        sort === k
          ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
          : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
      }`}
    >
      {label}
    </button>
  )

  const roleTone: Record<string, string> = {
    "AI/GPU": "accent",
    Database: "ok",
    Redis: "err",
    API: "ok",
    Monitoring: "muted",
    Git: "muted",
    "CI/CD": "muted",
    Build: "muted",
    Game: "warn",
    Content: "muted",
    Artifact: "muted",
    Backup: "muted",
  }

  return (
    <div>
      <PageHead
        title="네트워크 모니터링"
        desc="실시간 대역폭 · 패킷 손실 · 연결 수 · 역할별 트래픽 분석"
        right={
          <div className="flex gap-1.5 rounded-full bg-black/[0.06] p-1">
            {(["table", "topology"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                  view === v
                    ? "bg-white/70 text-[var(--color-ink)] shadow-sm"
                    : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                }`}
              >
                {v === "table" ? "테이블" : "토폴로지"}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          { icon: ArrowDown, label: "총 수신 (Rx)", value: fmtMbps(totalRx), color: "var(--color-ok)" },
          { icon: ArrowUp, label: "총 송신 (Tx)", value: fmtMbps(totalTx), color: "var(--color-accent)" },
          { icon: Network, label: "활성 연결", value: totalConns.toLocaleString(), color: "var(--color-ink)" },
          { icon: AlertTriangle, label: "패킷 손실", value: `${warnCount}개 서버`, color: warnCount > 0 ? "var(--color-warn)" : "var(--color-ok)" },
        ].map((k) => (
          <Panel key={k.label} className="flex items-center gap-3 p-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: `${k.color}18` }}
            >
              <k.icon size={16} style={{ color: k.color }} />
            </div>
            <div>
              <Label>{k.label}</Label>
              <div className="mt-0.5 font-mono text-[15px] font-semibold" style={{ color: k.color }}>
                {k.value}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div>
          {/* Filter + sort bar */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex gap-1">
              {([["all", "전체"], ["gpu", "GPU 서버"], ["infra", "인프라"], ["warn", "경보"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                    filter === k
                      ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                      : "glass-thin text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[var(--color-ink-faint)]">정렬:</span>
              <SortBtn k="rx" label="Rx↓" />
              <SortBtn k="tx" label="Tx↓" />
              <SortBtn k="loss" label="손실↓" />
              <SortBtn k="conns" label="연결↓" />
              <SortBtn k="role" label="역할" />
            </div>
          </div>

          {view === "table" ? (
            <Panel className="overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1.2fr_0.8fr_1.6fr_1.4fr_0.9fr_0.7fr] gap-3 border-b border-black/[0.07] px-4 py-2.5">
                {["서버", "역할", "수신 Rx", "송신 Tx", "연결", "손실"].map((h) => (
                  <Label key={h}>{h}</Label>
                ))}
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                {sorted.map((r) => {
                  const isOff = r.liveStatus === "off"
                  const hasLoss = r.packetLossPct > 0
                  return (
                    <div
                      key={r.id}
                      onClick={() => onOpen(r.id)}
                      className="grid cursor-pointer grid-cols-[1.2fr_0.8fr_1.6fr_1.4fr_0.9fr_0.7fr] items-center gap-3 border-b border-black/[0.05] px-4 py-3 transition-colors last:border-0 hover:bg-black/[0.04]"
                    >
                      {/* Server */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              background: isOff
                                ? "var(--color-off)"
                                : r.liveStatus === "err"
                                ? "var(--color-err)"
                                : r.liveStatus === "warn"
                                ? "var(--color-warn)"
                                : "var(--color-ok)",
                            }}
                          />
                          <span className="truncate font-mono text-[12px]">{r.id}</span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-ink-faint)]">
                          {r.dataIp}
                        </div>
                      </div>

                      {/* Role */}
                      <Pill tone={roleTone[r.role] ?? "muted"}>{r.role}</Pill>

                      {/* Rx */}
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[var(--color-ok)]">
                            {isOff ? "—" : fmtMbps(r.liveRx)}
                          </span>
                        </div>
                        {!isOff && (
                          <BandwidthBar value={r.liveRx} max={maxBw} color="var(--color-ok)" />
                        )}
                      </div>

                      {/* Tx */}
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[var(--color-accent)]">
                            {isOff ? "—" : fmtMbps(r.liveTx)}
                          </span>
                        </div>
                        {!isOff && (
                          <BandwidthBar value={r.liveTx} max={maxBw} color="var(--color-accent)" />
                        )}
                      </div>

                      {/* Connections */}
                      <span className="font-mono text-[12px] text-[var(--color-ink-dim)]">
                        {isOff ? "—" : r.connections.toLocaleString()}
                      </span>

                      {/* Packet loss */}
                      <span
                        className={`font-mono text-[12px] ${
                          isOff
                            ? "text-[var(--color-ink-faint)]"
                            : hasLoss
                            ? "text-[var(--color-warn)]"
                            : "text-[var(--color-ok)]"
                        }`}
                      >
                        {isOff ? "—" : hasLoss ? `${r.packetLossPct}%` : "0%"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Panel>
          ) : (
            // Topology view — simple rack-zone diagram
            <TopologyView rows={rows} onOpen={onOpen} />
          )}
        </div>

        {/* Sidebar panels */}
        <div className="flex flex-col gap-4">
          {/* Role breakdown */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Layers3 size={13} className="text-[var(--color-ink-faint)]" />
              <Label>역할별 대역폭</Label>
            </div>
            <div className="space-y-3">
              {byRole.map(([role, data]) => {
                const total = data.rx + data.tx
                const maxTotal = byRole[0][1].rx + byRole[0][1].tx
                return (
                  <div key={role}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[12px] text-[var(--color-ink-dim)]">{role}</span>
                      <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
                        {fmtMbps(data.rx + data.tx)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.08]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (total / maxTotal) * 100)}%`,
                          background: `var(--color-accent)`,
                          opacity: 0.65 + (total / maxTotal) * 0.35,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* Top consumers */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={13} className="text-[var(--color-ink-faint)]" />
              <Label>최대 대역폭 서버 Top 5</Label>
            </div>
            <div className="space-y-2.5">
              {[...rows]
                .sort((a, b) => b.liveRx + b.liveTx - (a.liveRx + a.liveTx))
                .slice(0, 5)
                .map((r, i) => (
                  <div
                    key={r.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] p-1.5 transition-colors hover:bg-black/[0.04]"
                    onClick={() => onOpen(r.id)}
                  >
                    <span className="w-4 text-center font-mono text-[10px] text-[var(--color-ink-faint)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px]">{r.id}</div>
                      <div className="font-mono text-[10px] text-[var(--color-ink-faint)]">{r.dataIp}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[11px] text-[var(--color-ok)]">↓{fmtMbps(r.liveRx)}</div>
                      <div className="font-mono text-[11px] text-[var(--color-accent)]">↑{fmtMbps(r.liveTx)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </Panel>

          {/* Packet loss warnings */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={13} className="text-[var(--color-warn)]" />
              <Label>패킷 손실 감지</Label>
            </div>
            {rows.filter((r) => r.packetLossPct > 0).length === 0 ? (
              <div className="py-3 text-center font-mono text-[11px] text-[var(--color-ok)]">
                ✓ 모든 링크 정상
              </div>
            ) : (
              <div className="space-y-2">
                {rows
                  .filter((r) => r.packetLossPct > 0)
                  .sort((a, b) => b.packetLossPct - a.packetLossPct)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex cursor-pointer items-center justify-between rounded-[8px] p-2 transition-colors hover:bg-black/[0.04]"
                      onClick={() => onOpen(r.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-warn)]" />
                        <span className="font-mono text-[12px]">{r.id}</span>
                      </div>
                      <span className="font-mono text-[12px] text-[var(--color-warn)]">
                        {r.packetLossPct}% loss
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </Panel>

          {/* NIC info */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe size={13} className="text-[var(--color-ink-faint)]" />
              <Label>NIC 유형 분포</Label>
            </div>
            <div className="space-y-1.5">
              {Object.entries(
                rows.reduce<Record<string, number>>((acc, r) => {
                  acc[r.nic] = (acc[r.nic] ?? 0) + 1
                  return acc
                }, {})
              ).map(([nic, count]) => (
                <div key={nic} className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[var(--color-ink-dim)]">{nic}</span>
                  <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{count}개</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── Topology view ────────────────────────────────────────────────────────────

function TopologyView({ rows, onOpen }: { rows: LiveRow[]; onOpen: (id: string) => void }) {
  const racks = ["A", "B", "C", "D", "E"]
  const byRack = Object.fromEntries(racks.map((r) => [r, rows.filter((s) => s.rack === r)]))

  const statusColor = (status: string) => {
    if (status === "ok") return "var(--color-ok)"
    if (status === "warn") return "var(--color-warn)"
    if (status === "err") return "var(--color-err)"
    return "var(--color-off)"
  }

  return (
    <div className="rounded-[20px] border border-black/[0.07] bg-black/[0.02] p-5">
      {/* Core switch */}
      <div className="mb-6 flex justify-center">
        <div
          className="flex items-center gap-3 rounded-[14px] px-6 py-3"
          style={{ background: "rgba(0,113,227,0.12)", border: "1px solid rgba(0,113,227,0.25)" }}
        >
          <Network size={18} className="text-[#0071e3]" />
          <div className="text-center">
            <div className="font-mono text-[12px] font-medium text-[#0071e3]">Core Switch</div>
            <div className="font-mono text-[9px] text-[var(--color-ink-faint)]">Mellanox SN3800 · 100GbE · RACK-X</div>
          </div>
        </div>
      </div>

      {/* Rack columns */}
      <div className="grid grid-cols-5 gap-3">
        {racks.map((rack) => (
          <div key={rack}>
            {/* Rack switch */}
            <div
              className="mb-3 rounded-[10px] px-3 py-2 text-center"
              style={{ background: "rgba(94,92,230,0.10)", border: "1px solid rgba(94,92,230,0.2)" }}
            >
              <div className="font-mono text-[10px] font-medium" style={{ color: "#5e5ce6" }}>
                Rack {rack}
              </div>
              <div className="font-mono text-[9px] text-[var(--color-ink-faint)]">ToR · 10GbE</div>
            </div>

            {/* Server nodes */}
            <div className="space-y-1.5">
              {byRack[rack]?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className="group w-full rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-black/[0.05]"
                  style={{ border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: statusColor(s.liveStatus) }}
                    />
                    <span className="truncate font-mono text-[10px] text-[var(--color-ink-dim)] group-hover:text-[var(--color-ink)]">
                      {s.id}
                    </span>
                  </div>
                  {s.liveStatus !== "off" && (
                    <div className="mt-1 flex gap-1">
                      <div
                        className="h-1 flex-1 rounded-full"
                        style={{
                          background: `linear-gradient(to right, var(--color-ok) ${Math.min(100, (s.liveRx / 2000) * 100)}%, transparent 0%)`,
                          backgroundColor: "rgba(0,0,0,0.08)",
                        }}
                      />
                      <div
                        className="h-1 flex-1 rounded-full"
                        style={{
                          background: `linear-gradient(to right, var(--color-accent) ${Math.min(100, (s.liveTx / 2000) * 100)}%, transparent 0%)`,
                          backgroundColor: "rgba(0,0,0,0.08)",
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 flex items-center justify-center gap-5 border-t border-black/[0.05] pt-4">
        {[
          { color: "var(--color-ok)", label: "정상" },
          { color: "var(--color-warn)", label: "경고" },
          { color: "var(--color-err)", label: "오류" },
          { color: "var(--color-off)", label: "오프라인" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
            <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-4 rounded-full" style={{ background: "var(--color-ok)" }} />
          <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">Rx</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-4 rounded-full" style={{ background: "var(--color-accent)" }} />
          <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">Tx</span>
        </div>
      </div>
    </div>
  )
}
