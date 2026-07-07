import { TrendingUp, TrendingDown, FolderKanban, CheckCircle2, Clock, Timer } from "lucide-react";

export interface OverviewData {
  valor_recebido: number;
  valor_pendente: number;
  repasses_colaboradores: number;
  faturamento_bruto: number;
  faturamento_liquido: number;

  projetos_ativos: number;
  projetos_finalizados: number;
  projetos_total: number;

  tempo_ciclo_medio_projeto_dias: number | null;

  tempo_execucao_medio_projeto_horas: number | null;
  tempo_execucao_medio_tarefa_horas: number | null;

  _meta: {
    projetos_com_ciclo_completo: number;
    projetos_com_rastreio: number;
    tarefas_com_rastreio: number;
  };
}

interface Props {
  data: OverviewData;
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDias(v: number | null) {
  if (v === null) return "—";
  if (v < 1) return "< 1 dia";
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

function fmtHoras(v: number | null) {
  if (v === null) return "—";
  if (v < 1) return `${Math.round(v * 60)} min`;
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

export default function OverviewCards({ data }: Props) {
  const cards = [
    {
      icon: TrendingUp,
      label: "Valor recebido",
      tooltip: 'Soma dos pagamentos com status "pago"',
      value: toCurrency(data.valor_recebido),
      sublabel: `${toCurrency(data.valor_pendente)} a receber`,
      muted: false,
    },
    {
      icon: TrendingDown,
      label: "Faturamento líquido",
      tooltip: "Valor recebido menos repasses pagos a colaboradores",
      value: toCurrency(data.faturamento_liquido),
      sublabel: `${toCurrency(data.repasses_colaboradores)} em repasses pagos`,
      muted: false,
    },
    {
      icon: FolderKanban,
      label: "Projetos ativos",
      tooltip: "Projetos que não estão concluídos, finalizados ou arquivados",
      value: String(data.projetos_ativos),
      sublabel: `${data.projetos_total} no total`,
      muted: false,
    },
    {
      icon: CheckCircle2,
      label: "Projetos finalizados",
      tooltip: 'Projetos com status "concluído" ou "finalizado"',
      value: String(data.projetos_finalizados),
      sublabel:
        data._meta.projetos_com_ciclo_completo > 0
          ? `ciclo médio: ${fmtDias(data.tempo_ciclo_medio_projeto_dias)}`
          : "conclua projetos para ver o ciclo médio",
      muted: false,
    },
    {
      icon: Clock,
      label: "Ciclo médio de projeto",
      tooltip:
        "Dias corridos desde criação até conclusão (inclui fins de semana e espera). Fonte: completed_at − data_inicio.",
      value: fmtDias(data.tempo_ciclo_medio_projeto_dias),
      sublabel:
        data._meta.projetos_com_ciclo_completo > 0
          ? `${data._meta.projetos_com_ciclo_completo} proj. com dado completo`
          : "conclua projetos para calcular",
      muted: false,
    },
    {
      icon: Timer,
      label: "Execução média / tarefa",
      tooltip:
        "Horas efetivamente rastreadas por tarefa via time tracker. Fonte: time_entries.",
      value: fmtHoras(data.tempo_execucao_medio_tarefa_horas),
      sublabel:
        data._meta.tarefas_com_rastreio > 0
          ? `${data._meta.tarefas_com_rastreio} tarefa(s) com rastreio`
          : "use o time tracker para calcular",
      muted: data.tempo_execucao_medio_tarefa_horas === null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
      {cards.map((card) => (
        <div
          key={card.label}
          title={card.tooltip}
          className="flex flex-col p-[24px_26px] rounded-[18px] bg-primary-800 border border-primary-700 hover:border-primary-600 hover:-translate-y-0.5 transition-all duration-200 cursor-default"
        >
          <div className="flex items-center gap-[11px] mb-[18px]">
            <span
              className={[
                "w-[38px] h-[38px] rounded-[11px] flex-none flex items-center justify-center border",
                card.muted
                  ? "text-gray-400 border-primary-700"
                  : "text-primary-400 border-primary-600",
              ].join(" ")}
              style={{
                background: card.muted
                  ? "color-mix(in srgb, var(--gray-400) 7%, transparent)"
                  : "color-mix(in srgb, var(--primary-500) 10%, transparent)",
              }}
            >
              <card.icon size={20} />
            </span>
            <span className="text-[15px] font-medium text-gray-300">{card.label}</span>
          </div>
          <p
            className={[
              "text-[33px] font-bold leading-[1.1] tracking-tight m-0",
              card.muted ? "text-gray-500" : "text-gray-100",
            ].join(" ")}
          >
            {card.value}
          </p>
          <p className="text-[13.5px] text-gray-500 mt-[9px] m-0">{card.sublabel}</p>
        </div>
      ))}
    </div>
  );
}
