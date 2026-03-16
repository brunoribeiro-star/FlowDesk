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
      className={`text-[11px] px-2 py-0.5 rounded-full border ${
        isConcluido
          ? "bg-primary-700 border-primary-600 text-primary-200"
          : "bg-primary-800 border-primary-700 text-gray-400"
      }`}
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
      <div className="py-6 text-center text-[13px] text-gray-500">Nenhum dado disponível ainda.</div>
    );
  }
  return (
    <div className="flex flex-col divide-y divide-primary-700">
      {rows.map((row, i) => (
        <div key={(row as any).id ?? i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="text-[12px] text-gray-500 w-5 shrink-0 text-right">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-gray-200 truncate">{row.titulo}</div>
            {subtitleKey && subtitleKey(row) && (
              <div className="text-[11px] text-gray-500 truncate">{subtitleKey(row)}</div>
            )}
          </div>
          {(row as any).status && <StatusBadge status={(row as any).status} />}
          <span className="text-[13px] font-semibold text-primary-300 shrink-0 tabular-nums">
            {metricValue(row)}
          </span>
        </div>
      ))}
    </div>
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
    <div className="flex flex-col gap-4 p-5 rounded-lg bg-primary-800 border border-primary-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-primary-400 shrink-0" />
          <span className="text-[14px] font-medium text-gray-200">{title}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[18px] font-semibold text-gray-200">{avg}</div>
          <div className="text-[11px] text-gray-500">{avgLabel}</div>
        </div>
      </div>
      <div title={tooltip} className="text-[11px] text-gray-500 -mt-2">
        {tooltip}
      </div>
      {children}
    </div>
  );
}

export default function PerformanceSection({ data }: Props) {
  const { projetos, tarefas } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wide">
        Projetos
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wide mt-2">
        Tarefas
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
