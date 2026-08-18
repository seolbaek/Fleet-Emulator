import { useState } from "react"
import {
  FileCode2,
  Play,
  Square,
  RotateCw,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  ChevronDown,
  ChevronUp,
  Terminal,
  Loader,
} from "lucide-react"
import {
  alerts as allAlerts,
  auditLog,
  containers,
  jobs,
  processes,
  reservations,
} from "../data/fleet"
import { useEmulator, useSmartScroll } from "../lib/emulator"
import { Label, Panel, Pill } from "./primitives"

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

/* ---------------- Alerts ---------------- */
export function AlertsView() {
  const [items, setItems] = useState(allAlerts)
  const sevTone = { critical: "err", warning: "warn", info: "muted" } as const
  return (
    <div>
      <PageHead
        title="알림 센터"
        desc="임계치 기반 실시간 경보 · Slack · Discord · Telegram · Email · Webhook"
        right={
          <div className="flex items-center gap-2">
            <Pill tone="err">{items.filter((a) => !a.acked).length} 미확인</Pill>
            <button
              onClick={() => setItems((p) => p.map((a) => ({ ...a, acked: true })))}
              className="glass-thin rounded-full px-3.5 py-1.5 text-[12px] text-[var(--color-ink-dim)] transition-all active:scale-95 hover:text-[var(--color-ink)]"
            >
              모두 확인
            </button>
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-4">
        {[
          { l: "임계치 규칙", v: "18개 활성" },
          { l: "24h 발생", v: "42건" },
          { l: "평균 대응 시간", v: "3분 12초" },
        ].map((x) => (
          <Panel key={x.l} className="p-4">
            <Label>{x.l}</Label>
            <div className="mt-1 text-[18px] font-semibold">{x.v}</div>
          </Panel>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((a) => (
          <Panel key={a.id} hover className="flex items-center gap-4 p-4">
            <Pill tone={sevTone[a.severity]}>{a.severity}</Pill>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px]">{a.server}</span>
                <span className="text-[11px] text-[var(--color-ink-faint)]">· {a.metric}</span>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-[var(--color-ink-dim)]">{a.message}</p>
            </div>
            <div className="hidden items-center gap-1.5 md:flex">
              {a.channels.map((c) => (
                <span
                  key={c}
                  className="rounded-md bg-black/[0.04] px-2 py-0.5 font-mono text-[10px] text-[var(--color-ink-faint)]"
                >
                  {c}
                </span>
              ))}
            </div>
            <span className="font-mono text-[11px] text-[var(--color-ink-faint)]">{a.ts.slice(11)}</span>
            <button
              onClick={() => setItems((p) => p.map((x) => (x.id === a.id ? { ...x, acked: !x.acked } : x)))}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                a.acked
                  ? "text-[var(--color-ok)]"
                  : "border border-black/10 text-[var(--color-ink-dim)] hover:bg-black/[0.05]"
              }`}
            >
              {a.acked ? "확인됨" : "확인"}
            </button>
          </Panel>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Reservations ---------------- */
export function ReservationsView() {
  const tone = { active: "ok", upcoming: "accent", done: "muted" } as const
  const lbl = { active: "사용 중", upcoming: "예정", done: "완료" }
  return (
    <div>
      <PageHead
        title="자원 예약"
        desc="직원 AI 서버(EMP-01~15) V100 점유 스케줄 · 유휴 서버 자동 안내"
        right={
          <button className="flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-4 py-1.5 text-[12px] text-[var(--color-accent)] transition-all active:scale-95 hover:bg-[var(--color-accent)]/18">
            <Send size={13} /> 새 예약
          </button>
        }
      />
      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          { l: "점유 중 GPU", v: "18 / 30" },
          { l: "유휴 서버", v: "EMP-06,08,10" },
          { l: "오늘 예약", v: "3건" },
          { l: "대기열", v: "1건" },
        ].map((x) => (
          <Panel key={x.l} className="p-4">
            <Label>{x.l}</Label>
            <div className="mt-1 font-mono text-[14px]">{x.v}</div>
          </Panel>
        ))}
      </div>
      <Panel className="overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr_1.6fr_0.8fr] gap-4 border-b border-black/[0.07] px-5 py-3">
          {["서버", "예약자", "GPU", "기간 · 용도", "상태"].map((h) => (
            <Label key={h}>{h}</Label>
          ))}
        </div>
        {reservations.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_1.4fr_0.7fr_1.6fr_0.8fr] items-center gap-4 border-b border-black/[0.05] px-5 py-3.5 last:border-0 transition-colors hover:bg-black/[0.04]"
          >
            <span className="font-mono text-[12px]">{r.server}</span>
            <span className="text-[13px]">{r.user}</span>
            <span className="font-mono text-[12px] text-[#5e5ce6]">{r.gpus}× V100</span>
            <div>
              <div className="font-mono text-[11px] text-[var(--color-ink-dim)]">
                {r.start} → {r.end}
              </div>
              <div className="text-[12px] text-[var(--color-ink-faint)]">{r.purpose}</div>
            </div>
            <Pill tone={tone[r.state]}>{lbl[r.state]}</Pill>
          </div>
        ))}
      </Panel>
    </div>
  )
}

/* ---------------- Processes & Containers ---------------- */
export function ProcessesView() {
  const em = useEmulator()
  const cTone = { running: "ok", restarting: "warn", exited: "off" } as const
  const typeTone: Record<string, string> = {
    python: "var(--color-accent)",
    docker: "#007aff",
    system: "var(--color-ink-faint)",
  }

  return (
    <div>
      <PageHead title="프로세스 · 컨테이너" desc="Top 자원 소비 프로세스 · Docker 컨테이너 관리 · 원격 제어" />
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Processes */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[14px] font-medium">Top Consumers</h3>
            <Label>CPU / RAM / VRAM</Label>
          </div>
          <div className="space-y-2">
            {processes.map((p) => {
              const pStatus = em.procStatuses.get(p.pid) ?? "running"
              const isDead = pStatus === "dead"
              const isKilling = pStatus === "killing"
              const isRestarting = pStatus === "restarting"
              return (
                <Panel
                  key={p.pid}
                  className={`flex items-center gap-4 p-4 transition-opacity ${isDead ? "opacity-40" : ""}`}
                >
                  <span
                    className="rounded-md px-2 py-0.5 font-mono text-[10px] uppercase"
                    style={{ color: typeTone[p.type], background: "rgba(0,0,0,0.05)" }}
                  >
                    {p.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-[12px] text-[var(--color-ink-dim)]">{p.cmd}</span>
                      {isKilling && (
                        <span className="shrink-0 font-mono text-[10px] text-[var(--color-err)]">· killing…</span>
                      )}
                      {isDead && (
                        <span className="shrink-0 font-mono text-[10px] text-[var(--color-err)]">· terminated</span>
                      )}
                      {isRestarting && (
                        <span className="shrink-0 font-mono text-[10px] text-[var(--color-warn)]">· restarting…</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
                      {p.server} · PID {p.pid} · {p.user}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    <span className="w-16 text-right text-[var(--color-ink-dim)]">CPU {p.cpu}%</span>
                    <span className="w-16 text-right text-[var(--color-ink-dim)]">{p.memGb}GB</span>
                    {p.vramMb > 0 && (
                      <span className="w-20 text-right text-[#5e5ce6]">{(p.vramMb / 1024).toFixed(1)}GB VRAM</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Restart */}
                    <button
                      disabled={isDead || isKilling || isRestarting}
                      onClick={() => em.restartProcess(p.pid, p.server, p.cmd)}
                      title="재시작"
                      className="rounded-lg border border-[var(--color-warn)]/30 p-1.5 text-[var(--color-warn)] transition-colors hover:bg-[var(--color-warn)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isRestarting ? <Loader size={13} className="animate-spin" /> : <RotateCw size={13} />}
                    </button>
                    {/* Kill */}
                    <button
                      disabled={isDead || isKilling || isRestarting}
                      onClick={() => em.killProcess(p.pid, p.server, p.cmd)}
                      title="SIGKILL"
                      className="rounded-lg border border-[var(--color-err)]/30 p-1.5 text-[var(--color-err)] transition-colors hover:bg-[var(--color-err)]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isKilling ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </Panel>
              )
            })}
          </div>
        </div>

        {/* Containers */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-[14px] font-medium">Docker Containers</h3>
          </div>
          <div className="space-y-2">
            {containers.map((c) => {
              const status = em.containerStatuses.get(c.name) ?? c.status
              const isRestarting = status === "restarting"
              const isExited = status === "exited"
              const isRunning = status === "running"
              return (
                <Panel key={c.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px]">{c.name}</span>
                    <Pill tone={cTone[status]}>{status}</Pill>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-[var(--color-ink-faint)]">{c.image}</div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                      {c.server} · {c.cpu}% · {(c.memMb / 1024).toFixed(1)}GB · up {c.uptime}
                    </span>
                    <div className="flex gap-1">
                      {/* Start */}
                      <button
                        disabled={isRunning || isRestarting}
                        onClick={() => em.containerAction(c.name, c.server, "start")}
                        title="시작"
                        className="rounded-md p-1 text-[var(--color-ink-dim)] hover:bg-black/[0.05] hover:text-[var(--color-ok)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play size={12} />
                      </button>
                      {/* Restart */}
                      <button
                        disabled={isRestarting}
                        onClick={() => em.containerAction(c.name, c.server, "restart")}
                        title="재시작"
                        className="rounded-md p-1 text-[var(--color-ink-dim)] hover:bg-black/[0.05] hover:text-[var(--color-warn)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {isRestarting ? <Loader size={12} className="animate-spin" /> : <RotateCw size={12} />}
                      </button>
                      {/* Stop */}
                      <button
                        disabled={isExited || isRestarting}
                        onClick={() => em.containerAction(c.name, c.server, "stop")}
                        title="정지"
                        className="rounded-md p-1 text-[var(--color-ink-dim)] hover:bg-black/[0.05] hover:text-[var(--color-err)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Square size={12} />
                      </button>
                    </div>
                  </div>
                </Panel>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Automation ---------------- */
function PlaybookOutput({ jobId }: { jobId: string }) {
  const em = useEmulator()
  const output = em.jobOutputs.get(jobId) ?? []
  const status = em.jobStatuses.get(jobId)
  const { scrollRef, onScroll } = useSmartScroll(output.length)

  const lineColor = (line: string) => {
    if (line.startsWith("changed:")) return "text-[#ffd60a]"
    if (line.startsWith("ok:")) return "text-[#30d158]"
    if (line.startsWith("failed:") || line.includes("unreachable=")) return "text-[#ff453a]"
    if (line.startsWith("PLAY") || line.startsWith("TASK") || line.startsWith("RUNNING")) return "text-[#58a6ff]"
    if (line.startsWith("PLAY RECAP")) return "text-[#c084fc]"
    return "text-[#8b949e]"
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="mt-3 max-h-[360px] overflow-y-auto rounded-[14px] p-4 scrollbar-hide"
      style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Terminal size={12} className="text-[#58a6ff]" />
        <span className="font-mono text-[10px] text-[#8b949e]">ansible-playbook output · job {jobId}</span>
        {status === "running" && (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-[#ffd60a]">
            <Loader size={10} className="animate-spin" /> running
          </span>
        )}
        {status === "success" && (
          <span className="ml-auto font-mono text-[10px] text-[#30d158]">✓ success</span>
        )}
      </div>
      <div className="space-y-0">
        {output.map((line, i) => (
          <div key={i} className={`font-mono text-[11px] leading-[1.55] whitespace-pre ${lineColor(line)}`}>
            {line || " "}
          </div>
        ))}
      </div>
    </div>
  )
}

const gpuEmpNodes = ["EMP-01", "EMP-02", "EMP-03", "EMP-04", "EMP-05",
  "EMP-06", "EMP-07", "EMP-08", "EMP-09", "EMP-10",
  "EMP-11", "EMP-12", "EMP-13", "EMP-14", "EMP-15"]

const allNodes = [...gpuEmpNodes, "GAME-01", "GAME-02", "API-01", "API-02",
  "DB-01", "DB-02", "REDIS-01", "CONTENT-01", "GIT-01",
  "CI-01", "BUILD-01", "MON-01", "ART-01", "BACKUP-01"]

const jobTargetNodes: Record<string, string[]> = {
  "J-31": gpuEmpNodes.map(n => n.toLowerCase()),
  "J-30": gpuEmpNodes.map(n => n.toLowerCase()),
  "J-29": allNodes.map(n => n.toLowerCase()),
  "J-28": allNodes.map(n => n.toLowerCase()),
  "J-27": gpuEmpNodes.map(n => n.toLowerCase()),
}

export function AutomationView() {
  const em = useEmulator()
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  const statusIcon = (jobId: string, base: string) => {
    const s = em.jobStatuses.get(jobId) ?? (base as "success" | "running" | "failed" | "scheduled")
    if (s === "running") return <Radio size={15} className="text-[var(--color-accent)] animate-pulse" />
    if (s === "success") return <CheckCircle2 size={15} className="text-[var(--color-ok)]" />
    if (s === "failed") return <XCircle size={15} className="text-[var(--color-err)]" />
    return <Clock size={15} className="text-[var(--color-ink-faint)]" />
  }

  const statusPill = (jobId: string, base: string) => {
    const s = em.jobStatuses.get(jobId) ?? base
    const tone = s === "success" ? "ok" : s === "failed" ? "err" : s === "running" ? "accent" : "muted"
    return <Pill tone={tone}>{s}</Pill>
  }

  const handleRun = (j: (typeof jobs)[0]) => {
    em.runPlaybook(j.id, j.name, j.targets, jobTargetNodes[j.id] ?? ["all-nodes"])
    setExpandedJob(j.id)
  }

  return (
    <div>
      <PageHead
        title="자동화 · 작업 배포"
        desc="Ansible Playbook · 일괄 패키지/드라이버 배포 · Cron 정기 점검"
        right={
          <button
            onClick={() => handleRun(jobs[0])}
            className="flex items-center gap-2 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/12 px-4 py-1.5 text-[12px] text-[var(--color-accent)] transition-all active:scale-95 hover:bg-[var(--color-accent)]/18"
          >
            <Play size={13} /> Playbook 실행
          </button>
        }
      />
      <div className="space-y-2">
        {jobs.map((j) => {
          const isExpanded = expandedJob === j.id
          const emStatus = em.jobStatuses.get(j.id)
          const isRunning = emStatus === "running"
          return (
            <div key={j.id}>
              <Panel hover className="flex items-center gap-4 p-4">
                {statusIcon(j.id, j.status)}
                <div className="flex-1">
                  <div className="text-[13px]">{j.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-[var(--color-ink-faint)]">
                    {j.id} · targets {j.targets} · {j.schedule}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-[var(--color-ink-dim)]">
                  {emStatus === "success" ? "just now" : `last ${j.lastRun}`}
                </span>
                {statusPill(j.id, j.status)}

                {/* Run button */}
                <button
                  disabled={isRunning}
                  onClick={() => handleRun(j)}
                  title="Playbook 실행"
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8 px-2.5 py-1.5 text-[11px] text-[var(--color-accent)] transition-all active:scale-95 hover:bg-[var(--color-accent)]/15 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRunning ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                </button>

                {/* Expand */}
                <button
                  onClick={() => setExpandedJob(isExpanded ? null : j.id)}
                  className="rounded-md p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </Panel>

              {isExpanded && em.jobOutputs.get(j.id) !== undefined && (
                <div className="mt-1">
                  <PlaybookOutput jobId={j.id} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Playbook preview */}
      <Panel className="mt-5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileCode2 size={14} className="text-[var(--color-ink-faint)]" />
          <Label>Playbook Preview · driver-update.yml</Label>
        </div>
        <pre className="overflow-auto rounded-[14px] border border-black/[0.05] bg-black/[0.03] p-4 text-[11px] leading-relaxed text-[var(--color-ink-dim)]">
          {`- hosts: emp_gpu_nodes         # EMP-01 … EMP-15
  become: true
  vars:
    driver_version: "550.90"
  tasks:
    - name: Purge existing NVIDIA driver
      apt: { name: "nvidia-*", state: absent, purge: yes }
      notify: daemon-reload

    - name: Install NVIDIA driver {{ driver_version }}
      apt: { name: "nvidia-driver-550", state: present }
      notify: daemon-reload

    - name: Reboot node and wait
      reboot: { reboot_timeout: 600, test_command: "nvidia-smi" }

    - name: Verify driver version
      command: nvidia-smi --query-gpu=driver_version --format=csv,noheader
      register: drv_ver
      failed_when: drv_ver.stdout.strip() != driver_version`}
        </pre>
      </Panel>
    </div>
  )
}

/* ---------------- Audit / RBAC ---------------- */
export function AuditView() {
  const roleTone: Record<string, string> = {
    Admin: "err",
    Developer: "accent",
    Employee: "ok",
    Service: "muted",
  }
  return (
    <div>
      <PageHead title="권한 제어 · 감사 로그" desc="RBAC 역할 기반 접근 제어 · 모든 제어 명령 이력 기록" />
      <div className="mb-5 grid grid-cols-3 gap-4">
        {[
          { r: "Administrator", d: "전체 권한 · IPMI 전원 · Playbook", n: "3명", t: "err" },
          { r: "Developer", d: "지정 서버 SSH/조회 · Docker 제어", n: "12명", t: "accent" },
          { r: "Employee", d: "예약 · 조회 전용", n: "24명", t: "ok" },
        ].map((x) => (
          <Panel key={x.r} className="p-4">
            <div className="flex items-center justify-between">
              <Pill tone={x.t}>{x.r}</Pill>
              <span className="font-mono text-[12px] text-[var(--color-ink-dim)]">{x.n}</span>
            </div>
            <p className="mt-2.5 text-[12px] text-[var(--color-ink-faint)]">{x.d}</p>
          </Panel>
        ))}
      </div>
      <Panel className="overflow-hidden">
        <div className="grid grid-cols-[1fr_1.2fr_2fr_1fr_1fr] gap-4 border-b border-black/[0.07] px-5 py-3">
          {["시각", "사용자 · 역할", "동작", "대상", "IP"].map((h) => (
            <Label key={h}>{h}</Label>
          ))}
        </div>
        {auditLog.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[1fr_1.2fr_2fr_1fr_1fr] items-center gap-4 border-b border-black/[0.05] px-5 py-3 last:border-0 font-mono text-[12px] transition-colors hover:bg-black/[0.04]"
          >
            <span className="text-[var(--color-ink-faint)]">{a.ts.slice(11)}</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-ink-dim)]">{a.user}</span>
              <Pill tone={roleTone[a.role]}>{a.role}</Pill>
            </div>
            <span className="text-[var(--color-ink)]">{a.action}</span>
            <span className="text-[var(--color-ink-dim)]">{a.target}</span>
            <span className="text-[var(--color-ink-faint)]">{a.ip}</span>
          </div>
        ))}
      </Panel>
    </div>
  )
}
