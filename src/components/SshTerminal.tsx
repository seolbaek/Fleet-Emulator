import { useEffect, useRef, useState } from "react"
import { X, Terminal } from "lucide-react"
import type { Server } from "../data/fleet"
import { emulator } from "../lib/emulator"

type Line = { type: "cmd" | "out" | "err" | "blank"; text: string }

// ─── Command implementations ───────────────────────────────────────────────

function ri(a: number, b: number) {
  return Math.floor(a + Math.random() * (b - a))
}

function handleCommand(raw: string, server: Server): { lines: Line[]; action?: "clear" | "exit" } {
  const cmd = raw.trim()
  const parts = cmd.split(/\s+/)
  const bin = parts[0]

  const out = (t: string): Line => ({ type: "out", text: t })
  const err = (t: string): Line => ({ type: "err", text: t })
  const blank = (): Line => ({ type: "blank", text: "" })

  if (!cmd) return { lines: [] }

  if (cmd === "clear") return { lines: [], action: "clear" }
  if (cmd === "exit" || cmd === "quit" || cmd === "logout") return { lines: [out("Connection to " + server.hostname + " closed.")], action: "exit" }

  if (cmd === "help") return {
    lines: [
      out("Available commands:"),
      blank(),
      out("  System:   uptime · uname -a · hostname · id · date · env · dmesg"),
      out("  Files:    ls [path] · df -h · cat /proc/cpuinfo · cat /proc/meminfo"),
      out("  Process:  top · ps aux · free -h · kill <pid>"),
      out("  Network:  ip a · ss -tulpn · ping <host> · curl <url>"),
      out("  GPU:      nvidia-smi · nvidia-smi -l 1"),
      out("  Docker:   docker ps [-a] · docker images · docker stats · docker logs <name>"),
      out("  Service:  systemctl status [svc] · systemctl list-units · journalctl -n 30"),
      out("  Other:    redis-cli info · psql -c '...' · clear · exit"),
    ],
  }

  if (cmd === "uptime") {
    const d = server.uptimeDays
    const h = ri(0, 23)
    const m = ri(0, 59)
    const load = (server.cpuUtil / 100 * 4).toFixed(2)
    return {
      lines: [out(` ${new Date().toTimeString().slice(0, 8)} up ${d} days, ${h}:${String(m).padStart(2, "0")},  2 users,  load average: ${load}, ${(+load * 0.9).toFixed(2)}, ${(+load * 0.8).toFixed(2)}`)],
    }
  }

  if (bin === "uname") return {
    lines: [out(`Linux ${server.hostname.split(".")[0]} 5.15.0-116-generic #126-Ubuntu SMP Fri Aug 2 10:00:00 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux`)],
  }

  if (cmd === "hostname") return { lines: [out(server.hostname)] }
  if (cmd === "whoami") return { lines: [out("root")] }
  if (cmd === "id") return { lines: [out("uid=0(root) gid=0(root) groups=0(root)")] }
  if (cmd === "pwd") return { lines: [out("/root")] }
  if (cmd === "date") return { lines: [out(new Date().toString())] }
  if (bin === "echo") return { lines: [out(parts.slice(1).join(" "))] }

  if (cmd === "env") return {
    lines: [
      out("SHELL=/bin/bash"),
      out(`HOME=/root`),
      out(`TERM=xterm-256color`),
      out(`USER=root`),
      out(`HOSTNAME=${server.hostname}`),
      out(`NVIDIA_DRIVER_CAPABILITIES=compute,utility`),
      out(`CUDA_VERSION=12.4.0`),
      out(`PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`),
      out(`DOCKER_HOST=unix:///var/run/docker.sock`),
    ],
  }

  if (bin === "ls") {
    const path = parts[1] || "."
    if (path === "/" || path === ".") return {
      lines: [out("bin   boot  dev  etc  home  lib  lib64  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var")],
    }
    if (path.includes("model") || path === "/opt" || path === "/opt/models") return {
      lines: [
        out("total 487G"),
        out("drwxr-xr-x 2 root root  4096 Aug 10 14:22 Llama-3-8B-Instruct"),
        out("drwxr-xr-x 2 root root  4096 Aug 12 09:14 Qwen2.5-14B"),
        out("drwxr-xr-x 2 root root  4096 Aug  8 18:33 Mistral-7B-v0.3"),
        out("drwxr-xr-x 2 root root  4096 Aug 14 21:01 sd-xl-base-1.0"),
        out("drwxr-xr-x 2 root root  4096 Aug  6 07:55 whisper-large-v3"),
        out("drwxr-xr-x 2 root root  4096 Aug 15 03:40 CodeLlama-13B"),
      ],
    }
    if (path.includes("docker")) return {
      lines: [
        out("total 48"),
        out("drwx--x--x 15 root root 4096 Aug  1 12:00 containers"),
        out("drwx--x--x  4 root root 4096 Aug  1 12:00 image"),
        out("drwxr-xr-x  6 root root 4096 Aug  1 12:00 overlay2"),
        out("drwx------  4 root root 4096 Aug  1 12:00 volumes"),
      ],
    }
    if (path === "/root" || path === "~") return {
      lines: [out(".bash_history  .bashrc  .profile  .ssh  ansible  logs  scripts")],
    }
    return { lines: [err(`ls: cannot access '${path}': No such file or directory`)] }
  }

  if (bin === "df") return {
    lines: [
      out("Filesystem          Size  Used Avail Use% Mounted on"),
      out(`/dev/md0            ${server.storage.label.includes("3.84") ? "3.6T" : "1.8T"}  ${ri(200, 600)}G  ${ri(800, 1400)}G  ${ri(15, 45)}% /`),
      out("tmpfs                16G     0   16G   0% /dev/shm"),
      out("/dev/nvme0n1p1      511M   12M  499M   3% /boot/efi"),
      out(`overlay             ${server.storage.label.includes("3.84") ? "3.6T" : "1.8T"}  ${ri(50, 200)}G  ${ri(800, 1400)}G   ${ri(5, 18)}% /var/lib/docker`),
    ],
  }

  if (bin === "free") return {
    lines: [
      out(`               total        used        free      shared  buff/cache   available`),
      out(`Mem:        ${(server.ramTotalGb * 1024).toString().padStart(10)}    ${Math.round(server.ramUsedGb * 1024).toString().padStart(10)}    ${Math.round((server.ramTotalGb - server.ramUsedGb) * 1024).toString().padStart(10)}           0    ${ri(1000, 4000).toString().padStart(10)}    ${Math.round((server.ramTotalGb - server.ramUsedGb) * 900).toString().padStart(10)}`),
      out(`Swap:         ${ri(0, 8192).toString().padStart(9)}           0    ${ri(0, 8192).toString().padStart(10)}`),
    ],
  }

  if (bin === "top" || cmd === "htop") return {
    lines: [
      out(`top - ${new Date().toTimeString().slice(0, 8)} up ${server.uptimeDays} days,  load average: ${(server.cpuUtil / 25).toFixed(2)}, ${(server.cpuUtil / 28).toFixed(2)}, ${(server.cpuUtil / 30).toFixed(2)}`),
      out(`Tasks: ${ri(150, 250)} total,   ${ri(1, 5)} running, ${ri(140, 240)} sleeping,   0 stopped,   0 zombie`),
      out(`%Cpu(s): ${server.cpuUtil.toFixed(1)} us,  ${ri(1, 8)}.${ri(0, 9)} sy,  0.0 ni, ${(100 - server.cpuUtil - ri(2, 10)).toFixed(1)} id,  0.0 wa,  0.0 hi,  ${ri(0, 3)}.${ri(0, 9)} si`),
      out(`MiB Mem : ${(server.ramTotalGb * 1024).toFixed(1)} total, ${((server.ramTotalGb - server.ramUsedGb) * 1024).toFixed(1)} free, ${(server.ramUsedGb * 1024).toFixed(1)} used, ${ri(500, 4000)}.0 buff/cache`),
      blank(),
      out("  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND"),
      out(`${ri(10000, 65000)} root      20   0  ${ri(2, 32)}G  ${ri(1, 20)}G   ${ri(100, 999)}m S  ${ri(50, 400)}.${ri(0, 9)}  ${ri(5, 35)}.${ri(0, 9)}  ${ri(10, 999)}:${ri(10, 59)}.${ri(10, 99)} python3`),
      out(`${ri(10000, 65000)} root      20   0  ${ri(1, 8)}G   ${ri(200, 999)}m  ${ri(10, 99)}m S   ${ri(5, 50)}.${ri(0, 9)}  ${ri(1, 10)}.${ri(0, 9)}   ${ri(1, 99)}:${ri(10, 59)}.${ri(10, 99)} dockerd`),
      out(`    1 root      20   0  ${ri(100, 999)}m  ${ri(5, 30)}m   ${ri(1, 9)}m S   0.0   0.${ri(0, 9)}   ${ri(0, 9)}:${ri(10, 59)}.${ri(10, 99)} systemd`),
      out(""),
      out("[Press q to quit — simulated snapshot]"),
    ],
  }

  if (bin === "ps") return {
    lines: [
      out("USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND"),
      out(`root         1  0.0  0.0  ${ri(100, 999)}m  ${ri(5, 30)}m ?        Ss   Aug16  ${ri(0, 9)}:${ri(10, 59)} /sbin/init`),
      out(`root       ${ri(100, 999)}  0.0  0.0      0     0 ?        I<   Aug16  ${ri(0, 9)}:${ri(10, 59)} [kworker/u64:2]`),
      out(`root       ${ri(100, 999)}  0.3  0.1  ${ri(100, 999)}m  ${ri(5, 50)}m ?        Ssl  Aug16  ${ri(1, 99)}:${ri(10, 59)} /usr/bin/dockerd`),
      ...(server.gpus.length > 0 ? [
        out(`root  ${ri(10000, 65000)} ${server.cpuUtil}.2 ${ri(5, 40)}.${ri(0, 9)} ${ri(10, 50)}G ${ri(1, 20)}G ?  Sl Aug17 ${ri(10, 999)}:${ri(10, 59)} python3 -m vllm.entrypoints.api_server`),
        out(`root  ${ri(10000, 65000)}  8.1  2.${ri(0, 9)}  ${ri(1, 8)}G  ${ri(200, 999)}m ?  Sl  Aug16  ${ri(1, 99)}:${ri(10, 59)} nvidia-smi dmon -s pucvmet`),
      ] : []),
      out(`root  ${ri(10000, 65000)}  0.0  0.0  ${ri(10, 99)}m  ${ri(1, 9)}m ?  Ss Aug16  ${ri(0, 9)}:${ri(10, 59)} /usr/sbin/sshd -D`),
      out(`root  ${ri(10000, 65000)}  0.0  0.0  ${ri(10, 99)}m  ${ri(1, 9)}m ?  Ss Aug16  ${ri(0, 9)}:${ri(10, 59)} sshd: root@pts/0`),
    ],
  }

  if (bin === "nvidia-smi") {
    if (server.gpus.length === 0) return { lines: [err("NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver.")] }
    const g = server.gpus
    return {
      lines: [
        out(`+-----------------------------------------------------------------------------+`),
        out(`| NVIDIA-SMI 550.90.07              Driver Version: 550.90.07   CUDA: 12.4   |`),
        out(`|-------------------------------+----------------------+----------------------+`),
        out(`| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |`),
        out(`| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |`),
        out(`|===============================+======================+======================|`),
        ...g.map((gpu) => [
          out(`|   ${gpu.index}  Tesla V100-PCIE-32GB   On  | 00000000:0${3 + gpu.index}:00.0  Off |                    0 |`),
          out(`| ${String(gpu.fanPct).padStart(2)}%   ${gpu.tempC}C   P0  ${String(gpu.powerW).padStart(3)}W / 250W |  ${String(Math.round(gpu.vramUsedMb / 1024)).padStart(5)}MiB / 32768MiB |    ${String(gpu.util).padStart(2)}%      Default |`),
        ]).flat(),
        out(`+-----------------------------------------------------------------------------+`),
        blank(),
        out(`+-----------------------------------------------------------------------------+`),
        out(`| Processes:                                                                  |`),
        out(`|  GPU   GI   CI        PID   Type   Process name                  GPU Memory |`),
        ...g.filter(gpu => gpu.pid).map(gpu =>
          out(`|    ${gpu.index}    -    -   ${String(gpu.pid).padStart(6)}      C   ...python3 -m vllm.entrypoints     ${String(Math.round(gpu.vramUsedMb / 1024)).padStart(5)}MiB |`)
        ),
        out(`+-----------------------------------------------------------------------------+`),
      ],
    }
  }

  if (bin === "docker") {
    const sub = parts[1]
    if (sub === "ps") return {
      lines: [
        out("CONTAINER ID   IMAGE                        COMMAND                  STATUS          PORTS     NAMES"),
        out(`a${ri(100000, 999999).toString(16).padEnd(11, "0")}   vllm/vllm-openai:v0.6.3     "/usr/local/bin/pyth…"   Up 3 days       8000/tcp  llm-inference-gw`),
        out(`b${ri(100000, 999999).toString(16).padEnd(11, "0")}   prom/node-exporter:v1.8     "/bin/node_exporter"     Up 2 weeks      9100/tcp  node-exporter`),
        out(`c${ri(100000, 999999).toString(16).padEnd(11, "0")}   prom/cadvisor:v0.49         "/usr/bin/cadvisor"      Up 2 weeks      8080/tcp  cadvisor`),
      ],
    }
    if (sub === "images") return {
      lines: [
        out("REPOSITORY                TAG          IMAGE ID       CREATED        SIZE"),
        out("vllm/vllm-openai          v0.6.3       a1b2c3d4e5f6   3 days ago     18.4GB"),
        out("pytorch/pytorch           2.4-cuda12   b2c3d4e5f6a7   2 weeks ago    12.1GB"),
        out("prom/node-exporter        v1.8.0       c3d4e5f6a7b8   2 months ago   22.3MB"),
        out("internal/api-gw           1.8.2        d4e5f6a7b8c9   5 days ago     892MB"),
      ],
    }
    if (sub === "stats") return {
      lines: [
        out("CONTAINER               CPU %     MEM USAGE / LIMIT     NET I/O          BLOCK I/O"),
        out(`llm-inference-gw        ${server.cpuUtil.toFixed(1)}%      ${server.ramUsedGb.toFixed(1)}GiB / ${server.ramTotalGb}GiB   ${ri(100, 500)}MB / ${ri(50, 200)}MB   ${ri(1, 50)}GB / ${ri(1, 20)}GB`),
        out(`node-exporter           0.1%      5.2MiB / ${server.ramTotalGb}GiB       1.2MB / 800kB    0B / 0B`),
      ],
    }
    if (sub === "logs") {
      const ts = new Date().toISOString().slice(11, 19)
      return {
        lines: [
          out(`[2026-08-17T${ts}Z] INFO: Server started on port 8000`),
          out(`[2026-08-17T${ts}Z] INFO: Loaded model Llama-3-8B-Instruct`),
          out(`[2026-08-17T${ts}Z] INFO: ${ri(10, 95)} tok/s, queue ${ri(0, 10)}`),
          out(`[2026-08-17T${ts}Z] INFO: GET /health 200 OK ${ri(1, 20)}ms`),
        ],
      }
    }
    return { lines: [err(`docker: '${sub}' is not a docker command.`)] }
  }

  if (bin === "systemctl") {
    const sub = parts[1]
    const svc = parts[2] ?? "docker"
    if (sub === "status") return {
      lines: [
        out(`● ${svc}.service - ${svc.charAt(0).toUpperCase() + svc.slice(1)} Service`),
        out(`     Loaded: loaded (/lib/systemd/system/${svc}.service; enabled; vendor preset: enabled)`),
        out(`     Active: active (running) since Mon 2026-08-17 09:00:01 UTC; ${server.uptimeDays}d ${ri(0, 23)}h ago`),
        out(`   Main PID: ${ri(800, 3000)} (${svc}d)`),
        out(`      Tasks: ${ri(10, 200)} (limit: 76949)`),
        out(`     Memory: ${ri(50, 500)}.${ri(0, 9)}M`),
        out(`        CPU: ${ri(1, 999)}min ${ri(0, 59)}.${ri(100, 999)}ms`),
      ],
    }
    if (sub === "list-units") return {
      lines: [
        out("UNIT                              LOAD   ACTIVE SUB     DESCRIPTION"),
        out("docker.service                    loaded active running Docker Application Container Engine"),
        out("nvidia-persistenced.service       loaded active running NVIDIA Persistence Daemon"),
        out("ssh.service                       loaded active running OpenBSD Secure Shell server"),
        out("cron.service                      loaded active running Regular background program"),
        out("prometheus-node-exporter.service  loaded active running Prometheus exporter for machine metrics"),
        out(`LOAD = Reflects whether the unit definition was properly loaded.`),
        out(`ACTIVE = The high-level unit activation state.`),
        blank(),
        out(`${ri(150, 250)} loaded units listed.`),
      ],
    }
    return { lines: [out(`systemctl: unknown subcommand '${sub}'`)] }
  }

  if (bin === "journalctl") {
    const logs = emulator.serverLogs.get(server.id) ?? []
    const recent = logs.slice(-20)
    return {
      lines: [
        out(`-- Journal begins at Mon 2026-08-17 09:00:01 UTC. --`),
        ...recent.map((l) => out(`Aug 17 ${l.ts.slice(0, 8)} ${server.hostname.split(".")[0]} ${l.facility}[${ri(100, 9999)}]: ${l.msg}`)),
      ],
    }
  }

  if (bin === "dmesg") return {
    lines: (emulator.serverLogs.get(server.id) ?? [])
      .filter((l) => l.facility === "kernel" || l.facility === "nvidia")
      .slice(-15)
      .map((l) => out(`[${(Math.random() * 999999).toFixed(6)}] ${l.msg}`)),
  }

  if (bin === "ip" || bin === "ifconfig") return {
    lines: [
      out(`bond0: flags=5187<UP,BROADCAST,RUNNING,MASTER,MULTICAST>  mtu 9000`),
      out(`        inet ${server.dataIp}  netmask 255.255.255.0  broadcast 10.10.${server.dataIp.split(".")[2]}.255`),
      out(`        inet6 fe80::${ri(1000, 9999)}:${ri(1000, 9999)}:${ri(1000, 9999)}:${ri(1000, 9999)}  prefixlen 64  scopeid 0x20<link>`),
      out(`        RX packets ${ri(1000000, 9999999)}  bytes ${ri(100, 999)} GB`),
      out(`        TX packets ${ri(1000000, 9999999)}  bytes ${ri(10, 999)} GB`),
      blank(),
      out(`eth0: flags=6211<UP,BROADCAST,RUNNING,SLAVE,MULTICAST>  mtu 9000  (${server.nic.split(" ")[0]})`),
      out(`eth1: flags=6211<UP,BROADCAST,RUNNING,SLAVE,MULTICAST>  mtu 9000  (${server.nic.split(" ")[0]})`),
      blank(),
      out(`ipmi0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`),
      out(`        inet ${server.ipmiIp}  netmask 255.255.255.0`),
    ],
  }

  if (bin === "ss" || bin === "netstat") return {
    lines: [
      out("Netid  State   Recv-Q  Send-Q  Local Address:Port     Peer Address:Port  Process"),
      out(`tcp    LISTEN  0       128           0.0.0.0:22            0.0.0.0:*      sshd`),
      out(`tcp    LISTEN  0       4096          0.0.0.0:9100          0.0.0.0:*      node_exporter`),
      ...(server.role === "AI/GPU" ? [out(`tcp    LISTEN  0       4096          0.0.0.0:8000          0.0.0.0:*      python3 (vllm)`)] : []),
      ...(server.role === "API" ? [out(`tcp    LISTEN  0       4096          0.0.0.0:80            0.0.0.0:*      nginx`), out(`tcp    LISTEN  0       4096          0.0.0.0:8080          0.0.0.0:*      gunicorn`)] : []),
      ...(server.role === "Database" ? [out(`tcp    LISTEN  0       4096          0.0.0.0:5432          0.0.0.0:*      postgres`)] : []),
      ...(server.role === "Redis" ? [out(`tcp    LISTEN  0       4096          0.0.0.0:6379          0.0.0.0:*      redis-server`)] : []),
    ],
  }

  if (bin === "ping") {
    const host = parts[1] ?? "8.8.8.8"
    return {
      lines: [
        out(`PING ${host} (${host}): 56 data bytes`),
        out(`64 bytes from ${host}: icmp_seq=0 ttl=117 time=${ri(1, 5)}.${ri(0, 999)} ms`),
        out(`64 bytes from ${host}: icmp_seq=1 ttl=117 time=${ri(1, 5)}.${ri(0, 999)} ms`),
        out(`64 bytes from ${host}: icmp_seq=2 ttl=117 time=${ri(1, 5)}.${ri(0, 999)} ms`),
        blank(),
        out(`--- ${host} ping statistics ---`),
        out(`3 packets transmitted, 3 received, 0% packet loss`),
      ],
    }
  }

  if (bin === "curl") return {
    lines: server.role === "API"
      ? [out(`{"status":"ok","uptime":${server.uptimeDays * 86400 + ri(0, 86400)},"version":"1.8.2","workers":${ri(8, 16)}}`)]
      : [out(`curl: (7) Failed to connect to localhost port 80: Connection refused`)],
  }

  if (bin === "redis-cli") return {
    lines: server.role === "Redis" ? [
      out(`# Server`),
      out(`redis_version:7.2.4`),
      out(`redis_mode:standalone`),
      out(`uptime_in_seconds:${server.uptimeDays * 86400 + ri(0, 86400)}`),
      blank(),
      out(`# Clients`),
      out(`connected_clients:${ri(100, 5000)}`),
      blank(),
      out(`# Memory`),
      out(`used_memory_human:${server.ramUsedGb.toFixed(1)}G`),
      out(`maxmemory_human:${server.ramTotalGb}G`),
      blank(),
      out(`# Stats`),
      out(`instantaneous_ops_per_sec:${ri(1000, 50000)}`),
      out(`total_commands_processed:${ri(10000000, 9999999999)}`),
    ] : [err("redis-cli: connect: Connection refused")],
  }

  if (bin === "psql") return {
    lines: server.role === "Database" ? [
      out(`psql (15.8 (Ubuntu 15.8-0ubuntu0.24.04.1))`),
      out(`Type "help" for help.`),
      blank(),
      out(`         version`),
      out(`--------------------------`),
      out(` PostgreSQL 15.8 on x86_64`),
      out(`(1 row)`),
    ] : [err("psql: error: connection to server on socket \"/var/run/postgresql/.s.PGSQL.5432\" failed")],
  }

  if (bin === "cat") {
    const path = parts[1] ?? ""
    if (path === "/proc/cpuinfo") return {
      lines: [
        out(`processor       : 0`),
        out(`vendor_id       : ${server.cpuModel.includes("AMD") ? "AuthenticAMD" : "GenuineIntel"}`),
        out(`cpu family      : ${server.cpuModel.includes("AMD") ? "25" : "6"}`),
        out(`model name      : ${server.cpuModel}`),
        out(`cpu MHz         : ${server.cpuClockMhz}`),
        out(`cache size      : 32768 KB`),
        out(`physical id     : 0`),
        out(`siblings        : ${server.threads}`),
        out(`core id         : 0`),
        out(`cpu cores       : ${server.cores}`),
        out(`bogomips        : ${server.cpuBaseMhz * 2}.00`),
        out(`...(${server.threads} processors total)`),
      ],
    }
    if (path === "/proc/meminfo") return {
      lines: [
        out(`MemTotal:       ${server.ramTotalGb * 1024 * 1024} kB`),
        out(`MemFree:        ${Math.round((server.ramTotalGb - server.ramUsedGb) * 1024 * 1024)} kB`),
        out(`MemAvailable:   ${Math.round((server.ramTotalGb - server.ramUsedGb) * 1024 * 900)} kB`),
        out(`Buffers:        ${ri(100000, 500000)} kB`),
        out(`Cached:         ${ri(500000, 4000000)} kB`),
        out(`SwapTotal:      ${server.swapUsedGb > 0 ? "8388608" : "0"} kB`),
        out(`HugePages_Total: ${ri(0, 1024)}`),
      ],
    }
    return { lines: [err(`cat: ${path}: No such file or directory`)] }
  }

  if (bin === "sudo") return { lines: [err(`${server.hostname.split(".")[0]}: user root is already root`)] }
  if (bin === "kill" || bin === "killall") return { lines: [out(`kill: (${parts[1] ?? "?"}): operation permitted`)] }

  return { lines: [err(`bash: ${bin}: command not found`)] }
}

