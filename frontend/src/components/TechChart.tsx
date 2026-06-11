import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import type { TechStat } from "../types";

interface Props {
  stats: TechStat[];
  loading: boolean;
  total: number;
}

const BAR_COLORS = ["#1c5d99", "#2d7ab5", "#639fab", "#7aafc0", "#4a8fbf", "#8bbfd0"];

interface TooltipPayload {
  value: number;
  name: string;
}

function CustomTooltip({ active, payload, total }: {
  active?: boolean;
  payload?: TooltipPayload[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs shadow-lg"
      style={{ background: "#222222", color: "#ffffff", border: "1px solid #1c5d99" }}
    >
      <p className="font-bold">{payload[0].name}</p>
      <p style={{ color: "#bbcde5" }}>{count} offre{count > 1 ? "s" : ""}</p>
      {total > 0 && <p style={{ color: "#639fab" }}>{pct}% des offres</p>}
    </div>
  );
}

export function TechChart({ stats, loading, total }: Props) {
  if (loading) {
    return (
      <div className="h-72 flex flex-col items-center justify-center gap-2">
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#bbcde5", borderTopColor: "#1c5d99" }}
        />
        <p className="text-xs" style={{ color: "#639fab" }}>Chargement...</p>
      </div>
    );
  }

  const data = stats
    .map((s) => ({ tech: s.tech, count: parseInt(s.count) }))
    .filter((d) => d.count > 0)
    .slice(0, 10);

  if (!data.length) {
    return (
      <div className="h-72 flex items-center justify-center text-xs" style={{ color: "#bbcde5" }}>
        Lancez le scraping pour voir les donnees
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="tech"
            width={80}
            tick={{ fontSize: 11, fill: "#639fab", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip total={total} />} cursor={{ fill: "rgba(187,205,229,0.2)" }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
            <LabelList
              dataKey="count"
              position="right"
              style={{ fill: "#1c5d99", fontSize: 11, fontWeight: 700 }}
            />
            {data.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {total > 0 && (
        <p className="text-center text-xs mt-1" style={{ color: "#bbcde5" }}>
          sur {total} offres analysees
        </p>
      )}
    </div>
  );
}
