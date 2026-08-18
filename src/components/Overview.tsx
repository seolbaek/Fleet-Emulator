import { Cpu, HardDrive, Zap, Boxes, TrendingUp, TrendingDown } from "lucide-react"
import { alerts, fleetSummary, servers, statusLabel } from "../data/fleet"
import { useSeries, usePulse } from "../lib/live"
import { MiniArea } from "./charts"
import { Label, Panel, Pill, StatusDot } from "./primitives"
import type { Status } from "../data/fleet"

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  trend,
}: {
  icon: typeof Cpu
  label: string
  value: string
  unit?: string
  sub: string
  trend?: number
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <Label>{label}</Label>
        <Icon size={15} className="text-[var(--color-ink-faint)]" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="tabular text-[28px] font-semibold leading-none">{value}</span>
        {unit && <span className="text-sm text-[var(--color-ink-dim)]">{unit}</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[10px] ${
              trend >= 0 ? "text-[var(--color-ok)]" : "text-[var(--color-err)]"
            }`}
          >
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
        <span className="text-[11px] text-[var(--color-ink-faint)]">{sub}</span>
      </div>
    </Panel>
  )
}

export function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const s = fleetSummary()
  const cpuSeries = useSeries(46, 22)
  const netSeries = useSeries(6200, 3000)
  const gpuSeries = useSeries(68, 26)
  const powerNow = usePulse(s.totalPower, s.totalPower * 0.03, 2000)

  const vramPct = (s.vramUsed / s.vramTotal) * 100
  const attention = servers
    .filter((sv) => sv.status === "err" || sv.status === "warn")
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          icon={Boxes}
          label="Active Nodes"
          value={`${s.by.ok + s.by.warn + s.by.err}`}
          unit={`/ ${s.total}`}
          sub={`${statusLabel.warn} ${s.by.warn} · ${statusLabel.err} ${s.by.err} · ${statusLabel.off} ${s.by.off}`}
          trend={2}
        />
        <Stat
          icon={Cpu}
          label="GPU 점유"
          value={`${s.busyGpus}`}
          unit={`/ ${s.totalGpus} V100`}
          sub={`VRAM ${(s.vramUsed / 1024).toFixed(0)} / ${(s.vramTotal / 1024).toFixed(0)} GB · ${vramPct.toFixed(0)}%`}
          trend={5}
        />
        <Stat
          icon={Zap}
          label="총 전력 소비"
          value={`${(powerNow / 1000).toFixed(2)}`}
          unit="kW"
          sub={`PSU 헤드룸 ${(100 - (powerNow / (s.total * 1400)) * 100).toFixed(0)}%`}
          trend={-3}
        />
        <Stat
          icon={HardDrive}
          label="스토리지 상태"
          value={`${servers.filter((x) => x.storage.raidState === "Healthy").length}`}
          unit={`/ ${s.total} healthy`}
          sub="RAID 1 · 10 · Z2 어레이"
          trend={0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <Label>Fleet CPU 평균 사용률</Label>
            <span className="tabular text-sm text-[var(--color-accent)]">
              {cpuSeries[cpuSeries.length - 1]?.v}%
            </span>
          </div>
          <MiniArea data={cpuSeries} unit="%" domainMax={100} />
        </Panel>
        <Panel className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <Label>네트워크 처리량 (RX+TX)</Label>
            <span className="tabular text-sm text-[#007aff]">
              {(netSeries[netSeries.length - 1]?.v / 1000).toFixed(1)} Gbps
            </span>
          </div>
          <MiniArea data={netSeries} color="#007aff" unit=" Mbps" />
        </Panel>
        <Panel className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <Label>GPU 클러스터 평균 Util</Label>
            <span className="tabular text-sm text-[#5e5ce6]">
              {gpuSeries[gpuSeries.length - 1]?.v}%
            </span>
          </div>
          <MiniArea data={gpuSeries} color="#5e5ce6" unit="%" domainMax={100} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">주의 필요 노드</h3>
            <Label>{attention.length} nodes</Label>
          </div>
          <div className="space-y-1.5">
            {attention.map((sv) => {
              const gpu = sv.gpus[0]
              return (
                <button
                  key={sv.id}
                  onClick={() => onOpen(sv.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/[0.04]"
                >
                  <StatusDot status={sv.status} pulse />
                  <span className="w-20 font-mono text-[12px]">{sv.id}</span>
                  <span className="hidden w-40 truncate text-[12px] text-[var(--color-ink-dim)] sm:block">
                    {sv.hostname}
                  </span>
                  <div className="ml-auto flex items-center gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
                    <span>CPU {sv.cpuUtil}%</span>
                    <span>{sv.cpuTempC}°C</span>
                    {gpu && <span className="text-[#5e5ce6]">GPU {gpu.util}%</span>}
                    <Pill tone={sv.status as Status}>{statusLabel[sv.status]}</Pill>
                  </div>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">최근 알림</h3>
            <Label>Live</Label>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex gap-3">
                <div
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      a.severity === "critical"
                        ? "var(--color-err)"
                        : a.severity === "warning"
                          ? "var(--color-warn)"
                          : "var(--color-ink-faint)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--color-ink)]">{a.server}</span>
                    <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">{a.ts.slice(11)}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-ink-dim)]">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