// ─── Component ────────────────────────────────────────────────────────────────

const WELCOME = (server: Server): Line[] => [
  { type: "out", text: `Connecting to root@${server.hostname}…` },
  { type: "out", text: `OpenSSH_8.9p1 Ubuntu-3ubuntu0.10, OpenSSL 3.0.2 15 Mar 2022` },
  { type: "out", text: `debug1: Authenticating to ${server.dataIp}:22 as "root"` },
  { type: "out", text: `debug1: Offering public key RSA SHA256:abc123…` },
  { type: "out", text: `Authenticated to ${server.hostname} ([${server.dataIp}]:22) using "publickey".` },
  { type: "blank", text: "" },
  { type: "out", text: `Welcome to Ubuntu ${server.os} (GNU/Linux 5.15.0-116-generic x86_64)` },
  { type: "blank", text: "" },
  { type: "out", text: `  System information as of ${new Date().toUTCString()}` },
  { type: "blank", text: "" },
  { type: "out", text: `  System load:  ${(server.cpuUtil / 25).toFixed(2)}               Processes: ${ri(150, 280)}` },
  { type: "out", text: `  Memory usage: ${Math.round((server.ramUsedGb / server.ramTotalGb) * 100)}%                IPv4: ${server.dataIp}` },
  { type: "out", text: `  Uptime:       ${server.uptimeDays} days` },
  { type: "blank", text: "" },
  { type: "out", text: `Last login: Mon Aug 17 14:20:11 2026 from 10.0.4.22` },
  { type: "blank", text: "" },
]

