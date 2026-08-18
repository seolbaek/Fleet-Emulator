import type { ReactNode } from "react"
import type { Status } from "../data/fleet"
import { statusColor } from "../data/fleet"

export function StatusDot({ status, size = 8, pulse = false }: { status: Status; size?: number; pulse?: boolean }) {
  const c = statusColor[status]
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulse && status !== "off" && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ backgroundColor: c }}
        />
      )}
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: c, boxShadow: `0 0 10px ${c}, 0 0 3px ${c}` }}
      />
    </span>
  )
}

export function Panel({
  children,
  className = "",
  hover = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`glass rounded-[22px] ${hover ? "glass-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-[-0.01em] text-[var(--color-ink-faint)]">
      {children}
    </span>
  )
}

export function Bar({ pct, tone = "accent", height = 7 }: { pct: number; tone?: string; height?: number }) {
  const color =
    tone === "accent"
      ? "var(--color-accent)"
      : tone === "warn"
        ? "var(--color-warn)"
        : tone === "err"
          ? "var(--color-err)"
          : tone === "ok"
            ? "var(--color-ok)"
            : tone
  return (
    <div className="w-full overflow-hidden rounded-full bg-black/[0.05]" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
      />
    </div>
  )
}

export function Ring({ pct, label, sub, tone }: { pct: number; label: string; sub: string; tone?: string }) {
  const r = 34
  const c = 2 * Math.PI * r
  const color =
    tone ??
    (pct > 90 ? "var(--color-err)" : pct > 75 ? "var(--color-warn)" : "var(--color-accent)")
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: 96, height: 96 }}>
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="5" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * Math.min(100, pct)) / 100}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-[22px] font-semibold tracking-tight">{Math.round(pct)}</span>
          <span className="text-[10px] text-[var(--color-ink-faint)]">%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[12px] font-medium text-[var(--color-ink)]">{label}</div>
        <div className="font-mono text-[10px] text-[var(--color-ink-faint)]">{sub}</div>
      </div>
    </div>
  )
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  const map: Record<string, string> = {
    ok: "text-[var(--color-ok)] border-[var(--color-ok)]/25 bg-[var(--color-ok)]/12",
    warn: "text-[var(--color-warn)] border-[var(--color-warn)]/25 bg-[var(--color-warn)]/12",
    err: "text-[var(--color-err)] border-[var(--color-err)]/25 bg-[var(--color-err)]/12",
    off: "text-[var(--color-off)] border-black/10 bg-black/[0.04]",
    accent: "text-[var(--color-accent)] border-[var(--color-accent)]/25 bg-[var(--color-accent)]/12",
    muted: "text-[var(--color-ink-dim)] border-black/10 bg-black/[0.04]",
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-wider ${map[tone] ?? map.muted}`}
    >
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="glass-thin inline-flex gap-1 rounded-full p-1">
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)] hover:text-[var(--color-ink-dim)]"
            }`}
          >
            {active && (
              <span className="absolute inset-0 rounded-full bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)" }} />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
