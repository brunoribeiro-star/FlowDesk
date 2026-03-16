import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface TimeByProject {
  projeto_id: string;
  titulo: string;
  horas_rastreadas: number;
  percentual: number;
}

interface Props {
  data: TimeByProject[];
  totalHoras: number;
}

const PALETTE = [
  "var(--primary-500)",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#fb7185",
  "#34d399",
  "#38bdf8",
  "#fb923c",
];

function fmtH(v: number) {
  if (v < 1) return `${Math.round(v * 60)}min`;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2.5 text-[12px] shadow-xl">
      <div className="text-gray-200 font-medium mb-1 max-w-[160px] truncate">{d.titulo}</div>
      <div className="text-gray-400">
        {fmtH(d.horas_rastreadas)}{" "}
        <span className="text-primary-300 font-semibold">· {d.percentual}%</span>
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

export default function ProjectTimeDonut({ data, totalHoras }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-[13px] text-gray-500">
        Sem dados de rastreio ainda.
      </div>
    );
  }

  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={95}
              dataKey="horas_rastreadas"
              activeShape={<ActiveShape />}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              isAnimationActive
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={PALETTE[i % PALETTE.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
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
                <div className="text-[18px] font-semibold text-gray-200 leading-tight">
                  {fmtH(active.horas_rastreadas)}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 max-w-[80px] truncate mx-auto">
                  {active.titulo}
                </div>
              </>
            ) : (
              <>
                <div className="text-[20px] font-semibold text-gray-200 leading-tight">
                  {fmtH(totalHoras)}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">total</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {data.slice(0, 6).map((item, i) => (
          <div
            key={item.projeto_id}
            className="flex items-center gap-2 text-[12px]"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{ cursor: "default" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span
              className="flex-1 truncate transition-colors"
              style={{ color: activeIndex === i ? "#e5e7eb" : "#9ca3af" }}
            >
              {item.titulo}
            </span>
            <span className="text-gray-500 tabular-nums shrink-0">
              {item.percentual}%
            </span>
          </div>
        ))}
        {data.length > 6 && (
          <div className="text-[11px] text-gray-600 pl-[18px]">
            +{data.length - 6} outros projetos
          </div>
        )}
      </div>
    </div>
  );
}
