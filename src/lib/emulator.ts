import { useEffect, useReducer, useRef, useState } from "react"
import { servers } from "../data/fleet"
import type { Server, Status } from "../data/fleet"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogLine {
  id: number
  ts: string
  level: "info" | "warn" | "err"
  facility: string
  msg: string
}

export interface LiveServerState {
  status: Status
  cpuUtil: number
  cpuTempC: number
  cpuPowerW: number
  ramUsedGb: number
  netRxMbps: number
  netTxMbps: number
  uptimeDays: number
}

export type ContainerStatus = "running" | "restarting" | "exited"
export type ProcStatus = "running" | "killing" | "dead" | "restarting"
export type JobStatus = "idle" | "running" | "success" | "failed"
export type SvcStatus = "active" | "inactive" | "failed" | "activating" | "deactivating" | "reloading"

export interface ServiceEntry {
  name: string
  desc: string
  serverId: string
  role: string
  status: SvcStatus
  enabled: boolean
  pid: number
  memMb: number
  uptimeSec: number
}

export interface RemoteResult {
  phase: "pending" | "connecting" | "running" | "done" | "error"
  output: string[]
  exitCode?: number
  durationMs?: number
}

export interface RemoteJob {
  id: string
  command: string
  targets: string[]
  results: Map<string, RemoteResult>
  startedAt: number
}

// ─── Static data ──────────────────────────────────────────────────────────────

const BASE_SVCS: Array<{ name: string; desc: string; memMb: number }> = [
  { name: "sshd", desc: "OpenBSD Secure Shell server", memMb: 5 },
  { name: "cron", desc: "Regular background program processing", memMb: 2 },
  { name: "rsyslog", desc: "System Logging Service", memMb: 8 },
  { name: "systemd-journald", desc: "Journal Service", memMb: 18 },
  { name: "prometheus-node-exporter", desc: "Machine metrics exporter", memMb: 22 },
  { name: "docker", desc: "Docker Application Container Engine", memMb: 150 },
  { name: "containerd", desc: "Container runtime interface", memMb: 80 },
  { name: "fail2ban", desc: "SSH brute-force protection", memMb: 18 },
  { name: "auditd", desc: "Linux Audit daemon", memMb: 6 },
  { name: "smartd", desc: "S.M.A.R.T. disk monitoring daemon", memMb: 4 },
]

const ROLE_SVCS: Record<string, Array<{ name: string; desc: string; memMb: number }>> = {
  "AI/GPU": [
    { name: "nvidia-persistenced", desc: "NVIDIA Persistence Daemon", memMb: 8 },
    { name: "nvidia-dcgm", desc: "NVIDIA Data Center GPU Manager", memMb: 45 },
    { name: "nv-hostengine", desc: "NVML host engine", memMb: 30 },
  ],
  "Database": [
    { name: "postgresql@15-main", desc: "PostgreSQL RDBMS cluster 15-main", memMb: 512 },
    { name: "pgbouncer", desc: "PostgreSQL connection pooler", memMb: 25 },
    { name: "pg-backup", desc: "Scheduled PostgreSQL backup", memMb: 10 },
  ],
  "API": [
    { name: "nginx", desc: "High performance HTTP server", memMb: 45 },
    { name: "gunicorn", desc: "WSGI HTTP Server", memMb: 350 },
    { name: "celery-worker", desc: "Celery async task worker", memMb: 180 },
    { name: "celery-beat", desc: "Celery periodic task scheduler", memMb: 60 },
  ],
  "Redis": [
    { name: "redis-server", desc: "Advanced key-value store", memMb: 800 },
    { name: "redis-sentinel", desc: "Redis HA sentinel", memMb: 15 },
    { name: "redis-exporter", desc: "Redis Prometheus exporter", memMb: 20 },
  ],
  "Monitoring": [
    { name: "prometheus", desc: "Prometheus time-series DB", memMb: 350 },
    { name: "grafana-server", desc: "Grafana visualization server", memMb: 250 },
    { name: "alertmanager", desc: "Prometheus Alertmanager", memMb: 60 },
    { name: "loki", desc: "Grafana Loki log aggregation", memMb: 180 },
    { name: "promtail", desc: "Loki log agent", memMb: 35 },
  ],
  "Git": [
    { name: "gitlab", desc: "GitLab Puma web server", memMb: 1200 },
    { name: "gitaly", desc: "Git RPC service", memMb: 350 },
    { name: "gitlab-sidekiq", desc: "GitLab background jobs", memMb: 800 },
    { name: "gitlab-workhorse", desc: "GitLab HTTP accelerator", memMb: 60 },
  ],
  "CI/CD": [
    { name: "gitlab-runner", desc: "GitLab CI/CD runner", memMb: 180 },
    { name: "docker-registry", desc: "Docker Distribution Registry v2", memMb: 60 },
    { name: "buildkitd", desc: "BuildKit daemon", memMb: 120 },
  ],
  "Build": [
    { name: "gitlab-runner", desc: "GitLab CI/CD runner (build)", memMb: 220 },
    { name: "buildkitd", desc: "BuildKit daemon", memMb: 150 },
    { name: "gradle-daemon", desc: "Gradle JVM daemon", memMb: 600 },
  ],
  "Game": [
    { name: "gameserver@1", desc: "Game server instance 1", memMb: 4000 },
    { name: "gameserver@2", desc: "Game server instance 2", memMb: 3500 },
    { name: "nginx", desc: "WebSocket reverse proxy", memMb: 45 },
  ],
  "Content": [
    { name: "nginx", desc: "CDN edge server", memMb: 120 },
    { name: "varnish", desc: "Varnish HTTP cache", memMb: 512 },
    { name: "rsync", desc: "Origin sync daemon", memMb: 30 },
  ],
  "Artifact": [
    { name: "nexus", desc: "Sonatype Nexus Repository Manager", memMb: 1500 },
    { name: "nginx", desc: "Nexus HTTPS proxy", memMb: 45 },
  ],
  "Backup": [
    { name: "borgbackup", desc: "BorgBackup scheduler", memMb: 80 },
    { name: "borgmatic", desc: "Borgmatic backup automation", memMb: 40 },
    { name: "zfs-import-cache", desc: "ZFS pool auto-import", memMb: 30 },
    { name: "rsync", desc: "rsync daemon", memMb: 25 },
  ],
}