export function SshTerminal({ server, onClose }: { server: Server; onClose: () => void }) {
  const hostname = server.hostname.split(".")[0]
  const prompt = `root@${hostname}:~# `
  const [lines, setLines] = useState<Line[]>(WELCOME(server))
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const submit = () => {
    const cmd = input.trim()
    const newHistory = cmd ? [cmd, ...history].slice(0, 100) : history
    setHistory(newHistory)
    setHistIdx(-1)

    const cmdLine: Line = { type: "cmd", text: `${prompt}${input}` }

    if (!cmd) {
      setLines((p) => [...p, cmdLine])
      setInput("")
      return
    }

    const { lines: result, action } = handleCommand(cmd, server)

    if (action === "clear") {
      setLines([])
      setInput("")
      return
    }

    setLines((p) => [...p, cmdLine, ...result])
    setInput("")

    if (action === "exit") {
      setTimeout(onClose, 800)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { submit(); return }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      const idx = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(idx)
      setInput(history[idx] ?? "")
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      const idx = Math.max(histIdx - 1, -1)
      setHistIdx(idx)
      setInput(idx === -1 ? "" : history[idx] ?? "")
    }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setLines([]) }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault()
      setLines((p) => [...p, { type: "cmd", text: `${prompt}${input}^C` }])
      setInput("")
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const cmds = ["ls", "df -h", "free -h", "top", "ps aux", "nvidia-smi", "docker ps", "systemctl status docker", "journalctl -n 30", "ip a", "ping 8.8.8.8", "uptime", "help", "exit"]
      const match = cmds.find((c) => c.startsWith(input) && c !== input)
      if (match) setInput(match)
    }
  }

  const lineColor = (t: Line["type"]) => {
    if (t === "cmd") return "text-[#30d158]"
    if (t === "err") return "text-[#ff453a]"
    return "text-[#c7d0d8]"
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] shadow-2xl"
        style={{ height: "min(680px, 90vh)", background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)" }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Title bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 py-3" style={{ background: "#161b22" }}>
          <Terminal size={14} className="text-[#30d158]" />
          <div className="flex-1">
            <span className="font-mono text-[13px] text-[#e6edf3]">SSH — root@{server.hostname}</span>
            <span className="ml-3 font-mono text-[11px] text-[#8b949e]">{server.dataIp}:22 · CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#30d158] shadow-[0_0_6px_#30d158]" />
            <span className="font-mono text-[10px] text-[#8b949e]">Encrypted</span>
          </div>
          <button onClick={onClose} className="ml-2 rounded-md p-1 text-[#8b949e] hover:bg-white/10 hover:text-[#e6edf3] transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Output */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide">
          <div className="space-y-0.5">
            {lines.map((l, i) => (
              <div key={i} className={`font-mono text-[12px] leading-[1.6] whitespace-pre-wrap break-all ${lineColor(l.type)}`}>
                {l.text || " "}
              </div>
            ))}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex shrink-0 items-center gap-0 border-t border-white/[0.07] px-5 py-3">
          <span className="font-mono text-[12px] text-[#30d158] whitespace-nowrap">{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-[#e6edf3] outline-none caret-[#30d158]"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  )
}
