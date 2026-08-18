import {
  LayoutDashboard,
  Server,
  Bell,
  CalendarClock,
  Cpu,
  Terminal,
  ShieldCheck,
  Layers,
  Globe,
  PlaySquare,
} from "lucide-react"
import { fleetSummary } from "../data/fleet"
import avatarUrl from "../imports/269__2_.png"
import logoUrl from "../imports/Subtract.png"

export type View =
  | "overview"
  | "racks"
  | "alerts"
  | "reservations"
  | "processes"
  | "automation"
  | "audit"
  | "services"
  | "remote"
  | "network"

const items: { key: View; label: string; icon: typeof Server; hint?: string }[] = [
  { key: "overview", label: "개요", icon: LayoutDashboard },
  { key: "racks", label: "인프라 랙 맵", icon: Server },
  { key: "alerts", label: "알림", icon: Bell },
  { key: "reservations", label: "자원 예약", icon: CalendarClock },
  { key: "processes", label: "프로세스 / 컨테이너", icon: Cpu },
  { key: "automation", label: "자동화 배포", icon: Terminal },
  { key: "services", label: "서비스 관리", icon: Layers },
  { key: "remote", label: "원격 실행", icon: PlaySquare },
  { key: "network", label: "네트워크", icon: Globe },
  { key: "audit", label: "권한 · 감사 로그", icon: ShieldCheck },
]

export function Sidebar({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  const s = fleetSummary()
  return (
    <aside className="glass-strong sticky top-4 flex h-[calc(100vh-2rem)] w-[252px] shrink-0 flex-col rounded-[26px] px-3.5 py-5">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#1d1d1f]"
          style={{ boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.2), 0 4px 12px -4px rgba(0,0,0,0.4)" }}
        >
          <img src={logoUrl} alt="SNDT Fleet" className="h-5 w-5 object-contain" />
        </div>
        <div>
          <div className="text-[14px] font-semibold leading-none tracking-tight">SNDT Fleet</div>
          <div className="mt-1.5 text-[10px] tracking-[0.02em] text-[var(--color-ink-faint)]">
            NOC Console
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto flex-1 scrollbar-hide">
        {items.map((it) => {
          const active = view === it.key
          const Icon = it.icon
          const badge =
            it.key === "alerts" ? s.by.err + s.by.warn : undefined
          return (
            <button
              key={it.key}
              onClick={() => onNav(it.key)}
              className={`group relative flex items-center gap-3 rounded-[14px] px-3 py-2 text-left text-[13px] transition-all duration-200 ${
                active
                  ? "glass-thin text-[var(--color-ink)] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.25)]"
                  : "text-[var(--color-ink-dim)] hover:bg-black/[0.04] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon
                size={16}
                className={active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-faint)] group-hover:text-[var(--color-ink-dim)]"}
              />
              <span className="flex-1">{it.label}</span>
              {badge ? (
                <span className="rounded-full bg-[var(--color-err)]/18 px-1.5 py-0.5 font-mono text-[9px] font-medium text-[var(--color-err)]">
                  {badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-3 space-y-3 shrink-0">
        <div className="glass-thin rounded-[17px] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              Fleet Health
            </span>
            <span className="tabular text-[11px] text-[var(--color-ink-dim)]">{s.total} nodes</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full">
            <div style={{ flex: s.by.ok, background: "var(--color-ok)" }} />
            <div style={{ flex: s.by.warn, background: "var(--color-warn)" }} />
            <div style={{ flex: s.by.err, background: "var(--color-err)" }} />
            <div style={{ flex: s.by.off, background: "var(--color-off)" }} />
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1 font-mono text-[10px]">
            <span className="text-[var(--color-ok)]">●{s.by.ok}</span>
            <span className="text-[var(--color-warn)]">●{s.by.warn}</span>
            <span className="text-[var(--color-err)]">●{s.by.err}</span>
            <span className="text-[var(--color-off)]">●{s.by.off}</span>
          </div>
        </div>
        <div className="glass-thin flex items-center gap-2.5 rounded-full p-1.5 pr-4">
          <img
            src={avatarUrl}
            alt="Baekseol"
            className="h-9 w-9 shrink-0 rounded-full border border-black/10 bg-white object-cover"
          />
          <div className="leading-tight">
            <div className="text-[12px]">Baekseol</div>
            <div className="font-mono text-[9px] text-[var(--color-ink-faint)]">Administrator</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
