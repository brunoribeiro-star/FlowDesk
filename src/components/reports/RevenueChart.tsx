import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface RevenueMensal {
  mes: string;
  ano: number;
  mes_num: number;
  valor_recebido: number;
  valor_pendente: number;
  repasses_colaboradores: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
}

interface Props {
  data: RevenueMensal[];
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CustomTooltip({ active, payload, label, activeKey }: any) {
  if (!active || !payload?.length) return null;
  const filtered = activeKey
    ? payload.filter((p: any) => p.dataKey === activeKey)
    : payload;
  if (!filtered.length) return null;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-[12px] px-4 py-3 text-[13px] shadow-xl">
      <div className="text-gray-300 font-medium mb-2">{label}</div>
      {filtered.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="text-gray-200 font-medium">{toCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

const LEGEND_ITEMS = [
  {
    label: "A receber (previsto)",
    borderStyle: "dashed",
    color: "var(--gray-400)",
    strokeWidth: 2.5,
  },
  {
    label: "Bruto recebido",
    borderStyle: "solid",
    color: "var(--primary-500)",
    strokeWidth: 3.5,
  },
  {
    label: "Líquido (após repasses)",
    borderStyle: "solid",
    color: "var(--primary-300)",
    strokeWidth: 3,
  },
];

export default function RevenueChart({ data }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const yMax = useMemo(() => {
    if (!data.length) return 10000;
    const maxVal = Math.max(...data.flatMap((d) => [d.valor_recebido, d.faturamento_liquido]));
    if (maxVal === 0) return 1000;
    return Math.ceil((maxVal * 1.2) / 1000) * 1000;
  }, [data]);

  const handleMouseMove = (chartData: any) => {
    if (!chartData?.activeCoordinate || !chartData?.activePayload?.length) return;

    const cursorY = chartData.activeCoordinate.y;
    const payload = chartData.activePayload;
    const plotTop = 4;
    const plotHeight = 258;

    let minDist = Infinity;
    let closest = "";

    payload.forEach((p: any) => {
      if (p.value === undefined || p.value === null) return;
      const pixY = plotTop + (1 - Math.max(0, p.value) / yMax) * plotHeight;
      const dist = Math.abs(cursorY - pixY);
      if (dist < minDist) {
        minDist = dist;
        closest = p.dataKey;
      }
    });

    setActiveKey(closest || null);
  };

  const formatYAxis = (v: number) => {
    if (v === 0) return "R$ 0";
    if (v >= 1000)
      return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
    return `R$ ${v}`;
  };

  return (
    <div>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setActiveKey(null)}
          >
            <defs>
              <linearGradient id="gradBruto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.26} />
                <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="4 6" stroke="rgba(148,169,173,0.12)" vertical={false} />

            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--gray-400)", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: "var(--gray-500)", fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />

            <Tooltip
              content={(props: any) => <CustomTooltip {...props} activeKey={activeKey} />}
              wrapperStyle={{ zIndex: 50 }}
            />

            <Area
              type="monotone"
              dataKey="valor_pendente"
              name="A receber (previsto)"
              stroke="var(--gray-400)"
              strokeWidth={2.5}
              strokeDasharray="3 7"
              fill="none"
              dot={false}
              activeDot={{ r: 3, fill: "var(--gray-400)" }}
            />

            <Area
              type="monotone"
              dataKey="faturamento_liquido"
              name="Líquido (após repasses)"
              stroke="var(--primary-300)"
              strokeWidth={3}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary-300)" }}
            />

            <Area
              type="monotone"
              dataKey="valor_recebido"
              name="Bruto recebido"
              stroke="var(--primary-500)"
              strokeWidth={3.5}
              fill="url(#gradBruto)"
              dot={false}
              activeDot={{ r: 5, fill: "var(--primary-500)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-[30px] mt-[14px] flex-wrap">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-[9px] text-[14.5px] text-gray-300">
            <span
              style={{
                display: "inline-block",
                width: 26,
                height: 0,
                borderTopWidth: item.strokeWidth,
                borderTopStyle: item.borderStyle as any,
                borderTopColor: item.color,
                borderRadius: 3,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
