import { useState } from "react"
import { Search, Command } from "lucide-react"
import { Sidebar, type View } from "./components/Sidebar"
import { Overview } from "./components/Overview"
import { RackView } from "./components/RackView"
import { ServerDetail } from "./components/ServerDetail"
import { AlertsView, AuditView, AutomationView, ProcessesView, ReservationsView } from "./components/views"
import { ServiceManager } from "./components/ServiceManager"
import { RemoteExecutor } from "./components/RemoteExecutor"
import { NetworkView } from "./components/NetworkView"
import { servers } from "./data/fleet"

const titles: Record<View, string> = {
  overview: "개요",
  racks: "인프라 랙 맵",
  alerts: "알림 센터",
  reservations: "자원 예약",
  processes: "프로세스 · 컨테이너",
  automation: "자동화 · 배포",
  audit: "권한 · 감사 로그",
  services: "서비스 관리",
  remote: "원격 실행",
  network: "네트워크",
}

export default function App() {
  const [view, setView] = useState<View>("overview")
  const [openId, setOpenId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const active = openId ? servers.find((s) => s.id === openId) ?? null : null

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    const q = search.trim().toUpperCase()
    const found = servers.find(s => s.id.includes(q) || s.hostname.includes(q.toLowerCase()))
    if (found) { setOpenId(found.id); setSearch("") }
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      {/* Lit backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[560px] w-[560px] rounded-full bg-[#0071e3]/[0.12] blur-[150px]" />
        <div className="absolute right-[-10%] top-[6%] h-[460px] w-[460px] rounded-full bg-[#5e5ce6]/[0.10] blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[28%] h-[560px] w-[560px] rounded-full bg-[#34c759]/[0.07] blur-[160px]" />
      </div>

      <div className="relative flex min-h-screen gap-4 p-4">
        <Sidebar view={view} onNav={setView} />

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Toolbar */}
          <header className="glass-strong flex items-center gap-4 rounded-[24px] px-6 py-3.5">
            <div>
              <h1 className="text-[16px] font-semibold tracking-tight">{titles[view]}</h1>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-[var(--color-ink-faint)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)] shadow-[0_0_8px_var(--color-ok)]" /> agents online
                </span>
                <span>·</span>
                <span>{servers.length} nodes · 2s poll</span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="glass-thin flex w-64 items-center gap-2 rounded-full px-4 py-2 transition-colors focus-within:border-black/20">
                <Search size={14} className="text-[var(--color-ink-faint)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="서버 · 호스트 검색 ↵"
                  className="w-full bg-transparent text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none"
                />
                <kbd className="flex items-center gap-0.5 rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[9px] text-[var(--color-ink-faint)]">
                  <Command size={9} />K
                </kbd>
              </div>
              <div className="font-mono text-[11px] text-[var(--color-ink-faint)]">
                {new Date().toLocaleString("ko-KR", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
            <div key={view} className="fade-up">
              {view === "overview" && <Overview onOpen={setOpenId} />}
              {view === "racks" && <RackView onOpen={setOpenId} />}
              {view === "alerts" && <AlertsView />}
              {view === "reservations" && <ReservationsView />}
              {view === "processes" && <ProcessesView />}
              {view === "automation" && <AutomationView />}
              {view === "services" && <ServiceManager onOpen={setOpenId} />}
              {view === "remote" && <RemoteExecutor />}
              {view === "network" && <NetworkView onOpen={setOpenId} />}
              {view === "audit" && <AuditView />}
            </div>
          </div>
        </main>
      </div>

      {active && <ServerDetail server={active} onClose={() => setOpenId(null)} />}
    </div>
  )
}
