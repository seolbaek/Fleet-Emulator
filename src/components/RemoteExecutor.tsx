import { useState } from "react"
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  Clock,
} from "lucide-react"
import { useEmulator, useSmartScroll } from "../lib/emulator"
import type { RemoteJob, RemoteResult } from "../lib/emulator"
import { servers } from "../data/fleet"
import type { Server } from "../data/fleet"
import { Label, Panel, Pill } from "./primitives"

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_CMDS = [
  "df -h",
  "free -h",
  "uptime",
  "uname -r",
  "nvidia-smi",
  "ps aux | head -20",
  "docker ps",
  "ip a",
  "systemctl list-units --failed",
  "journalctl -n 20",
]

type FilterMode = "all" | "gpu" | "infra" | "custom"
type Phase = RemoteResult["phase"]

const PHASE_ORDER: Record<Phase, number> = {
  running: 0,
  connecting: 1,
  pending: 2,
  error: 3,
  done: 4,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleTone(role: string): string {
  if (role === "AI/GPU") return "accent"
  if (role === "Database" || role === "Redis") return "warn"
  return "muted"
}

function jobOverallStatus(job: RemoteJob): "running" | "error" | "done" {
  const phases = Array.from(job.results.values()).map((r) => r.phase)
  if (phases.some((p) => p === "running" || p === "connecting" || p === "pending"))
    return "running"
  if (phases.some((p) => p === "error")) return "error"
  return "done"
}

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// ─── Phase badge ──────────────────────────────────────────────────────────────

function PhaseLabel({ phase }: { phase: Phase }) {
  if (phase === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-ink-faint)]">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-50" />
        <span className="whitespace-nowrap text-[10px] font-medium">대기 중</span>
      </span>
    )
  }
  if (phase === "connecting") {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-warn)]">
        <Wifi className="h-3 w-3 flex-shrink-0" />
        <span className="whitespace-nowrap text-[10px] font-medium">연결 중</span>
      </span>
    )
  }
  if (phase === "running") {
    return (
      <span className="flex items-center gap-1.5 text-[#58a6ff]">
        <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
        <span className="whitespace-nowrap text-[10px] font-medium">실행 중</span>
      </span>
    )
  }
  if (phase === "done") {
    return (
      <span className="flex items-center gap-1.5 text-[var(--color-ok)]">
        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        <span className="whitespace-nowrap text-[10px] font-medium">완료</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[var(--color-err)]">
      <XCircle className="h-3 w-3 flex-shrink-0" />
      <span className="whitespace-nowrap text-[10px] font-medium">오류</span>
    </span>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ server, result }: { server: Server; result: RemoteResult }) {
  const { scrollRef, onScroll } = useSmartScroll(result.output.length)
  const isErrorOutput =
    result.phase === "error" || (result.exitCode !== undefined && result.exitCode !== 0)

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        minHeight: 156,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[11px] font-semibold text-[#c9d1d9]">
            {server.hostname.split(".")[0]}
          </span>
          <Pill tone={roleTone(server.role)}>{server.role}</Pill>
        </div>
        <PhaseLabel phase={result.phase} />
      </div>

      {/* Output body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
        style={{ maxHeight: 164, minHeight: 72 }}
      >
        {result.output.length === 0 && result.phase === "pending" && (
          <span className="font-mono text-[11px] text-[var(--color-ink-faint)] opacity-40">
            대기 중...
          </span>
        )}
        {result.output.length === 0 && result.phase === "connecting" && (
          <span className="font-mono text-[11px] text-[var(--color-warn)] opacity-70">
            SSH 연결 중...
          </span>
        )}
        {result.output.length === 0 && result.phase === "running" && (
          <span className="font-mono text-[11px] text-[#58a6ff] opacity-70">
            명령 실행 중...
          </span>
        )}
        {result.output.map((line, i) => (
          <div
            key={i}
            className="font-mono text-[11px] leading-[1.55]"
            style={{ color: isErrorOutput ? "#ff453a" : "#c9d1d9" }}
          >
            {line || " "}
          </div>
        ))}
      </div>

      {/* Footer */}
      {(result.phase === "done" || result.phase === "error") && (
        <div
          className="flex items-center gap-3 px-3 py-1.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="font-mono text-[10px]"
            style={{
              color:
                result.exitCode === 0
                  ? "var(--color-ok)"
                  : "#ff453a",
            }}
          >
            exit {result.exitCode ?? "—"}
          </span>
          {result.durationMs !== undefined && (
            <span className="font-mono text-[10px] text-[var(--color-ink-faint)]">
              {fmtDuration(result.durationMs)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RemoteExecutor() {
  const emulator = useEmulator()
  const [command, setCommand] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  const gpuServers = servers.filter((s) => s.role === "AI/GPU")
  const infraServers = servers.filter((s) => s.role !== "AI/GPU")

  const targetServers: Server[] = (() => {
    if (filterMode === "gpu") return gpuServers
    if (filterMode === "infra") return infraServers
    if (filterMode === "custom") return servers.filter((s) => selectedIds.has(s.id))
    return servers
  })()

  const currentJob: RemoteJob | null =
    currentJobId != null ? (emulator.remoteJobs.get(currentJobId) ?? null) : null

  const isRunning =
    currentJob != null &&
    Array.from(currentJob.results.values()).some(
      (r) => r.phase === "running" || r.phase === "connecting" || r.phase === "pending",
    )

  const canExecute = command.trim().length > 0 && targetServers.length > 0 && !isRunning

  function handleExecute() {
    if (!canExecute) return
    const jobId = Date.now().toString(36)
    emulator.runRemoteCommand(
      jobId,
      command.trim(),
      targetServers.map((s) => s.id),
    )
    setCurrentJobId(jobId)
  }

  function toggleServer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sort targets by phase priority: running first, done last
  const sortedTargets =
    currentJob != null
      ? currentJob.targets
          .map((id) => ({
            server: servers.find((s) => s.id === id)!,
            result: currentJob.results.get(id)!,
          }))
          .filter((x) => x.server != null && x.result != null)
          .sort((a, b) => PHASE_ORDER[a.result.phase] - PHASE_ORDER[b.result.phase])
      : []

  // All jobs newest-first
  const allJobs = Array.from(emulator.remoteJobs.values()).sort(
    (a, b) => b.startedAt - a.startedAt,
  )

  const FILTER_OPTIONS: { key: FilterMode; label: string; count?: number }[] = [
    { key: "all", label: "전체 서버", count: servers.length },
    { key: "gpu", label: "GPU 서버 (EMP)", count: gpuServers.length },
    { key: "infra", label: "인프라 서버", count: infraServers.length },
    { key: "custom", label: "직접 선택" },
  ]

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">
          원격 실행
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--color-ink-faint)]">
          SSH를 통한 일괄 명령 실행 · 실시간 출력 스트리밍
        </p>
      </div>

      {/* ── Command bar ─────────────────────────────────────────────────── */}
      <Panel className="p-5">
        {/* Textarea */}
        <div className="mb-3">
          <Label>명령어</Label>
          <textarea
            rows={2}
            className="mt-1.5 w-full resize-none rounded-[10px] border border-black/[0.08] bg-black/[0.04] px-3.5 py-2.5 font-mono text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-accent)]/40 focus:ring-1 focus:ring-[var(--color-accent)]/20"
            placeholder="예: df -h  /  nvidia-smi  /  systemctl status docker"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExecute()
            }}
          />
        </div>

        {/* Quick-command chips */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {QUICK_CMDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className="rounded-full border border-black/[0.08] bg-black/[0.03] px-2.5 py-1 font-mono text-[11px] text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/8 hover:text-[var(--color-accent)]"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Server selector */}
        <div className="mb-3">
          <Label>대상 서버</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const active = filterMode === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilterMode(opt.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                      : "border-black/[0.08] bg-black/[0.03] text-[var(--color-ink-dim)] hover:border-black/[0.12] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {opt.label}
                  {opt.count !== undefined && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        active ? "bg-[var(--color-accent)]/20" : "bg-black/[0.06]"
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom server grid */}
        {filterMode === "custom" && (
          <div className="mb-4 max-h-52 overflow-y-auto rounded-[10px] border border-black/[0.08] bg-black/[0.03] p-3">
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {servers.map((s) => {
                const checked = selectedIds.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleServer(s.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-[8px] border px-2.5 py-2 text-left transition-colors ${
                      checked
                        ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                        : "border-transparent bg-black/[0.03] hover:border-black/[0.08] hover:bg-black/[0.06]"
                    } ${s.status === "off" ? "opacity-40" : ""}`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-semibold text-[var(--color-ink)]">
                        {s.id}
                      </span>
                      <span
                        className={`h-2 w-2 flex-shrink-0 rounded-full border transition-colors ${
                          checked
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                            : "border-black/20 bg-transparent"
                        }`}
                      />
                    </div>
                    <Pill tone={roleTone(s.role)}>{s.role}</Pill>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer row: count badge + execute */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-[12px] text-[var(--color-ink-faint)]">
            <span className="font-semibold text-[var(--color-ink)]">{targetServers.length}</span>개
            서버 선택됨
          </span>
          <button
            onClick={handleExecute}
            disabled={!canExecute}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" fill="currentColor" />
            )}
            실행
          </button>
        </div>
      </Panel>

      {/* ── Results area ────────────────────────────────────────────────── */}
      {currentJob != null && (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">실행 결과</h3>
            <code className="max-w-xs truncate rounded-[6px] border border-black/[0.08] bg-black/[0.04] px-2 py-0.5 font-mono text-[11px] text-[var(--color-ink-dim)]">
              {currentJob.command}
            </code>
            <span className="text-[11px] text-[var(--color-ink-faint)]">
              {currentJob.targets.length}개 서버
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedTargets.map(({ server, result }) => (
              <ResultCard key={server.id} server={server} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* ── Job history ─────────────────────────────────────────────────── */}
      {allJobs.length > 0 && (
        <Panel className="overflow-hidden p-0">
          <div
            className="px-5 py-3.5"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">작업 기록</h3>
          </div>
          <div>
            {allJobs.map((job, idx) => {
              const status = jobOverallStatus(job)
              const isCurrent = job.id === currentJobId
              return (
                <div
                  key={job.id}
                  onClick={() => setCurrentJobId(job.id)}
                  className={`flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-black/[0.025] ${
                    isCurrent ? "bg-[var(--color-accent)]/5" : ""
                  }`}
                  style={
                    idx < allJobs.length - 1
                      ? { borderBottom: "1px solid rgba(0,0,0,0.04)" }
                      : {}
                  }
                >
                  {/* Command + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: "var(--color-accent)" }}
                        />
                      )}
                      <span className="truncate font-mono text-[12px] text-[var(--color-ink)]">
                        {job.command}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3">
                      <span className="text-[11px] text-[var(--color-ink-faint)]">
                        {job.targets.length}개 서버
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--color-ink-faint)]">
                        <Clock className="h-2.5 w-2.5" />
                        {fmtTime(job.startedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Overall status */}
                  <div className="flex-shrink-0">
                    {status === "running" && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[#58a6ff]">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        실행 중
                      </span>
                    )}
                    {status === "error" && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-err)]">
                        <XCircle className="h-3 w-3" />
                        일부 오류
                      </span>
                    )}
                    {status === "done" && (
                      <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ok)]">
                        <CheckCircle2 className="h-3 w-3" />
                        완료
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>
      )}
    </div>
  )
}
