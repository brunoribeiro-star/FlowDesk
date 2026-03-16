import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ProjectForStatus {
  id: string;
  status: string;
}

interface Props {
  projects: ProjectForStatus[];
}

interface StatusGroup {
  label: string;
  color: string;
  matches: string[];
}

const STATUS_GROUPS: StatusGroup[] = [
  {
    label: "Fazendo",
    color: "var(--primary-500)",
    matches: ["fazendo", "em andamento"],
  },
  {
    label: "Para fazer",
    color: "#60a5fa",
    matches: ["para fazer"],
  },
  {
    label: "Pausado / Pgto pendente",
    color: "#f59e0b",
    matches: ["pausado", "pgto pendente"],
  },
  {
    label: "Concluído",
    color: "#34d399",
    matches: ["concluído", "concluido", "finalizado"],
  },
  {
    label: "Arquivado",
    color: "#94a3b8",
    matches: ["arquivado"],
  },
];

function groupProjects(projects: ProjectForStatus[]) {
  const counts: Record<string, number> = {};

  projects.forEach((p) => {
    const s = String(p.status ?? "").toLowerCase().trim();
    const group = STATUS_GROUPS.find((g) => g.matches.includes(s));
    const key = group ? group.label : "Outros";
    counts[key] = (counts[key] ?? 0) + 1;
  });

  return STATUS_GROUPS.map((g) => ({
    label: g.label,
    color: g.color,
    value: counts[g.label] ?? 0,
  }))
    .concat(
      counts["Outros"]
        ? [{ label: "Outros", color: "#374151", value: counts["Outros"] }]
        : []
    )
    .filter((s) => s.value > 0);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2.5 text-[12px] shadow-xl">
      <div className="text-gray-200 font-medium mb-1">{d.label}</div>
      <div>
        <span className="text-primary-300 font-semibold">
          {d.value} projeto{d.value !== 1 ? "s" : ""}
        </span>
        {d.pct > 0 && <span className="text-gray-500 ml-1">· {d.pct}%</span>}
      </div>
    </div>
  );
}

function ActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius - 3}
      outerRadius={outerRadius + 7}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      style={{ filter: "brightness(1.15)" }}
    />
  );
}

export default function ProjectStatusDonut({ projects }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const slices = useMemo(() => {
    const groups = groupProjects(projects);
    const total = groups.reduce((acc, g) => acc + g.value, 0);
    return groups.map((g) => ({
      ...g,
      pct: total > 0 ? Math.round((g.value / total) * 100) : 0,
    }));
  }, [projects]);

  const total = projects.length;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-[13px] text-gray-500">
        Nenhum projeto criado ainda.
      </div>
    );
  }

  const active = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={95}
              dataKey="value"
              activeShape={<ActiveShape />}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
              strokeWidth={0}
            >
              {slices.map((s, i) => (
                <Cell
                  key={s.label}
                  fill={s.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                  style={{ outline: "none", cursor: "pointer" }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-2">
            {active ? (
              <>
                <div className="text-[20px] font-semibold text-gray-200 leading-tight">
                  {active.value}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 max-w-[80px] truncate mx-auto">
                  {active.label}
                </div>
              </>
            ) : (
              <>
                <div className="text-[20px] font-semibold text-gray-200 leading-tight">
                  {total}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  projeto{total !== 1 ? "s" : ""}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {slices.map((s, i) => (
          <div
            key={s.label}
            className="flex items-center gap-2 text-[12px]"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{ cursor: "default" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: s.color }}
            />
            <span
              className="flex-1 transition-colors"
              style={{ color: activeIndex === i ? "#e5e7eb" : "#9ca3af" }}
            >
              {s.label}
            </span>
            <span className="text-gray-500 tabular-nums shrink-0">
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
