export type Status = "ok" | "warn" | "err" | "off"
export type Role =
  | "AI/GPU"
  | "Game"
  | "API"
  | "Database"
  | "Redis"
  | "Content"
  | "Git"
  | "CI/CD"
  | "Build"
  | "Monitoring"
  | "Artifact"
  | "Backup"

export interface Gpu {
  index: number
  name: string
  vramTotalMb: number
  vramUsedMb: number
  util: number
  tempC: number
  fanPct: number
  powerW: number
  powerLimitW: number
  model: string | null
  pid: number | null
}

export interface Server {
  id: string
  hostname: string
  role: Role
  rack: string // A–E
  slotStart: number // 1U index
  height: number // U
  status: Status
  os: string
  uptimeDays: number
  cpuModel: string
  cpuArch: string
  cores: number
  threads: number
  cpuBaseMhz: number
  cpuTdp: number
  cpuUtil: number
  cpuClockMhz: number
  cpuTempC: number
  cpuPowerW: number
  ramTotalGb: number
  ramType: string
  ramSpeed: number
  ramUsedGb: number
  swapUsedGb: number
  eccErrors: number
  storage: {
    label: string
    healthPct: number
    readMbs: number
    writeMbs: number
    raid: string
    raidState: "Healthy" | "Degraded" | "Rebuilding"
  }
  netRxMbps: number
  netTxMbps: number
  packetLossPct: number
  connections: number
  nic: string
  gpus: Gpu[]
  ipmiIp: string
  dataIp: string
}

const V100 = "NVIDIA Tesla V100-PCIE-32GB"
const EPYC = "AMD EPYC 7313P"
const XEON = "Intel Xeon Silver 4310"

const models = [
  "Llama-3-8B-Instruct",
  "Qwen2.5-14B",
  "Mistral-7B-v0.3",
  "Gemma-2-9B",
  "sd-xl-base-1.0",
  "whisper-large-v3",
  "CodeLlama-13B",
  null,
]

