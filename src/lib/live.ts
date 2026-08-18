import { useEffect, useRef, useState } from "react"

// Rolling time-series that ticks every `ms`, seeded around `base` with drift.
export function useSeries(base: number, spread: number, length = 40, ms = 2000) {
  const [data, setData] = useState<{ t: number; v: number }[]>(() =>
    Array.from({ length }, (_, i) => ({
      t: i,
      v: clamp(base + (Math.random() - 0.5) * spread),
    })),
  )
  const last = useRef(base)
  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => {
        const drift = (Math.random() - 0.5) * spread * 0.5
        const next = clamp(last.current + drift, 0, base * 1.6 + spread)
        last.current = next
        const t = (prev[prev.length - 1]?.t ?? 0) + 1
        return [...prev.slice(1), { t, v: Number(next.toFixed(1)) }]
      })
    }, ms)
    return () => clearInterval(id)
  }, [base, spread, ms])
  return data
}

// A single jittering value.
export function usePulse(base: number, spread: number, ms = 2000, max = Infinity) {
  const [v, setV] = useState(base)
  useEffect(() => {
    const id = setInterval(() => {
      setV((p) => Number(clamp(p + (Math.random() - 0.5) * spread, 0, max).toFixed(1)))
    }, ms)
    return () => clearInterval(id)
  }, [base, spread, ms, max])
  return v
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}
