import { servers, statusColor, statusLabel } from "../data/fleet"
import type { Server, Status } from "../data/fleet"
import { Label, Panel, StatusDot } from "./primitives"

const RACKS = ["A", "B", "C", "D", "E"]
const U = 24 // slots shown per rack

function roleAbbr(role: string) {
  return role.replace("/", "")
}

function Unit({ sv, onOpen }: { sv: Server; onOpen: (id: string) => void }) {
  const c = statusColor[sv.status]
  return (
    <button
      onClick={() => onOpen(sv.id)}
      title={`${sv.id} · ${statusLabel[sv.status]}`}
      className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-[9px] border border-black/[0.05] bg-white px-2.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:border-black/12 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      style={{ height: sv.height * 26 - 3 }}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} />
      <StatusDot status={sv.status} size={7} pulse={sv.status !== "off" && sv.status !== "ok"} />
      <span className="font-mono text-[11px] font-medium">{sv.id}</span>
      <span className="ml-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-faint)]">
        {sv.gpus.length > 0 && <span className="text-[#5e5ce6]">{sv.gpus.length}×V100</span>}
        <span>{roleAbbr(sv.role)}</span>
      </span>
    </button>
  )
}

export function RackView({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        {(["ok", "warn", "err", "off"] as Status[]).map((st) => (
          <div key={st} className="flex items-center gap-2">
            <StatusDot status={st} size={7} />
            <span className="text-[12px] text-[var(--color-ink-dim)]">{statusLabel[st]}</span>
          </div>
        ))}
        <span className="ml-auto font-mono text-[11px] text-[var(--color-ink-faint)]">
          DC-SEOUL-01 · Cold Aisle Layout · Rack A–E
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {RACKS.map((r) => {
          const inRack = servers
            .filter((s) => s.rack === r)
            .sort((a, b) => a.slotStart - b.slotStart)
          const used = inRack.reduce((a, s) => a + s.height, 0)
          return (
            <Panel key={r} className="flex flex-col p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.04] font-mono text-[11px] font-semibold">
                    {r}
                  </span>
                  <span className="text-[12px] font-medium">Rack {r}</span>
                </div>
                <Label>
                  {used}/{U}U
                </Label>
              </div>
              <div className="relative flex flex-col gap-[3px] rounded-[14px] border border-black/[0.05] bg-black/[0.035] p-1.5">
                {inRack.map((sv) => (
                  <Unit key={sv.id} sv={sv} onOpen={onOpen} />
                ))}
                {Array.from({ length: Math.max(0, U - used) }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-dashed border-black/[0.06]"
                    style={{ height: 23 }}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between px-1 font-mono text-[10px] text-[var(--color-ink-faint)]">
                <span>{inRack.length} nodes</span>
                <span>{inRack.reduce((a, s) => a + s.gpus.length, 0)} GPU</span>
              </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
