import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-lg px-4 py-3 text-[13px] shadow-xl">
      <div className="text-gray-300 font-medium mb-2">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
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

export default function RevenueChart({ data }: Props) {
  const formatYAxis = (v: number) => {
    if (v === 0) return "R$ 0";
    if (v >= 1000)
      return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
    return `R$ ${v}`;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradLiquido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPendente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />

          <XAxis
            dataKey="mes"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            formatter={(value) => (
              <span style={{ color: "#d1d5db", fontSize: 12 }}>{value}</span>
            )}
          />

          <Area
            type="monotone"
            dataKey="faturamento_liquido"
            name="Líquido (após repasses)"
            stroke="var(--primary-500)"
            strokeWidth={2}
            fill="url(#gradLiquido)"
            dot={false}
            activeDot={{ r: 4, fill: "var(--primary-500)" }}
          />

          <Area
            type="monotone"
            dataKey="valor_recebido"
            name="Bruto recebido"
            stroke="#60a5fa"
            strokeWidth={2}
            fill="none"
            dot={false}
            activeDot={{ r: 4, fill: "#60a5fa" }}
          />

          <Area
            type="monotone"
            dataKey="valor_pendente"
            name="A receber (previsto)"
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#gradPendente)"
            dot={false}
            activeDot={{ r: 3, fill: "#9ca3af" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
