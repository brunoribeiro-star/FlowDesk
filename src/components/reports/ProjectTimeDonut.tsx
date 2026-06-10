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
  "var(--primary-400)",
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
    <div className="bg-primary-900 border border-primary-600 rounded-[12px] px-3 py-2.5 text-[12px] shadow-xl">
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
    <div className="flex flex-col">
      <div className="relative h-[220px] mt-[18px] mb-[22px] mx-auto w-[220px]">
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
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-2">
            {active ? (
              <>
                <div className="text-[19px] font-bold text-gray-100 leading-tight tracking-tight">
                  {fmtH(active.horas_rastreadas)}
                </div>
                <div className="text-[13.5px] text-gray-400 mt-0.5 max-w-[80px] truncate mx-auto">
                  {active.titulo}
                </div>
              </>
            ) : (
              <>
                <div className="text-[19px] font-bold text-gray-100 leading-tight tracking-tight">
                  {fmtH(totalHoras)}
                </div>
                <div className="text-[13.5px] text-gray-400 mt-0.5">total</div>
              </>
            )}
          </div>
        </div>
      </div>

      <ul className="list-none m-0 p-0 border-t border-primary-700 pt-[18px] flex flex-col gap-[13px]">
        {data.slice(0, 6).map((item, i) => (
          <li
            key={item.projeto_id}
            className="flex items-center gap-[11px] text-[14.5px]"
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            style={{ cursor: "default" }}
          >
            <span
              className="w-[11px] h-[11px] rounded-[3px] flex-none"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span
              className="flex-1 truncate transition-colors"
              style={{ color: activeIndex === i ? "var(--gray-100)" : "var(--gray-200)" }}
            >
              {item.titulo}
            </span>
            <span className="text-gray-400 font-semibold tabular-nums flex-none">
              {item.percentual}%
            </span>
          </li>
        ))}
        {data.length > 6 && (
          <li className="text-[12px] text-gray-500 pl-[22px]">
            +{data.length - 6} outros projetos
          </li>
        )}
      </ul>
    </div>
  );
}