function buildServices(s: Server): ServiceEntry[] {
  const off = s.status === "off"
  const err = s.status === "err"
  const warn = s.status === "warn"
  const svcs = [...BASE_SVCS, ...(ROLE_SVCS[s.role] ?? [])]

  return svcs.map((t, i) => {
    let status: SvcStatus
    if (off) status = "inactive"
    else if (err && Math.random() < 0.35) status = "failed"
    else if (warn && Math.random() < 0.12) status = "failed"
    else status = "active"

    return {
      name: t.name,
      desc: t.desc,
      serverId: s.id,
      role: s.role,
      status,
      enabled: status !== "failed",
      pid: off || status === "failed" ? 0 : ri(200, 65000),
      memMb: off || status === "failed" ? 0 : t.memMb + ri(-5, 20),
      uptimeSec: off || status === "failed" ? 0 : s.uptimeDays * 86400 + ri(0, 3600) - i * ri(30, 120),
    }
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowTs() {
  return new Date().toISOString().slice(11, 23)
}
function ri(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min))
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}
function driftVal(v: number, spread: number, lo: number, hi: number) {
  return clamp(v + (Math.random() - 0.5) * spread, lo, hi)
}

// ─── Role-based log templates ─────────────────────────────────────────────────

function roleLogs(
  s: Server,
  state: LiveServerState,
): Array<{ level: LogLine["level"]; facility: string; msg: string }> {
  const ip = () => `10.10.${ri(30, 50)}.${ri(1, 250)}`
  const base: Array<{ level: LogLine["level"]; facility: string; msg: string }> = [
    { level: "info", facility: "kernel", msg: `EXT4-fs (md0): re-mounted opts: barrier=1,data=ordered` },
    { level: "info", facility: "kernel", msg: `net_ratelimit: ${ri(1, 120)} callbacks suppressed` },
    { level: "info", facility: "kernel", msg: `TCP: ${ri(1000, 50000)} segments received, ${ri(500, 20000)} sent` },
    { level: "info", facility: "systemd", msg: `systemd-journald: Rotating journal, adding new file` },
    { level: "info", facility: "ntpd", msg: `clock synchronized, stratum 2, offset ${((Math.random() - 0.5) * 0.002).toFixed(6)}s` },
    { level: "info", facility: "cron", msg: `(root) CMD (run-parts /etc/cron.${ri(0, 1) ? "hourly" : "daily"})` },
    { level: "info", facility: "auditd", msg: `type=SYSCALL auid=${ri(1000, 2000)} uid=0 gid=0 res=success` },
    { level: "info", facility: "kernel", msg: `SCSI: device state to RUNNING for target 0:0:${ri(0, 3)}:0` },
    { level: "info", facility: "smartd", msg: `Device: /dev/nvme0n1 [NVMe], SMART Usage Attribute: ${ri(88, 100)}%` },
    { level: "info", facility: "fail2ban", msg: `Ban ${ip()} after ${ri(5, 20)} failed attempts` },
  ]

  const byRole: Record<string, Array<{ level: LogLine["level"]; facility: string; msg: string }>> = {
    "AI/GPU": [
      { level: "info", facility: "nvidia-smi", msg: `GPU0 | Util ${state.cpuUtil}% | ${state.cpuTempC}°C | ${ri(120, 248)}W | ${ri(20000, 31800)} MiB / 32768 MiB` },
      { level: "info", facility: "pynvml", msg: `[Engine] inference ${ri(10, 95)} tok/s · queue depth ${ri(0, 12)} · batch ${ri(1, 8)}` },
      { level: "info", facility: "vllm", msg: `Scheduled ${ri(1, 8)} requests · avg latency ${ri(20, 180)}ms · P95 ${ri(100, 500)}ms` },
      { level: "info", facility: "dockerd", msg: `container llm-inference-gw: HEALTHCHECK passed (${ri(5, 30)}ms)` },
      { level: "info", facility: "kernel", msg: `nvidia: XID heartbeat GPU0 — OK` },
      { level: state.cpuTempC > 80 ? "warn" : "info", facility: "nvidia", msg: `GPU0 ${state.cpuTempC}°C ${state.cpuTempC > 80 ? "— approaching throttle (84°C threshold)" : "— nominal operating range"}` },
      { level: "info", facility: "nvlink", msg: `NVLink bandwidth: ${ri(100, 300)} GB/s bidirectional` },
      { level: "info", facility: "cuda", msg: `CUDA context ${ri(10000, 65000)} active, ${ri(1, 8)} streams` },
      { level: "info", facility: "dcgm", msg: `GPU0 health check: ALL_CLEAR — PCIe bandwidth ${ri(10, 16)} GB/s` },
    ],
    "Database": [
      { level: "info", facility: "postgres", msg: `checkpoint starting: time — bgwriter` },
      { level: "info", facility: "postgres", msg: `checkpoint: wrote ${ri(100, 900)} buffers (${ri(0, 5)}.${ri(0, 9)}%); dist=${ri(1000, 20000)} kB, elapsed=${ri(1, 20)}.${ri(0, 9)}s` },
      { level: "info", facility: "postgres", msg: `autovacuum VACUUM ANALYZE public.sessions: ${ri(100, 5000)} dead rows removed` },
      { level: "info", facility: "postgres", msg: `connection from ${ip()}:${ri(40000, 65000)} — user: app_ro` },
      { level: "info", facility: "postgres", msg: `duration: ${ri(1, 250)}.${ri(0, 9)}ms  SELECT * FROM sessions WHERE ...` },
      { level: "info", facility: "pgbouncer", msg: `Stats: ${ri(100, 500)} queries/s, pool ${ri(20, 80)} / 200 conn active` },
      { level: "info", facility: "postgres", msg: `WAL writer flushed ${ri(1, 100)} records, sync ${ri(1, 20)}ms` },
      { level: "info", facility: "postgres", msg: `logical replication slot "replica1": confirmed_flush_lsn ${ri(0, 999)}.${ri(0, 999)}` },
    ],
    "API": [
      { level: "info", facility: "nginx", msg: `${ip()} "GET /api/v1/health HTTP/2.0" 200 ${ri(80, 300)} ${ri(1, 20)}ms` },
      { level: "info", facility: "nginx", msg: `${ip()} "POST /api/v1/inference HTTP/2.0" 200 ${ri(1000, 5000)} ${ri(50, 500)}ms` },
      { level: "info", facility: "gunicorn", msg: `Worker ${ri(10000, 65000)} handled in ${ri(5, 200)}ms [200 OK]` },
      { level: "info", facility: "celery", msg: `Task infer_request[${ri(1000, 9999)}] succeeded in ${ri(50, 800)}ms` },
      { level: "info", facility: "uvicorn", msg: `${ip()} - "GET /metrics HTTP/1.1" 200 OK` },
    ],
    "Redis": [
      { level: "info", facility: "redis", msg: `${ri(100, 5000)} clients | ${state.ramUsedGb.toFixed(1)} GB used | ${ri(1000, 50000)} keys | ${ri(100, 5000)} ops/s` },
      { level: "info", facility: "redis", msg: `Background RDB save started by signal` },
      { level: "info", facility: "redis", msg: `RDB: ${ri(100000, 9000000)} keys saved in ${(0.5 + Math.random() * 2).toFixed(2)}s` },
      { level: "info", facility: "redis", msg: `MASTER <-> REPLICA sync: replica ${ip()} — OK` },
      { level: "info", facility: "redis", msg: `Accepted ${ip()}:${ri(40000, 65000)} (fd ${ri(10, 500)})` },
      { level: "info", facility: "redis", msg: `Slave ${ip()}:6380 asks for synchronization` },
    ],
    "Game": [
      { level: "info", facility: "gameserver", msg: `${ri(50, 2000)} CCU, ${ri(10, 200)} rooms, ${ri(0, 30)} matchmaking queue, ${ri(5, 30)}ms avg ping` },
      { level: "info", facility: "gameserver", msg: `Room ${ri(1000, 9999)} created: mode=battle_royale, players=${ri(30, 100)}` },
      { level: "info", facility: "nginx", msg: `WS: ${ri(50, 2000)} conns | ${ri(100, 5000)} msg/s | ${ri(1, 50)}ms avg RTT` },
      { level: "info", facility: "gameserver", msg: `Match ${ri(100000, 999999)} complete: winner player_${ri(100, 9999)} (${ri(3, 8)} kills)` },
      { level: "info", facility: "gameserver", msg: `Anti-cheat: ${ri(0, 3)} flags raised, auto-ban triggered for uid_${ri(100, 9999)}` },
    ],
    "CI/CD": [
      { level: "info", facility: "gitlab-runner", msg: `Runner #${ri(1, 10)} picked up job #${ri(10000, 99999)}: build:${ri(1, 5)}` },
      { level: "info", facility: "docker", msg: `Pulling layer sha256:${ri(10000, 99999).toString(16)} for pytorch/pytorch:2.4-cuda12` },
      { level: "info", facility: "gitlab-runner", msg: `Job #${ri(10000, 99999)} completed: success (${ri(60, 600)}s)` },
      { level: "info", facility: "registry", msg: `Pushed internal/api-gw:${ri(1, 3)}.${ri(0, 9)}.${ri(0, 9)} (${ri(100, 900)}MB)` },
    ],
    "Build": [
      { level: "info", facility: "gradle", msg: `Task :app:compileJava ${ri(50, 99)}% complete (${ri(10, 300)}s)` },
      { level: "info", facility: "docker", msg: `Step ${ri(1, 30)}/${ri(30, 60)}: RUN pip install --no-cache-dir -r requirements.txt` },
      { level: "info", facility: "bazel", msg: `[${ri(100, 5000)} / ${ri(5000, 10000)}] Compiling src/...` },
    ],
    "Monitoring": [
      { level: "info", facility: "prometheus", msg: `Scrape ${ri(20, 35)} targets in ${(0.05 + Math.random() * 0.5).toFixed(3)}s` },
      { level: "info", facility: "alertmanager", msg: `Evaluated ${ri(0, 5)} alert rules, ${ri(0, 2)} firing` },
      { level: "info", facility: "grafana", msg: `Dashboard "Fleet Overview" rendered in ${ri(30, 200)}ms` },
      { level: "info", facility: "loki", msg: `Ingested ${ri(1000, 50000)} log lines/s from ${ri(20, 40)} streams` },
    ],
    "Git": [
      { level: "info", facility: "gitaly", msg: `RPC /gitaly.RepositoryService/CreateRepository duration=${ri(5, 200)}ms` },
      { level: "info", facility: "gitlab", msg: `Push: project/repo-${ri(1, 500)} — ${ri(1, 5)} commits by user_${ri(1, 40)}` },
      { level: "info", facility: "sidekiq", msg: `Processed ${ri(10, 200)} jobs, queue: ${ri(0, 50)}` },
    ],
    "Artifact": [
      { level: "info", facility: "nexus", msg: `Proxy fetch: pytorch-${ri(1, 3)}.${ri(0, 9)}.0-cp311-linux_x86_64.whl (${ri(10, 900)}MB)` },
      { level: "info", facility: "nexus", msg: `Cleanup: removed ${ri(1, 50)} stale artifacts (${ri(1, 50)}GB freed)` },
    ],
    "Backup": [
      { level: "info", facility: "rsync", msg: `Backup ${ri(1, 99)}% — ${ri(100, 5000)} GB transferred @ ${ri(50, 500)} MB/s` },
      { level: "info", facility: "zfs", msg: `zpool status: ONLINE — vdevs healthy, ${ri(1, 30)} TB used` },
      { level: "info", facility: "borgbackup", msg: `Archive emp-cluster-${new Date().toISOString().slice(0, 10)}: ${ri(50, 200)} GB new data` },
    ],
    "Content": [
      { level: "info", facility: "nginx", msg: `${ip()} "GET /cdn/weights/llama-3-8b-${ri(1, 99).toString(16)}.safetensors" 206 ${ri(100, 900)}MB` },
      { level: "info", facility: "varnish", msg: `Cache hit ratio: ${ri(80, 99)}% — ${ri(100, 1000)} req/s` },
    ],
  }

  return [...base, ...(byRole[s.role] ?? [])]
}

// ─── Remote command output generator ─────────────────────────────────────────

export function generateRemoteOutput(cmd: string, s: Server): string[] {
  const bin = cmd.trim().split(/\s+/)[0]
  const hostname = s.hostname.split(".")[0]

  if (bin === "df" || cmd === "df -h") {
    return [
      "Filesystem      Size  Used Avail Use% Mounted on",
      `/dev/md0        ${s.storage.label.includes("3.84") ? "3.6T" : "1.8T"}  ${ri(200, 600)}G  ${ri(800, 1400)}G  ${ri(15, 45)}% /`,
      "tmpfs            16G  1.2G   15G   8% /dev/shm",
      `/dev/nvme0n1p1  511M   12M  499M   3% /boot/efi`,
    ]
  }
  if (bin === "free" || cmd === "free -h") {
    const used = s.ramUsedGb.toFixed(1)
    const free = (s.ramTotalGb - s.ramUsedGb).toFixed(1)
    return [
      "              total  used  free  shared  buff/cache  available",
      `Mem:          ${s.ramTotalGb}G  ${used}G  ${free}G      0B        4.2G     ${free}G`,
      `Swap:             0B    0B    0B`,
    ]
  }
  if (bin === "uptime") {
    return [`${new Date().toTimeString().slice(0, 8)} up ${s.uptimeDays} days, ${ri(0, 23)}:${ri(10, 59)}, 2 users, load average: ${(s.cpuUtil / 25).toFixed(2)}, ${(s.cpuUtil / 28).toFixed(2)}, ${(s.cpuUtil / 30).toFixed(2)}`]
  }
  if (bin === "uname") return [`Linux ${hostname} 5.15.0-116-generic #126-Ubuntu SMP x86_64`]
  if (bin === "hostname") return [hostname]
  if (cmd.includes("nvidia-smi")) {
    if (s.gpus.length === 0) return ["NVIDIA-SMI has failed: no compatible GPU"]
    return s.gpus.map(g => `GPU ${g.index}: ${g.tempC}°C | ${g.util}% util | ${ri(120, 248)}W | ${Math.round(g.vramUsedMb / 1024)}/${Math.round(g.vramTotalMb / 1024)}GB`)
  }
  if (cmd.includes("ps aux") || cmd.includes("ps -aux")) {
    return [
      `USER       PID %CPU %MEM COMMAND`,
      `root         1  0.0  0.0 /sbin/init`,
      `root       ${ri(800, 1200)}  0.3  0.2 /usr/bin/dockerd`,
      ...(s.gpus.length > 0 ? [`root  ${ri(10000, 65000)} ${s.cpuUtil}.2 ${ri(5, 35)}.1 python3 -m vllm`] : []),
      `root  ${ri(10000, 65000)}  0.0  0.0 sshd: root@pts/${ri(0, 5)}`,
    ]
  }
  if (cmd.includes("systemctl list-units --failed")) {
    const failed = s.status === "err" ? [`● nvidia-dcgm.service   failed  failed  NVIDIA DCGM Manager`] : []
    return failed.length > 0 ? ["UNIT                  LOAD   ACTIVE SUB    DESCRIPTION", ...failed] : ["0 loaded units listed."]
  }
  if (cmd.includes("journalctl") || cmd.includes("dmesg")) {
    const logs = emulator.serverLogs.get(s.id) ?? []
    return logs.slice(-5).map(l => `${l.ts.slice(0, 8)} ${hostname} ${l.facility}: ${l.msg}`)
  }
  if (cmd.includes("ip a") || cmd.includes("ifconfig")) {
    return [`bond0: inet ${s.dataIp}/24  RX: ${s.netRxMbps.toFixed(0)} Mbps  TX: ${s.netTxMbps.toFixed(0)} Mbps`]
  }
  if (cmd.includes("cat /etc/os-release") || cmd.includes("lsb_release")) {
    return [`PRETTY_NAME="${s.os}"`, `VERSION_CODENAME=${s.os.includes("24") ? "noble" : "jammy"}`]
  }
  if (cmd.includes("docker ps")) {
    return [
      `CONTAINER ID   IMAGE                         STATUS    NAMES`,
      `a${ri(100000, 999999).toString(16).padEnd(11, "0")}   ${s.role === "AI/GPU" ? "vllm/vllm-openai:v0.6.3" : "internal/svc:latest"}      Up ${ri(1, 48)}h  ${s.role.toLowerCase()}-svc`,
      `b${ri(100000, 999999).toString(16).padEnd(11, "0")}   prom/node-exporter:v1.8       Up ${s.uptimeDays}d  node-exporter`,
    ]
  }
  if (cmd === "whoami" || cmd === "id") return ["root"]
  if (cmd.startsWith("echo")) return [cmd.slice(5)]
  if (cmd === "date") return [new Date().toString()]
  // Generic
  return [`[${hostname}] command executed — exit 0`]
}

// ─── Store ────────────────────────────────────────────────────────────────────

class EmulatorStore {
  readonly serverStates = new Map<string, LiveServerState>()
  readonly serverLogs = new Map<string, LogLine[]>()
  readonly containerStatuses = new Map<string, ContainerStatus>()
  readonly procStatuses = new Map<number, ProcStatus>()
  readonly jobStatuses = new Map<string, JobStatus>()
  readonly jobOutputs = new Map<string, string[]>()
  readonly serviceStatuses = new Map<string, SvcStatus>() // key: `${serverId}::${name}`
  readonly serviceMemory = new Map<string, number>()       // live MB
  readonly remoteJobs = new Map<string, RemoteJob>()

  private _services: ServiceEntry[] = []
  private listeners = new Set<() => void>()
  private logId = 0
  private ticker: ReturnType<typeof setInterval> | null = null

  constructor() {
    for (const s of servers) {
      const st: LiveServerState = {
        status: s.status,
        cpuUtil: s.cpuUtil,
        cpuTempC: s.cpuTempC,
        cpuPowerW: s.cpuPowerW,
        ramUsedGb: s.ramUsedGb,
        netRxMbps: s.netRxMbps,
        netTxMbps: s.netTxMbps,
        uptimeDays: s.uptimeDays,
      }
      this.serverStates.set(s.id, st)

      // Seed historical logs
      if (s.status !== "off") {
        const tpls = roleLogs(s, st)
        const logs: LogLine[] = []
        for (let i = 50; i > 0; i--) {
          const ago = Date.now() - i * 38000
          const ts = new Date(ago).toISOString().slice(11, 23)
          const t = tpls[Math.floor(Math.random() * tpls.length)]
          logs.push({ id: ++this.logId, ts, ...t })
        }
        this.serverLogs.set(s.id, logs)
      } else {
        this.serverLogs.set(s.id, [])
      }

      // Init services
      const svcs = buildServices(s)
      for (const svc of svcs) {
        const key = `${s.id}::${svc.name}`
        this.serviceStatuses.set(key, svc.status)
        this.serviceMemory.set(key, svc.memMb)
      }
      this._services.push(...svcs)
    }
    this.startTicker()
  }

  getServices(serverId?: string): ServiceEntry[] {
    return this._services
      .filter((s) => !serverId || s.serverId === serverId)
      .map((s) => ({
        ...s,
        status: this.serviceStatuses.get(`${s.serverId}::${s.name}`) ?? s.status,
        memMb: this.serviceMemory.get(`${s.serverId}::${s.name}`) ?? s.memMb,
      }))
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }

  private emit() {
    for (const cb of this.listeners) cb()
  }

  private addLog(serverId: string, level: LogLine["level"], facility: string, msg: string) {
    const line: LogLine = { id: ++this.logId, ts: nowTs(), level, facility, msg }
    const prev = this.serverLogs.get(serverId) ?? []
    this.serverLogs.set(serverId, [...prev.slice(-499), line])
  }

  private startTicker() {
    this.ticker = setInterval(() => {
      for (const s of servers) {
        const state = this.serverStates.get(s.id)
        if (!state || state.status === "off") continue

        if (Math.random() < 0.45) {
          const tpls = roleLogs(s, state)
          const t = tpls[Math.floor(Math.random() * tpls.length)]
          this.addLog(s.id, t.level, t.facility, t.msg)
        }

        const newUtil = clamp(driftVal(state.cpuUtil, 4, 0, 100), 0, 100)
        this.serverStates.set(s.id, {
          ...state,
          cpuUtil: newUtil,
          cpuTempC: clamp(driftVal(state.cpuTempC, 1.5, 20, 95), 20, 95),
          cpuPowerW: Math.round((newUtil / 100) * s.cpuTdp),
          ramUsedGb: clamp(driftVal(state.ramUsedGb, s.ramTotalGb * 0.015, 0, s.ramTotalGb), 0, s.ramTotalGb),
          netRxMbps: clamp(driftVal(state.netRxMbps, 250, 0, 10000), 0, 10000),
          netTxMbps: clamp(driftVal(state.netTxMbps, 250, 0, 10000), 0, 10000),
        })

        // Drift service memory
        for (const svc of this._services.filter(x => x.serverId === s.id)) {
          const key = `${s.id}::${svc.name}`
          if (this.serviceStatuses.get(key) === "active") {
            const cur = this.serviceMemory.get(key) ?? svc.memMb
            this.serviceMemory.set(key, clamp(driftVal(cur, svc.memMb * 0.03, svc.memMb * 0.5, svc.memMb * 2.5), 0, 32768))
          }
        }
      }
      this.emit()
    }, 2000)
  }

  // ─── Power ──────────────────────────────────────────────────────────────────

  powerOff(serverId: string) {
    const state = this.serverStates.get(serverId)
    if (!state || state.status === "off") return
    const s = servers.find(x => x.id === serverId)!

    this.addLog(serverId, "warn", "IPMI", "Chassis Control: Power Off — operator: admin@corp (10.0.0.14)")
    this.addLog(serverId, "info", "kernel", "broadcast: the system is going down for power off NOW!")
    this.emit()

    const seq: [number, LogLine["level"], string, string][] = [
      [800, "info", "systemd", `Stopping ${ROLE_SVCS[s.role]?.[0]?.name ?? "main"}.service…`],
      [1500, "info", "systemd", "Stopping Docker Application Container Engine…"],
      [2200, "info", "dockerd", `Sending SIGTERM to all containers`],
      [2900, "info", "systemd", `Stopped Docker Application Container Engine. (${ri(800, 1500)}ms)`],
      [3400, "info", "systemd", "Stopping NVIDIA Persistence Daemon…"],
      [3900, "info", "systemd", "Unmounting /var/lib/docker/overlay2…"],
      [4500, "info", "kernel", "ACPI: Preparing to enter system sleep state S5"],
      [5100, "info", "kernel", "reboot: Power down"],
    ]
    for (const [d, l, f, m] of seq)
      setTimeout(() => { this.addLog(serverId, l, f, m); this.emit() }, d as number)

    setTimeout(() => {
      this.serverStates.set(serverId, { ...state, status: "off", cpuUtil: 0, cpuTempC: 24, cpuPowerW: 0, ramUsedGb: 0, netRxMbps: 0, netTxMbps: 0 })
      for (const svc of this._services.filter(x => x.serverId === serverId))
        this.serviceStatuses.set(`${serverId}::${svc.name}`, "inactive")
      this.emit()
    }, 5800)
  }

  powerOn(serverId: string) {
    const s = servers.find(x => x.id === serverId)!
    const state = this.serverStates.get(serverId)
    if (!state || state.status !== "off") return

    this.addLog(serverId, "info", "IPMI", "Chassis Control: Power On — operator: admin@corp (10.0.0.14)")
    this.serverStates.set(serverId, { ...state, status: "ok", cpuUtil: 0 })
    this.emit()
    this._bootSequence(serverId, s, 0)
  }

  private _bootSequence(serverId: string, s: Server, offset: number) {
    // POST phase
    const postSeq: [number, LogLine["level"], string, string][] = [
      [offset + 300, "info", "BIOS", "ASPEED AST2500 BMC: chassis power-on event"],
      [offset + 600, "info", "BIOS", "UEFI v3.4a: POST started — running memory training"],
      [offset + 1400, "info", "BIOS", `DRAM training complete: ${s.ramTotalGb}GB DDR4-3200 ECC RDIMM — all DIMMs OK`],
      [offset + 2000, "info", "BIOS", "PCIe: enumerating devices on root complex"],
      [offset + 2600, "info", "BIOS", s.gpus.length > 0 ? "PCIe: GPU0 NVIDIA Tesla V100-PCIE-32GB @ x16 Gen3" : "PCIe: Samsung PM9A3 NVMe @ x4 Gen4"],
      [offset + 3100, "info", "BIOS", s.gpus.length > 1 ? "PCIe: GPU1 NVIDIA Tesla V100-PCIE-32GB @ x16 Gen3" : "PCIe: Mellanox 10GbE SFP+ NIC"],
      [offset + 3600, "info", "BIOS", `NVMe 0: ${s.storage.label} — SMART health OK`],
      [offset + 4200, "info", "BIOS", "IPMI 2.0 initialized, BMC SOL console available"],
      [offset + 4800, "info", "GRUB", "GRUB 2.06: loading Linux 5.15.0-116-generic…"],
      [offset + 5600, "info", "GRUB", "Kernel image decompressed, jumping to entry point"],
    ]

    // Kernel phase
    const kernelSeq: [number, LogLine["level"], string, string][] = [
      [offset + 6200, "info", "kernel", `Linux version 5.15.0-116-generic (buildd@lcy02-amd64-001)`],
      [offset + 6700, "info", "kernel", `BIOS-provided physical RAM map: ${s.ramTotalGb * 1024}MB system RAM`],
      [offset + 7200, "info", "kernel", `SMP: Bringing up ${s.threads} CPUs (EPYC NUMA topology)… done`],
      [offset + 7700, "info", "kernel", "PCI: Using configuration type 1 for base access"],
      [offset + 8200, "info", "kernel", `nvme nvme0: ${s.storage.label} attached (1 namespace)`],
      [offset + 8700, "info", "kernel", `md/raid1:md0: active raid1 sdb1[0] sda1[1]`],
      [offset + 9200, "info", "kernel", `EXT4-fs (md0): mounted filesystem with ordered data mode`],
      ...(s.gpus.length > 0 ? [
        [offset + 9700, "info", "nvidia", "NVRM: NVIDIA UNIX x86_64 Kernel Module 550.90.07"] as [number, LogLine["level"], string, string],
        [offset + 10200, "info", "nvidia", "NVRM: GPU 0000:03:00.0 — GV100GL [Tesla V100-PCIE-32GB]"] as [number, LogLine["level"], string, string],
        ...(s.gpus.length > 1 ? [[offset + 10700, "info", "nvidia", "NVRM: GPU 0000:04:00.0 — GV100GL [Tesla V100-PCIE-32GB]"] as [number, LogLine["level"], string, string]] : []),
      ] : []),
      [offset + 11200, "info", "kernel", "Freeing unused kernel image memory: 2856K"],
      [offset + 11700, "info", "kernel", "Write protecting the kernel read-only data: 28672K"],
      [offset + 12000, "info", "kernel", "Switched to clocksource tsc-early"],
    ]

    // systemd phase
    const systemdSeq: [number, LogLine["level"], string, string][] = [
      [offset + 12500, "info", "systemd", "systemd 249.11-0ubuntu3.12 running in system mode (+PAM +AUDIT)"],
      [offset + 13000, "info", "systemd", "Detected architecture x86-64"],
      [offset + 13500, "info", "systemd", "Set hostname to <" + s.hostname + ">"],
      [offset + 14000, "info", "udev", "Starting version 249"],
      [offset + 14500, "info", "systemd", "Started udev Kernel Device Manager"],
      [offset + 15000, "info", "networkd", `bond0: enslaving eth0 (Mellanox 10GbE)`],
      [offset + 15500, "info", "networkd", `bond0: enslaving eth1 (Mellanox 10GbE)`],
      [offset + 16000, "info", "networkd", `bond0: acquired address ${s.dataIp}/24, gateway 10.10.${s.dataIp.split(".")[2]}.1`],
      [offset + 16500, "info", "ntpd", "Time synchronized from pool.ntp.org (offset 0.002ms)"],
      [offset + 17000, "info", "systemd", "Started Docker Application Container Engine v26.1.3"],
      [offset + 17500, "info", "dockerd", `Daemon has completed initialization, storage-driver=overlay2`],
      [offset + 18000, "info", "systemd", "Starting containerd container runtime…"],
      ...(s.gpus.length > 0 ? [
        [offset + 18500, "info", "systemd", "Starting NVIDIA Persistence Daemon…"] as [number, LogLine["level"], string, string],
        [offset + 19000, "info", "nvidia", `persistenced: Persistence mode enabled for GPU 0000:03:00.0`] as [number, LogLine["level"], string, string],
        [offset + 19500, "info", "dcgm", `DCGM host engine started, monitoring ${s.gpus.length} GPU(s)`] as [number, LogLine["level"], string, string],
      ] : []),
      [offset + 20000, "info", "systemd", "Started Prometheus Node Exporter"],
      [offset + 20500, "info", "systemd", "Started fail2ban: Jail set for sshd"],
      [offset + 21000, "info", "sshd", `Server listening on 0.0.0.0 port 22`],
      [offset + 21500, "info", "sshd", `Server listening on :: port 22`],
      [offset + 22000, "info", "systemd", `Startup finished in 7.${ri(1, 9)}s (kernel) + ${ri(14, 19)}.${ri(1, 9)}s (userspace) = ${ri(22, 27)}.${ri(1, 9)}s`],
    ]

    const allSeq = [...postSeq, ...kernelSeq, ...systemdSeq]
    const totalDuration = offset + 23000

    for (const [delay, level, facility, msg] of allSeq) {
      setTimeout(() => {
        const pct = Math.max(0, ((delay as number) - offset) / 22000)
        const cur = this.serverStates.get(serverId)
        if (cur && cur.status === "ok") {
          this.serverStates.set(serverId, {
            ...cur,
            cpuUtil: Math.round(pct * s.cpuUtil * 0.4),
            cpuTempC: Math.round(24 + pct * (s.cpuTempC - 24) * 0.55),
            ramUsedGb: Number((pct * s.ramUsedGb * 0.45).toFixed(1)),
          })
        }
        this.addLog(serverId, level as LogLine["level"], facility as string, msg as string)
        this.emit()
      }, delay as number)
    }

    // System fully ready
    setTimeout(() => {
      this.serverStates.set(serverId, {
        status: "ok",
        cpuUtil: s.cpuUtil,
        cpuTempC: s.cpuTempC,
        cpuPowerW: s.cpuPowerW,
        ramUsedGb: s.ramUsedGb,
        netRxMbps: s.netRxMbps,
        netTxMbps: s.netTxMbps,
        uptimeDays: 0,
      })
      for (const svc of this._services.filter(x => x.serverId === serverId))
        this.serviceStatuses.set(`${serverId}::${svc.name}`, "active")
      this.emit()
    }, totalDuration)
  }

  reboot(serverId: string) {
    const state = this.serverStates.get(serverId)
    if (!state || state.status === "off") return
    const s = servers.find(x => x.id === serverId)!

    // === SHUTDOWN PHASE ===
    this.addLog(serverId, "warn", "IPMI", "Chassis Control: Power Reset — operator: admin@corp (10.0.0.14)")
    this.addLog(serverId, "warn", "systemd", "Reboot: Initiated via IPMI remote management")
    this.emit()

    const shutdownSeq: [number, LogLine["level"], string, string][] = [
      [700, "info", "systemd", "Stopping target Multi-User System (pre-shutdown)"],
      [1300, "info", "systemd", `Stopping ${ROLE_SVCS[s.role]?.[0]?.name ?? "application"}.service…`],
      [1900, "info", "systemd", "Stopping Docker Application Container Engine…"],
      [2500, "info", "dockerd", "Gracefully stopping all containers (SIGTERM, 10s timeout)"],
      [3100, "info", "systemd", `Stopped Docker Application Container Engine (${ri(1200, 2400)}ms)`],
      [3600, "info", "systemd", "Stopping NVIDIA Persistence Daemon…"],
      [4100, "info", "networkd", "Removing address from bond0"],
      [4600, "info", "systemd", "Unmounting /var/lib/docker/overlay2…"],
      [5000, "info", "systemd", "Reached target System Power Off"],
      [5500, "info", "kernel", "ACPI: Preparing to enter system sleep state S5 (Power Off)"],
      [5900, "info", "kernel", "reboot: Power down"],
    ]
    for (const [d, l, f, m] of shutdownSeq)
      setTimeout(() => { this.addLog(serverId, l, f, m); this.emit() }, d as number)

    // Goes offline at T+6.5s
    setTimeout(() => {
      this.serverStates.set(serverId, { ...state, status: "off", cpuUtil: 0, cpuTempC: 24, cpuPowerW: 0, ramUsedGb: 0, netRxMbps: 0, netTxMbps: 0 })
      for (const svc of this._services.filter(x => x.serverId === serverId))
        this.serviceStatuses.set(`${serverId}::${svc.name}`, "inactive")
      this.emit()
    }, 6500)

    // Mark online again at T+8.5s (power applied), then run boot sequence
    setTimeout(() => {
      this.serverStates.set(serverId, { ...state, status: "ok", cpuUtil: 0, cpuTempC: 24, ramUsedGb: 0, netRxMbps: 0, netTxMbps: 0, uptimeDays: 0 })
      this.emit()
      this._bootSequence(serverId, s, 0)
    }, 8500)
  }

  // ─── Processes ──────────────────────────────────────────────────────────────

  killProcess(pid: number, serverId: string, cmd: string) {
    if (this.procStatuses.get(pid) === "dead") return
    this.procStatuses.set(pid, "killing")
    this.addLog(serverId, "warn", "kernel", `sending SIGKILL to "${cmd.split(" ")[0]}" (PID ${pid}, uid=0)`)
    this.emit()
    setTimeout(() => {
      this.procStatuses.set(pid, "dead")
      this.addLog(serverId, "info", "kernel", `PID ${pid} exited — code=killed signal=KILL status=137`)
      this.addLog(serverId, "warn", "systemd", `Main process exited, code=killed status=KILL`)
      const st = this.serverStates.get(serverId)
      if (st)
        this.serverStates.set(serverId, { ...st, cpuUtil: clamp(st.cpuUtil - ri(15, 28), 3, 100), ramUsedGb: clamp(st.ramUsedGb - ri(3, 10), 1, st.ramUsedGb) })
      this.emit()
    }, 1100)
  }

  restartProcess(pid: number, serverId: string, cmd: string) {
    this.procStatuses.set(pid, "restarting")
    this.addLog(serverId, "info", "systemd", `Restarting "${cmd.split(" ")[0]}" (RestartSec=5s)`)
    this.emit()
    setTimeout(() => {
      const newPid = ri(10000, 65000)
      this.procStatuses.set(pid, "running")
      this.addLog(serverId, "info", "systemd", `Service started (new PID=${newPid}), main process`)
      this.emit()
    }, 3200)
  }

  // ─── Containers ─────────────────────────────────────────────────────────────

  containerAction(name: string, serverId: string, action: "start" | "stop" | "restart") {
    if (action === "stop") {
      this.containerStatuses.set(name, "exited")
      this.addLog(serverId, "info", "dockerd", `container ${name}: sending SIGTERM (graceful stop, 10s timeout)`)
      this.emit()
      setTimeout(() => { this.addLog(serverId, "info", "dockerd", `container ${name}: exited (0) after 1.3s`); this.emit() }, 1500)
    } else if (action === "start") {
      this.containerStatuses.set(name, "running")
      this.addLog(serverId, "info", "dockerd", `container ${name}: pulling latest image layers…`)
      this.emit()
      setTimeout(() => { this.addLog(serverId, "info", "dockerd", `container ${name}: started, HEALTHCHECK passed`); this.emit() }, 2500)
    } else {
      this.containerStatuses.set(name, "restarting")
      this.addLog(serverId, "warn", "dockerd", `container ${name}: restart requested (RestartPolicy=on-failure:3)`)
      this.emit()
      setTimeout(() => {
        this.containerStatuses.set(name, "running")
        this.addLog(serverId, "info", "dockerd", `container ${name}: restarted, HEALTHCHECK passed in ${ri(2, 8)}s`)
        this.emit()
      }, 3500)
    }
  }

  // ─── Services ───────────────────────────────────────────────────────────────

  serviceAction(serverId: string, name: string, action: "start" | "stop" | "restart" | "enable" | "disable" | "reload") {
    const key = `${serverId}::${name}`
    const cur = this.serviceStatuses.get(key) ?? "inactive"

    if (action === "stop") {
      this.serviceStatuses.set(key, "deactivating")
      this.addLog(serverId, "info", "systemd", `Stopping ${name}.service…`)
      this.emit()
      setTimeout(() => {
        this.serviceStatuses.set(key, "inactive")
        this.addLog(serverId, "info", "systemd", `Stopped ${name}.service`)
        this.serviceMemory.set(key, 0)
        this.emit()
      }, ri(600, 1800))
    } else if (action === "start") {
      this.serviceStatuses.set(key, "activating")
      this.addLog(serverId, "info", "systemd", `Starting ${name}.service…`)
      this.emit()
      setTimeout(() => {
        this.serviceStatuses.set(key, "active")
        const svc = this._services.find(s => s.serverId === serverId && s.name === name)
        this.serviceMemory.set(key, svc?.memMb ?? ri(20, 200))
        this.addLog(serverId, "info", "systemd", `Started ${name}.service`)
        this.emit()
      }, ri(800, 2500))
    } else if (action === "restart") {
      this.serviceStatuses.set(key, "deactivating")
      this.addLog(serverId, "info", "systemd", `Restarting ${name}.service…`)
      this.emit()
      setTimeout(() => {
        this.serviceStatuses.set(key, "activating")
        this.addLog(serverId, "info", "systemd", `${name}.service: Process deactivated, restarting`)
        this.emit()
      }, ri(600, 1400))
      setTimeout(() => {
        this.serviceStatuses.set(key, "active")
        const svc = this._services.find(s => s.serverId === serverId && s.name === name)
        this.serviceMemory.set(key, svc?.memMb ?? ri(20, 200))
        this.addLog(serverId, "info", "systemd", `${name}.service: Started (Restart=${ri(1, 3)})`)
        this.emit()
      }, ri(2000, 4000))
    } else if (action === "reload") {
      this.serviceStatuses.set(key, "reloading")
      this.addLog(serverId, "info", "systemd", `Reloading ${name}.service (SIGHUP)`)
      this.emit()
      setTimeout(() => {
        this.serviceStatuses.set(key, cur === "reloading" ? "active" : cur)
        this.addLog(serverId, "info", "systemd", `${name}.service: configuration reloaded`)
        this.emit()
      }, ri(400, 1000))
    } else if (action === "enable") {
      this.addLog(serverId, "info", "systemd", `Enabled ${name}.service (symlink created)`)
      this.emit()
    } else if (action === "disable") {
      this.addLog(serverId, "info", "systemd", `Disabled ${name}.service (symlink removed)`)
      this.emit()
    }
  }

  // ─── Remote execution ───────────────────────────────────────────────────────

  runRemoteCommand(jobId: string, command: string, targetIds: string[]) {
    const results = new Map<string, RemoteResult>()
    for (const id of targetIds) results.set(id, { phase: "pending", output: [] })

    const job: RemoteJob = { id: jobId, command, targets: targetIds, results, startedAt: Date.now() }
    this.remoteJobs.set(jobId, job)
    this.emit()

    for (const serverId of targetIds) {
      const s = servers.find(x => x.id === serverId)
      const state = this.serverStates.get(serverId)
      const isOff = !s || !state || state.status === "off"

      // Stagger connection start
      const connectDelay = ri(100, 600)
      setTimeout(() => {
        results.set(serverId, { phase: "connecting", output: [] })
        this.emit()
      }, connectDelay)

      if (isOff) {
        setTimeout(() => {
          results.set(serverId, { phase: "error", output: ["ssh: connect to host: Connection refused — server offline"], exitCode: 255 })
          this.emit()
        }, connectDelay + ri(400, 900))
        continue
      }

      // Run command
      const runDelay = connectDelay + ri(300, 700)
      setTimeout(() => {
        results.set(serverId, { phase: "running", output: [] })
        this.emit()
      }, runDelay)

      // Output arrives
      const outputLines = generateRemoteOutput(command, s!)
      outputLines.forEach((line, i) => {
        setTimeout(() => {
          const cur = results.get(serverId)!
          results.set(serverId, { ...cur, output: [...cur.output, line] })
          this.emit()
        }, runDelay + i * ri(50, 150))
      })

      // Done
      const doneDelay = runDelay + outputLines.length * 150 + ri(100, 300)
      setTimeout(() => {
        const startMs = job.startedAt
        results.set(serverId, {
          phase: "done",
          output: outputLines,
          exitCode: 0,
          durationMs: Date.now() - startMs,
        })
        this.emit()
      }, doneDelay)
    }
  }

  // ─── Playbook ───────────────────────────────────────────────────────────────

  runPlaybook(jobId: string, jobName: string, targets: string, targetList: string[]) {
    if (this.jobStatuses.get(jobId) === "running") return
    this.jobStatuses.set(jobId, "running")
    this.jobOutputs.set(jobId, [])
    this.emit()

    const suffix = ".node.internal"
    const nodes = targetList.length > 0 ? targetList : ["emp-01", "emp-02", "emp-03"]

    const lines: string[] = [
      "",
      `PLAY [${targets}] ${"*".repeat(Math.max(5, 62 - targets.length))}`,
      "",
      `TASK [Gathering Facts] ${"*".repeat(48)}`,
      ...nodes.map((n) => `ok: [${n}${suffix}]`),
      "",
      `TASK [${jobName.slice(0, 50)}] ${"*".repeat(Math.max(5, 52 - jobName.slice(0, 50).length))}`,
      ...nodes.map((n) => `changed: [${n}${suffix}]`),
      "",
      `RUNNING HANDLER [systemd : daemon-reload] ${"*".repeat(28)}`,
      ...nodes.map((n) => `ok: [${n}${suffix}]`),
      "",
      `TASK [Verify service status] ${"*".repeat(42)}`,
      ...nodes.map((n) => `ok: [${n}${suffix}] => {"status": "active (running)"}`),
      "",
      `PLAY RECAP ${"*".repeat(62)}`,
      ...nodes.map((n) => `${(n + suffix).padEnd(38)}: ok=5  changed=2  unreachable=0  failed=0  skipped=0`),
      "",
    ]

    let i = 0
    const push = () => {
      if (i >= lines.length) { this.jobStatuses.set(jobId, "success"); this.emit(); return }
      const line = lines[i++]
      this.jobOutputs.set(jobId, [...(this.jobOutputs.get(jobId) ?? []), line])
      this.emit()
      setTimeout(push, (line.startsWith("ok:") || line.startsWith("changed:") || line.includes("=>")) ? ri(80, 180) : ri(350, 650))
    }
    setTimeout(push, 500)
  }
}

export const emulator = new EmulatorStore()

// ─── React Hooks ──────────────────────────────────────────────────────────────

export function useEmulator() {
  const [, tick] = useReducer((n: number) => n + 1, 0)
  useEffect(() => emulator.subscribe(tick), [])
  return emulator
}

export function useEmulatorSeries(serverId: string, length = 40) {
  const [data, setData] = useState<{ t: number; v: number }[]>(() => {
    const st = emulator.serverStates.get(serverId)
    const base = st?.cpuUtil ?? 50
    return Array.from({ length }, (_, i) => ({ t: i, v: clamp(base + (Math.random() - 0.5) * 20, 0, 100) }))
  })
  const tRef = useRef(length)
  useEffect(() => {
    return emulator.subscribe(() => {
      const st = emulator.serverStates.get(serverId)
      if (!st) return
      const t = ++tRef.current
      setData((prev) => [...prev.slice(1), { t, v: Number(st.cpuUtil.toFixed(1)) }])
    })
  }, [serverId])
  return data
}

// Smart auto-scroll: returns ref + onScroll handler + whether to auto-scroll
export function useSmartScroll(dep: number) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  useEffect(() => {
    if (!atBottom.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dep])

  return { scrollRef, onScroll }
}
