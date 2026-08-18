---

직원용 AI 서버의 GPU를 **Tesla V100 32GB ×2 (총 64GB VRAM)** 구성으로 확정하고, 네가 개발할 서버 관리 프로그램(Monitoring Agent / Dashboard)에서 CPU-Z / HWiNFO 수준으로 읽어와 화면에 바인딩할 수 있는 **상세 시스템 사양 규격서**를 정리했어.

V100 32GB는 Volta 아키텍처 기반의 **640개 Tensor Cores**와 **1.1 TB/s HBM2 메모리**를 갖추고 있어, 최신 PyTorch, vLLM, FlashAttention 등 대부분의 딥러닝/LLM 라이브러리를 완전하게 지원해.

---

## 🟢 1. 직원용 AI 서버 (EMP-01 ~ EMP-15) — 총 15대

> **역할**: 직원 개인별 LLM 파인튜닝/추론, 이미지/음성 AI, 딥러닝 연구개발용 전용 서버

```text
================================================================================
[EMPLOYEE AI SERVER (2U Rackmount)] - 15 Units
================================================================================

[CPU - Central Processing Unit]
  Processor Name       : AMD EPYC 7302P
  Code Name            : Rome (Zen 2)
  Socket               : SP3
  Process Node         : 7 nm (TSMC)
  Cores / Threads      : 16 Cores / 32 Threads
  Base Clock           : 3000 MHz
  Boost Clock          : 3300 MHz
  L1 Cache             : 1 MB (32 KB I + 32 KB D per core)
  L2 Cache             : 8 MB (512 KB per core)
  L3 Cache             : 128 MB (Shared)
  TDP / PPT            : 155 W (Default)
  Instruction Sets     : x86-64, MMX, SSE4.2, AVX, AVX2, AES, AMD-V, SHA

[MOTHERBOARD]
  Model                : Supermicro H12SSL-C
  Chipset              : AMD System-on-Chip (SoC)
  Form Factor          : ATX (12" x 9.6")
  BIOS Version / Date  : American Megatrends Inc. (AMI) / IPMI 2.0 Integrated
  PCIe Version         : PCIe 4.0 (128 Lanes)
  BMC / Controller     : ASPEED AST2500 (Dedicated 1GbE RJ45 Port)

[MEMORY - RAM]
  Total Capacity       : 64 GB
  Memory Type          : DDR4 ECC Registered RDIMM
  Module Config        : 16 GB × 4 Modules (Quad-Channel Active / Max 8 DIMM)
  Speed / Rate         : DDR4-3200 (1600 MHz Real Clock)
  Voltage              : 1.2 V
  Error Correction     : Multi-bit ECC (SECDED)

[STORAGE]
  Interface            : NVMe PCIe 4.0 x4
  Configuration        : Samsung Enterprise NVMe 1TB × 2 (M.2 2280)
  Total RAW Capacity   : 2.0 TB
  RAID Array           : Linux Software RAID 1 (mdadm) / Hardware Mirroring
  Usable Capacity      : ~1.0 TB
  Purpose              : OS (Ubuntu 24.04 LTS), Docker Data, AI Checkpoints

[GRAPHICS - GPU #0]
  Name                 : NVIDIA Tesla V100 PCIe 32GB
  Architecture         : Volta (GV100)
  CUDA Cores           : 5120
  Tensor Cores         : 640 (1st Gen)
  VRAM Capacity        : 32,768 MB (32 GB)
  VRAM Type            : HBM2
  Bus Width            : 4096-bit
  Bandwidth            : 900 GB/s ~ 1.1 TB/s
  PCIe Bus Interface   : PCIe 3.0 x16
  TDP / Power Limit    : 250 W
  Cooling Type         : Passive (Requires Chassis High-CFM Fan Airflow Shroud)

[GRAPHICS - GPU #1]
  Name                 : NVIDIA Tesla V100 PCIe 32GB
  Architecture         : Volta (GV100)
  CUDA Cores           : 5120
  Tensor Cores         : 640 (1st Gen)
  VRAM Capacity        : 32,768 MB (32 GB)
  VRAM Type            : HBM2
  Bus Width            : 4096-bit
  Bandwidth            : 900 GB/s ~ 1.1 TB/s
  PCIe Bus Interface   : PCIe 3.0 x16
  TDP / Power Limit    : 250 W
  Cooling Type         : Passive

[TOTAL GPU VRAM]
  Combined Capacity    : 64 GB VRAM (Distributed / Model Parallelism)

[NETWORK & POWER]
  Data Network         : Intel / Mellanox 10GbE SFP+ Dual Port
  Management           : Dedicated IPMI 1GbE RJ45 Port
  Power Supply Unit    : 1200W~1600W 80 PLUS Platinum Redundant (1+1 PSU)

```

---

## 🔴 2. 인프라 핵심 서버군 사양 요약

나머지 15대의 서버도 관리 프로그램에서 파싱/모니터링하기 적합하도록 CPU-Z 스타일 데이터 필드로 정리했어.

### 🎮 Game Server (GAME-01 ~ 02 / 2대)

