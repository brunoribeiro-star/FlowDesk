import { Clock, Timer, TrendingDown } from "lucide-react";

interface ProjetoCiclo {
  id: string;
  titulo: string;
  status: string;
  ciclo_dias: number;
  data_inicio: string;
  completed_at: string;
}

interface ProjetoExecucao {
  id: string;
  titulo: string;
  status: string;
  execucao_horas: number;
}

interface TarefaCiclo {
  id: string;
  titulo: string;
  projeto_titulo: string;
  ciclo_dias: number;
  created_at: string;
  completed_at: string;
}

interface TarefaExecucao {
  id: string;
  titulo: string;
  projeto_titulo: string;
  execucao_horas: number;
}

export interface PerformanceData {
  projetos: {
    mais_lentos_ciclo: ProjetoCiclo[];
    mais_tempo_execucao: ProjetoExecucao[];
    media_ciclo_dias: number | null;
    media_execucao_horas: number | null;
    total_com_ciclo: number;
    total_com_rastreio: number;
  };
  tarefas: {
    mais_lentas_ciclo: TarefaCiclo[];
    mais_tempo_execucao: TarefaExecucao[];
    media_ciclo_dias: number | null;
    media_execucao_horas: number | null;
    total_com_ciclo: number;
    total_com_rastreio: number;
  };
}

interface Props {
  data: PerformanceData;
}

function fmtDias(v: number | null) {
  if (v === null) return "—";
  if (v < 1) return "< 1 dia";
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}d`;
}

function fmtHoras(v: number | null) {
  if (v === null) return "—";
  if (v < 1) return `${Math.round(v * 60)}min`;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isConcluido = s === "concluído" || s === "concluido" || s === "finalizado";
  return (
    <span
      className={[
        "text-[12px] font-semibold px-3 py-[5px] rounded-full border flex-none",
        isConcluido
          ? "text-primary-300 border-primary-600"
          : "text-gray-400 border-primary-700",
      ].join(" ")}
      style={
        isConcluido
          ? { background: "color-mix(in srgb, var(--primary-500) 10%, transparent)" }
          : undefined
      }
    >
      {status}
    </span>
  );
}

function RankTable<T extends { titulo: string }>({
  rows,
  metricValue,
  subtitleKey,
}: {
  rows: T[];
  metricValue: (row: T) => string;
  subtitleKey?: (row: T) => string | undefined;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[180px] text-[15px] text-gray-500">
        Nenhum dado disponível ainda.
      </div>
    );
  }
  return (
    <ol className="list-none m-0 p-0">
      {rows.map((row, i) => (
        <li
          key={(row as any).id ?? i}
          className={[
            "flex items-center gap-[14px] py-[15px]",
            i < rows.length - 1 ? "border-b border-primary-700" : "",
          ].join(" ")}
        >
          <span className="text-[13.5px] font-semibold text-gray-500 w-[22px] flex-none text-center">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span className="text-[15.5px] font-medium text-gray-100 truncate">{row.titulo}</span>
            {subtitleKey && subtitleKey(row) && (
              <span className="text-[13px] text-gray-500 truncate">{subtitleKey(row)}</span>
            )}
          </div>
          {(row as any).status && <StatusBadge status={(row as any).status} />}
          <span className="text-[17px] font-bold text-primary-300 flex-none min-w-[56px] text-right tabular-nums">
            {metricValue(row)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RankCard({
  icon: Icon,
  title,
  tooltip,
  avg,
  avgLabel,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tooltip: string;
  avg: string;
  avgLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col p-[26px_28px] rounded-[18px] bg-primary-800 border border-primary-700">
      <div className="flex items-start justify-between gap-4">
        <h4 className="flex items-center gap-[11px] m-0 text-[18px] font-semibold text-gray-100">
          <span
            className="w-9 h-9 rounded-[10px] flex-none flex items-center justify-center border border-primary-600 text-primary-400"
            style={{ background: "color-mix(in srgb, var(--primary-500) 10%, transparent)" }}
          >
            <Icon size={19} />
          </span>
          {title}
        </h4>
        <div className="text-right flex-none">
          <span className="block text-[24px] font-bold text-gray-100 leading-tight tracking-tight">
            {avg}
          </span>
          <span className="text-[12.5px] text-gray-500">{avgLabel}</span>
        </div>
      </div>
      <p className="text-[13.5px] text-gray-500 mt-[14px] mb-[6px] leading-[1.5]">{tooltip}</p>
      {children}
    </div>
  );
}

export default function PerformanceSection({ data }: Props) {
  const { projetos, tarefas } = data;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] font-bold tracking-[0.12em] uppercase text-gray-500 mt-[28px] mb-[14px] m-0">
        Projetos
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <RankCard
          icon={Clock}
          title="Maior tempo de ciclo"
          tooltip="Dias corridos desde o início até a conclusão. Inclui fins de semana e períodos de espera."
          avg={fmtDias(projetos.media_ciclo_dias)}
          avgLabel="ciclo médio"
        >
          <RankTable
            rows={projetos.mais_lentos_ciclo}
            metricValue={(r) => fmtDias(r.ciclo_dias)}
          />
        </RankCard>

        <RankCard
          icon={Timer}
          title="Mais horas rastreadas"
          tooltip="Horas efetivamente trabalhadas via time tracker. Representa esforço real, sem contar espera."
          avg={fmtHoras(projetos.media_execucao_horas)}
          avgLabel="execução média"
        >
          <RankTable
            rows={projetos.mais_tempo_execucao}
            metricValue={(r) => fmtHoras(r.execucao_horas)}
          />
        </RankCard>
      </div>

      <p className="text-[12.5px] font-bold tracking-[0.12em] uppercase text-gray-500 mt-[28px] mb-[14px] m-0">
        Tarefas
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <RankCard
          icon={Clock}
          title="Maior tempo de ciclo"
          tooltip="Dias corridos desde a criação até a conclusão da tarefa."
          avg={fmtDias(tarefas.media_ciclo_dias)}
          avgLabel="ciclo médio"
        >
          <RankTable
            rows={tarefas.mais_lentas_ciclo}
            metricValue={(r) => fmtDias(r.ciclo_dias)}
            subtitleKey={(r) => r.projeto_titulo}
          />
        </RankCard>

        <RankCard
          icon={TrendingDown}
          title="Mais horas rastreadas"
          tooltip="Horas rastreadas por tarefa via time tracker."
          avg={fmtHoras(tarefas.media_execucao_horas)}
          avgLabel="execução média"
        >
          <RankTable
            rows={tarefas.mais_tempo_execucao}
            metricValue={(r) => fmtHoras(r.execucao_horas)}
            subtitleKey={(r) => r.projeto_titulo}
          />
        </RankCard>
      </div>
    </div>
  );
}
