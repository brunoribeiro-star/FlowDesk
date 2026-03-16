import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { OverviewData } from "./OverviewCards";

interface Props {
  data: OverviewData;
}

const COLORS = {
  liquido: "var(--primary-500)", 
  repasses: "#f59e0b",
  pendente: "#94a3b8",
};

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2.5 text-[12px] shadow-xl">
      <div className="text-gray-200 font-medium mb-1">{d.label}</div>
      <div>
        <span className="text-primary-300 font-semibold">{toCurrency(d.value)}</span>
        {d.pct > 0 && (
          <span className="text-gray-500 ml-1">· {d.pct}%</span>
        )}
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

export default function FinanceDonut({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.valor_recebido + data.valor_pendente;

  const slices = [
    {
      id: "liquido",
      label: "Faturamento líquido",
      value: data.faturamento_liquido,
      color: COLORS.liquido,
      pct: total > 0 ? Math.round((data.faturamento_liquido / total) * 100) : 0,
    },
    {
      id: "repasses",
      label: "Repasses a colaboradores",
      value: data.repasses_colaboradores,
      color: COLORS.repasses,
      pct: total > 0 ? Math.round((data.repasses_colaboradores / total) * 100) : 0,
    },
    {
      id: "pendente",
      label: "A receber (pendente)",
      value: data.valor_pendente,
      color: COLORS.pendente,
      pct: total > 0 ? Math.round((data.valor_pendente / total) * 100) : 0,
    },
  ].filter((s) => s.value > 0);

  if (total === 0 || slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-[13px] text-gray-500">
        Nenhum dado financeiro ainda.
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
                  key={s.id}
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
                <div className="text-[16px] font-semibold text-gray-200 leading-tight">
                  {toCurrency(active.value)}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">{active.pct}%</div>
              </>
            ) : (
              <>
                <div className="text-[17px] font-semibold text-gray-200 leading-tight">
                  {toCurrency(total)}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">total</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {slices.map((s, i) => (
          <div
            key={s.id}
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
              {toCurrency(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