```text
[CPU]     AMD EPYC 7313P (Milan/Zen 3) | 16C/32T | 3.0~3.7GHz | 128MB L3 | 155W
[BOARD]   Supermicro H12SSL-i (SP3 / PCIe 4.0)
[RAM]     128 GB (32GB × 4) DDR4-3200 ECC RDIMM
[SSD]     Enterprise NVMe 1.92TB × 2 (RAID 1)
[NET]     10GbE SFP+ Dual Port
[PSU]     800W Redundant (1+1)

```

### 🌐 API Server (API-01 ~ 02 / 2대)

```text
[CPU]     AMD EPYC 7313P | 16C/32T | 3.0~3.7GHz | 128MB L3 | 155W
[BOARD]   Supermicro H12SSL-i
[RAM]     64 GB (16GB × 4) DDR4-3200 ECC RDIMM
[SSD]     Enterprise NVMe 960GB × 2 (RAID 1)
[NET]     10GbE SFP+ Dual Port
[PSU]     800W Redundant (1+1)

```

### 🗄️ Database Server (DB-01 ~ 02 / 2대)

```text
[CPU]     AMD EPYC 7313P | 16C/32T | 3.0~3.7GHz | 128MB L3 | 155W
[BOARD]   Supermicro H12SSL-C (Broadcom SAS3008 Onboard HBA)
[RAM]     128 GB (32GB × 4) DDR4-3200 ECC RDIMM (최대 256GB 확장)
[SSD]     Enterprise NVMe 1.92TB × 4 (Hardware/Software RAID 10)
[NET]     25GbE SFP28 Dual Port
[PSU]     1200W Redundant (1+1)

```

### 🏆 Redis / Ranking Server (REDIS-01 / 1대)

```text
[CPU]     AMD EPYC 7313P | 16C/32T | 3.0~3.7GHz | 128MB L3 | 155W
[RAM]     128 GB (32GB × 4) DDR4-3200 ECC RDIMM
[SSD]     Enterprise NVMe 960GB × 2 (RAID 1)
[NET]     10GbE SFP+ Dual Port
[PSU]     800W Redundant (1+1)

```

### 🎵 Content Server (CONTENT-01 / 1대 - 2U)

```text
[CPU]     AMD EPYC 7313P | 16C/32T | 3.0~3.7GHz | 128MB L3 | 155W
[RAM]     128 GB (32GB × 4) DDR4-3200 ECC RDIMM
[SSD/HDD] OS: NVMe 1.92TB × 2 (RAID 1) / Data: 12-Bay Enterprise SAS HDD RAIDZ2
[NET]     25GbE SFP28 Dual Port
[PSU]     1200W Redundant (1+1)

```

### 🛠️ Git, CI/CD, Build Server (GIT-01, CI-01, BUILD-01 / 3대)

```text
[GIT-01]   Intel Xeon Silver 4310 / 64GB RAM / NVMe 1.92TB × 2 / 10GbE
[CI-01]    AMD EPYC 7313P / 128GB RAM / NVMe 1.92TB × 2 / 10GbE
[BUILD-01] AMD EPYC 7313P / 256GB RAM (32GB × 8) / Enterprise NVMe 3.84TB × 2 / 25GbE

```

### 📊 Monitoring & Backup Server (MON-01, ART-01, BACKUP-01 / 3대)

```text
[MON-01]    Intel Xeon Silver 4310 / 64GB RAM / NVMe 1.92TB × 2 / 10GbE
[ART-01]    Intel Xeon Silver 4310 / 128GB RAM / NVMe + HDD Array / 10GbE
[BACKUP-01] AMD EPYC 7313P / 128GB RAM / 24-Bay HDD Storage Array / 25GbE

```

---

## 🛠️ 서버 관리 프로그램 개발 참고 데이터 규격 (JSON 데이터 예시)

서버 관리 프로그램의 백엔드 Agent에서 Collector 스크립트(python-psutil, `nvidia-smi --query-gpu`, `lscpu`, `ipmitool` 등)가 수집하여 대시보드로 전달할 데이터 응답 객체 표준 예시야.

```json
{
  "server_id": "EMP-01",
  "hostname": "emp-gpu-node-01",
  "rack_location": "RACK-D-SLOT-01",
  "system": {
    "cpu": {
      "model": "AMD EPYC 7302P",
      "architecture": "Zen 2",
      "cores": 16,
      "threads": 32,
      "base_clock_mhz": 3000,
      "tdp_watt": 155
    },
    "memory": {
      "total_gb": 64,
      "type": "DDR4 ECC RDIMM",
      "speed_mt_s": 3200,
      "channels": 4
    },
    "gpus": [
      {
        "index": 0,
        "name": "NVIDIA Tesla V100-PCIE-32GB",
        "uuid": "GPU-xxxx-xxxx-xxxx",
        "vram_total_mb": 32768,
        "tensor_cores": 640,
        "pcie_gen": 3,
        "power_limit_watt": 250
      },
      {
        "index": 1,
        "name": "NVIDIA Tesla V100-PCIE-32GB",
        "uuid": "GPU-yyyy-yyyy-yyyy",
        "vram_total_mb": 32768,
        "tensor_cores": 640,
        "pcie_gen": 3,
        "power_limit_watt": 250
      }
    ]
  }
}

```