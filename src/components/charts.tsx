import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"

export function MiniArea({
  data,
  color = "var(--color-accent)",
  unit = "",
  height = 64,
  domainMax,
}: {
  data: { t: number; v: number }[]
  color?: string
  unit?: string
  height?: number
  domainMax?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <YAxis hide domain={[0, domainMax ?? "auto"]} />
        <Tooltip
          cursor={{ stroke: "rgba(0,0,0,0.14)" }}
          contentStyle={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "0.5px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 500,
            boxShadow: "0 8px 24px -8px rgba(0,0,0,0.2)",
            padding: "6px 10px",
          }}
          labelStyle={{ display: "none" }}
          itemStyle={{ color: "#1d1d1f" }}
          formatter={(v) => [`${v}${unit}`, ""]}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.6}
          fill={color}
          fillOpacity={0.1}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