function rand(min: number, max: number, dp = 0) {
  const v = min + Math.random() * (max - min)
  return dp === 0 ? Math.round(v) : Number(v.toFixed(dp))
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeGpu(index: number): Gpu {
  const util = rand(0, 100)
  const busy = util > 8
  const vramUsedMb = busy ? rand(4000, 31800) : rand(300, 1400)
  return {
    index,
    name: V100,
    vramTotalMb: 32768,
    vramUsedMb,
    util,
    tempC: busy ? rand(58, 84) : rand(33, 45),
    fanPct: busy ? rand(45, 92) : rand(18, 30),
    powerW: busy ? rand(120, 248) : rand(38, 62),
    powerLimitW: 250,
    model: busy ? pick(models.filter(Boolean) as string[]) : null,
    pid: busy ? rand(10000, 65000) : null,
  }
}

interface Seed {
  id: string
  role: Role
  cpu: string
  arch: string
  cores: number
  threads: number
  base: number
  tdp: number
  ram: number
  ramType: string
  raid: string
  raidLabel: string
  nic: string
  gpus: number
  status?: Status
}

const seeds: Seed[] = []

for (let i = 1; i <= 15; i++) {
  seeds.push({
    id: `EMP-${String(i).padStart(2, "0")}`,
    role: "AI/GPU",
    cpu: "AMD EPYC 7302P",
    arch: "Zen 2",
    cores: 16,
    threads: 32,
    base: 3000,
    tdp: 155,
    ram: 64,
    ramType: "DDR4 ECC RDIMM",
    raid: "RAID 1 (mdadm)",
    raidLabel: "Samsung NVMe 1TB ×2",
    nic: "Mellanox 10GbE SFP+ ×2",
    gpus: 2,
  })
}

const infra: Seed[] = [
  { id: "GAME-01", role: "Game", ram: 128, raidLabel: "NVMe 1.92TB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "GAME-02", role: "Game", ram: 128, raidLabel: "NVMe 1.92TB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "API-01", role: "API", ram: 64, raidLabel: "NVMe 960GB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "API-02", role: "API", ram: 64, raidLabel: "NVMe 960GB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "DB-01", role: "Database", ram: 128, raidLabel: "NVMe 1.92TB ×4", raid: "RAID 10", nic: "25GbE SFP28 ×2", gpus: 0 } as Seed,
  { id: "DB-02", role: "Database", ram: 128, raidLabel: "NVMe 1.92TB ×4", raid: "RAID 10", nic: "25GbE SFP28 ×2", gpus: 0 } as Seed,
  { id: "REDIS-01", role: "Redis", ram: 128, raidLabel: "NVMe 960GB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "CONTENT-01", role: "Content", ram: 128, raidLabel: "12-Bay SAS RAIDZ2", raid: "RAIDZ2", nic: "25GbE SFP28 ×2", gpus: 0 } as Seed,
  { id: "GIT-01", role: "Git", cpu: XEON, arch: "Ice Lake", ram: 64, raidLabel: "NVMe 1.92TB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "CI-01", role: "CI/CD", ram: 128, raidLabel: "NVMe 1.92TB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "BUILD-01", role: "Build", ram: 256, raidLabel: "NVMe 3.84TB ×2", raid: "RAID 1", nic: "25GbE SFP28 ×2", gpus: 0 } as Seed,
  { id: "MON-01", role: "Monitoring", cpu: XEON, arch: "Ice Lake", ram: 64, raidLabel: "NVMe 1.92TB ×2", raid: "RAID 1", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "ART-01", role: "Artifact", cpu: XEON, arch: "Ice Lake", ram: 128, raidLabel: "NVMe + HDD Array", raid: "RAID 6", nic: "10GbE SFP+ ×2", gpus: 0 } as Seed,
  { id: "BACKUP-01", role: "Backup", ram: 128, raidLabel: "24-Bay HDD Array", raid: "RAIDZ2", nic: "25GbE SFP28 ×2", gpus: 0 } as Seed,
]

for (const s of infra) {
  seeds.push({
    ...s,
    cpu: s.cpu ?? EPYC,
    arch: s.arch ?? "Zen 3",
    cores: s.cores ?? 16,
    threads: s.threads ?? 32,
    base: s.base ?? 3000,
    tdp: s.tdp ?? 155,
    ramType: s.ramType ?? "DDR4 ECC RDIMM",
  } as Seed)
}

// Fixed rack placement + a few non-ok statuses for realism
const forcedStatus: Record<string, Status> = {
  "EMP-07": "warn",
  "EMP-12": "err",
  "EMP-15": "off",
  "GAME-02": "warn",
  "DB-02": "warn",
  "BACKUP-01": "off",
}

const racks = ["A", "B", "C", "D", "E"]

export const servers: Server[] = seeds.map((s, i) => {
  const status: Status = forcedStatus[s.id] ?? (Math.random() < 0.08 ? "warn" : "ok")
  const rack = racks[Math.floor(i / 6) % racks.length]
  const height = s.role === "AI/GPU" || s.role === "Content" || s.role === "Backup" ? 2 : 1
  const slotStart = 1 + (i % 6) * 4
  const off = status === "off"
  const load = status === "err" ? 0.95 : status === "warn" ? 0.8 : Math.random() * 0.7 + 0.05
  const gpus = Array.from({ length: s.gpus }, (_, g) => makeGpu(g))

  return {
    id: s.id,
    hostname: `${s.id.toLowerCase()}.node.internal`,
    role: s.role,
    rack,
    slotStart,
    height,
    status,
    os: s.cpu === XEON ? "Ubuntu 22.04 LTS" : "Ubuntu 24.04 LTS",
    uptimeDays: off ? 0 : rand(3, 187),
    cpuModel: s.cpu,
    cpuArch: s.arch,
    cores: s.cores,
    threads: s.threads,
    cpuBaseMhz: s.base,
    cpuTdp: s.tdp,
    cpuUtil: off ? 0 : Math.round(load * 100),
    cpuClockMhz: off ? 0 : rand(2600, 3700),
    cpuTempC: off ? 24 : rand(42, status === "err" ? 92 : 72),
    cpuPowerW: off ? 0 : Math.round(load * s.tdp),
    ramTotalGb: s.ram,
    ramType: s.ramType,
    ramSpeed: 3200,
    ramUsedGb: off ? 0 : Number((load * s.ram * (0.5 + Math.random() * 0.4)).toFixed(1)),
    swapUsedGb: off ? 0 : rand(0, 40, 1) / 10,
    eccErrors: status === "err" ? rand(3, 24) : rand(0, 100) < 90 ? 0 : 1,
    storage: {
      label: s.raidLabel,
      healthPct: s.id === "EMP-12" ? 74 : rand(88, 100),
      readMbs: off ? 0 : rand(80, 3200),
      writeMbs: off ? 0 : rand(60, 2600),
      raid: s.raid,
      raidState: s.id === "DB-02" ? "Rebuilding" : status === "err" ? "Degraded" : "Healthy",
    },
    netRxMbps: off ? 0 : rand(10, 9200),
    netTxMbps: off ? 0 : rand(8, 8600),
    packetLossPct: status === "err" ? rand(2, 8, 2) : rand(0, 30) / 100,
    connections: off ? 0 : rand(20, 4200),
    nic: s.nic,
    gpus,
    ipmiIp: `10.20.${30 + i}.10`,
    dataIp: `10.10.${30 + i}.20`,
  }
})

export const statusColor: Record<Status, string> = {
  ok: "var(--color-ok)",
  warn: "var(--color-warn)",
  err: "var(--color-err)",
  off: "var(--color-off)",
}

export const statusLabel: Record<Status, string> = {
  ok: "정상",
  warn: "경고",
  err: "에러",
  off: "오프라인",
}

// ---- Alerts ----
export interface Alert {
  id: string
  server: string
  metric: string
  severity: "critical" | "warning" | "info"
  message: string
  ts: string
  channels: string[]
  acked: boolean
}

// EMP-12에서 점진적으로 악화되는 인시던트를 중심으로 한 시퀀스 (현재 시각 00:10 기준)
export const alerts: Alert[] = [
  { id: "AL-2294", server: "EMP-12", metric: "GPU VRAM", severity: "critical", message: "GPU0 VRAM 96.4% 지속 (12분) — OOM 위험, 프로세스 강제 종료 권고", ts: "2026-08-17 00:09", channels: ["Slack", "Telegram"], acked: false },
  { id: "AL-2293", server: "EMP-12", metric: "CPU Temp", severity: "critical", message: "CPU 온도 92°C 도달 — 쓰로틀링 임박, 클럭 다운 시작", ts: "2026-08-17 00:07", channels: ["Slack", "Email"], acked: false },
  { id: "AL-2292", server: "EMP-12", metric: "GPU Fan", severity: "warning", message: "GPU0 팬 RPM 88%까지 급상승 — 흡기 온도 상승 감지", ts: "2026-08-17 00:04", channels: ["Slack"], acked: false },
  { id: "AL-2291", server: "EMP-12", metric: "GPU VRAM", severity: "warning", message: "GPU0 VRAM 88% 초과 — 임계치 접근 (추세 상승 중)", ts: "2026-08-17 00:01", channels: ["Slack"], acked: true },
  { id: "AL-2290", server: "DB-02", metric: "RAID", severity: "warning", message: "RAID 10 어레이 재구성 진행 중 (63%)", ts: "2026-08-16 23:58", channels: ["Slack"], acked: true },
  { id: "AL-2289", server: "EMP-12", metric: "NVMe SMART", severity: "warning", message: "NVMe Health 74% — 고장 임박 예측 (예상 잔여 21일)", ts: "2026-08-16 23:51", channels: ["Slack", "Email"], acked: true },
  { id: "AL-2288", server: "EMP-07", metric: "CPU", severity: "warning", message: "CPU 사용률 90% 5분 이상 지속", ts: "2026-08-16 23:44", channels: ["Discord"], acked: true },
  { id: "AL-2287", server: "GAME-02", metric: "Network", severity: "warning", message: "패킷 손실률 1.2% 감지", ts: "2026-08-16 23:20", channels: ["Slack"], acked: true },
  { id: "AL-2285", server: "BACKUP-01", metric: "Power", severity: "info", message: "IPMI 전원 오프 상태 — 예정된 유지보수", ts: "2026-08-16 23:02", channels: ["Email"], acked: true },
]

// ---- Reservations ----
export interface Reservation {
  id: string
  server: string
  user: string
  gpus: number
  start: string
  end: string
  purpose: string
  state: "active" | "upcoming" | "done"
}

export const reservations: Reservation[] = [
  { id: "R-104", server: "EMP-03", user: "김서연 연구원", gpus: 2, start: "08-17 18:00", end: "08-18 09:00", purpose: "Llama-3-8B 파인튜닝", state: "upcoming" },
  { id: "R-103", server: "EMP-01", user: "이준호 연구원", gpus: 2, start: "08-17 09:00", end: "08-17 21:00", purpose: "vLLM 추론 벤치마크", state: "active" },
  { id: "R-102", server: "EMP-05", user: "박민지 연구원", gpus: 1, start: "08-17 10:00", end: "08-17 16:00", purpose: "SDXL LoRA 학습", state: "active" },
  { id: "R-101", server: "EMP-09", user: "정우성 연구원", gpus: 2, start: "08-16 14:00", end: "08-17 08:00", purpose: "Whisper 음성 데이터 처리", state: "done" },
  { id: "R-100", server: "EMP-11", user: "최유진 연구원", gpus: 2, start: "08-18 10:00", end: "08-18 22:00", purpose: "CodeLlama 평가", state: "upcoming" },
]

// ---- Processes ----
export interface Proc {
  pid: number
  server: string
  user: string
  cmd: string
  cpu: number
  memGb: number
  vramMb: number
  type: "python" | "docker" | "system"
}

export const processes: Proc[] = [
  { pid: 48213, server: "EMP-01", user: "junho", cmd: "python -m vllm.entrypoints.api_server", cpu: 412, memGb: 22.4, vramMb: 28800, type: "python" },
  { pid: 39102, server: "EMP-05", user: "minji", cmd: "accelerate launch train_sdxl.py", cpu: 388, memGb: 18.1, vramMb: 24100, type: "python" },
  { pid: 21044, server: "EMP-12", user: "root", cmd: "docker: llm-inference-gw", cpu: 156, memGb: 9.8, vramMb: 31200, type: "docker" },
  { pid: 17820, server: "API-01", user: "svc-api", cmd: "gunicorn app.main:app -w 8", cpu: 92, memGb: 4.2, vramMb: 0, type: "python" },
  { pid: 9931, server: "DB-01", user: "postgres", cmd: "postgres: writer process", cpu: 64, memGb: 12.6, vramMb: 0, type: "system" },
  { pid: 8842, server: "REDIS-01", user: "redis", cmd: "redis-server *:6379", cpu: 38, memGb: 6.1, vramMb: 0, type: "system" },
]

export interface Container {
  name: string
  server: string
  image: string
  status: "running" | "restarting" | "exited"
  cpu: number
  memMb: number
  uptime: string
}

export const containers: Container[] = [
  { name: "llm-inference-gw", server: "EMP-01", image: "vllm/vllm-openai:v0.6.3", status: "running", cpu: 156, memMb: 22400, uptime: "3d 4h" },
  { name: "sdxl-trainer", server: "EMP-05", image: "pytorch/pytorch:2.4-cuda12", status: "running", cpu: 388, memMb: 18100, uptime: "6h 12m" },
  { name: "api-gateway", server: "API-01", image: "internal/api-gw:1.8.2", status: "running", cpu: 92, memMb: 4200, uptime: "12d 2h" },
  { name: "ranking-worker", server: "REDIS-01", image: "internal/ranker:2.1.0", status: "restarting", cpu: 12, memMb: 900, uptime: "0m" },
  { name: "prometheus", server: "MON-01", image: "prom/prometheus:v2.54", status: "running", cpu: 22, memMb: 3100, uptime: "31d 8h" },
]

// ---- Audit ----
export interface Audit {
  id: string
  user: string
  role: string
  action: string
  target: string
  ts: string
  ip: string
}

export const auditLog: Audit[] = [
  { id: "A-9921", user: "admin@corp", role: "Admin", action: "Force Reboot (IPMI)", target: "EMP-12", ts: "2026-08-17 14:35:02", ip: "10.0.0.14" },
  { id: "A-9920", user: "junho@corp", role: "Developer", action: "SSH Session Open", target: "EMP-01", ts: "2026-08-17 14:20:11", ip: "10.0.4.22" },
  { id: "A-9919", user: "minji@corp", role: "Employee", action: "Reservation Create", target: "EMP-05", ts: "2026-08-17 10:02:44", ip: "10.0.4.51" },
  { id: "A-9918", user: "admin@corp", role: "Admin", action: "Docker Restart", target: "REDIS-01 / ranking-worker", ts: "2026-08-17 09:48:20", ip: "10.0.0.14" },
  { id: "A-9917", user: "ci-bot", role: "Service", action: "Ansible Playbook Run (driver-update)", target: "EMP-01…15", ts: "2026-08-17 03:00:00", ip: "10.0.9.2" },
  { id: "A-9916", user: "admin@corp", role: "Admin", action: "Power Off (IPMI)", target: "BACKUP-01", ts: "2026-08-17 09:00:03", ip: "10.0.0.14" },
]

// ---- Automation jobs ----
export interface Job {
  id: string
  name: string
  targets: string
  schedule: string
  lastRun: string
  status: "success" | "running" | "failed" | "scheduled"
}

export const jobs: Job[] = [
  { id: "J-31", name: "NVIDIA 드라이버 재설치 (550.90)", targets: "EMP-01…15", schedule: "on-demand", lastRun: "2026-08-17 03:00", status: "success" },
  { id: "J-30", name: "Docker 이미지 일괄 배포 vllm:v0.6.3", targets: "EMP-01…15", schedule: "on-demand", lastRun: "2026-08-16 22:10", status: "success" },
  { id: "J-29", name: "OS 보안 패치 (unattended-upgrades)", targets: "ALL (30)", schedule: "매주 일 04:00", lastRun: "2026-08-17 04:00", status: "running" },
  { id: "J-28", name: "SMART 디스크 점검", targets: "ALL (30)", schedule: "매일 02:00", lastRun: "2026-08-17 02:00", status: "success" },
  { id: "J-27", name: "GPU 헬스체크 (nvidia-smi)", targets: "EMP-01…15", schedule: "매 15분", lastRun: "2026-08-17 14:30", status: "failed" },
]

export function fleetSummary() {
  const total = servers.length
  const by: Record<Status, number> = { ok: 0, warn: 0, err: 0, off: 0 }
  for (const s of servers) by[s.status]++
  const gpuServers = servers.filter((s) => s.gpus.length)
  const totalGpus = gpuServers.reduce((a, s) => a + s.gpus.length, 0)
  const busyGpus = gpuServers.reduce((a, s) => a + s.gpus.filter((g) => g.util > 8).length, 0)
  const vramUsed = gpuServers.reduce((a, s) => a + s.gpus.reduce((b, g) => b + g.vramUsedMb, 0), 0)
  const vramTotal = totalGpus * 32768
  const totalPower = servers.reduce(
    (a, s) => a + s.cpuPowerW + s.gpus.reduce((b, g) => b + g.powerW, 0),
    0,
  )
  return { total, by, totalGpus, busyGpus, vramUsed, vramTotal, totalPower }
}
