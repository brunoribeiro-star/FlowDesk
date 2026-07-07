"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import HeaderProfile from "@/components/HeaderProfile";
import { SkeletonStatCard } from "@/components/Skeleton";
import OverviewCards, { OverviewData } from "@/components/reports/OverviewCards";
import type { RevenueMensal } from "@/components/reports/RevenueChart";
import type { PerformanceData } from "@/components/reports/PerformanceSection";
import type { TimeByProject } from "@/components/reports/ProjectTimeDonut";
import type { ProjectForStatus } from "@/components/reports/ProjectStatusDonut";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import type { ReportPeriod } from "@/lib/reportUtils";
import { BarChart3, RefreshCw, AlertCircle, Lock, Zap, ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useSubscription } from "@/hooks/useSubscription";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const RELATORIOS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo aos Relatórios!", content: "Aqui você visualiza o desempenho do seu negócio com gráficos e métricas geradas automaticamente a partir dos seus projetos, tarefas e pagamentos." },
  { target: "body", placement: "center", skipBeacon: true, title: "Tipos de relatórios", content: "Overview: visão geral do mês. Performance: entregas e prazos. Produtividade: horas trabalhadas por projeto. Comparação: projetos lado a lado. Receita: entradas financeiras." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dados em tempo real", content: "Os relatórios são atualizados automaticamente conforme você registra pagamentos, conclui tarefas e encerra projetos. Não precisa inserir nada manualmente." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dica de uso", content: "Acompanhe os relatórios semanalmente para identificar quais tipos de projeto são mais lucrativos, onde você gasta mais tempo e como otimizar sua agenda." },
];

const RevenueChart = dynamic(() => import("@/components/reports/RevenueChart"), {
  ssr: false,
  loading: () => (
    <div className="h-72 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  ),
});

const DistributionSection = dynamic(
  () => import("@/components/reports/DistributionSection"),
  { ssr: false }
);

const PerformanceSection = dynamic(
  () => import("@/components/reports/PerformanceSection"),
  { ssr: false }
);

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "30d",  label: "30 dias" },
  { value: "90d",  label: "90 dias" },
  { value: "180d", label: "6 meses" },
  { value: "365d", label: "1 ano" },
  { value: "all",  label: "Tudo" },
];

interface RevenueTotais {
  valor_recebido: number;
  valor_pendente: number;
  repasses_colaboradores: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchWithAuth(path: string, token: string) {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  return res.json();
}

export default function RelatoriosPage() {
  const { user: authUser } = useAuth();
  const router = useRouter();
  const subscription = useSubscription();

  const [period, setPeriod] = useState<ReportPeriod>("365d");
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueMensal[]>([]);
  const [revenueTotais, setRevenueTotais] = useState<RevenueTotais | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [timeByProject, setTimeByProject] = useState<TimeByProject[]>([]);
  const [totalHorasRastreadas, setTotalHorasRastreadas] = useState(0);
  const [projectsForStatus, setProjectsForStatus] = useState<ProjectForStatus[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [loadingProductivity, setLoadingProductivity] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(true);

  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorRevenue, setErrorRevenue] = useState<string | null>(null);
  const [errorPerformance, setErrorPerformance] = useState<string | null>(null);
  const [errorProductivity, setErrorProductivity] = useState<string | null>(null);
  const [errorComparison, setErrorComparison] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!authUser) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const qs = `?period=${period}`;

    setLoadingOverview(true);
    setErrorOverview(null);
    fetchWithAuth(`/api/reports/overview${qs}`, token)
      .then((data) => setOverviewData(data))
      .catch((err) => setErrorOverview(err.message ?? "Erro ao carregar visão geral"))
      .finally(() => setLoadingOverview(false));

    setLoadingRevenue(true);
    setErrorRevenue(null);
    fetchWithAuth(`/api/reports/revenue${qs}`, token)
      .then((data) => {
        setRevenueData(data.mensal ?? []);
        setRevenueTotais(data.totais ?? null);
      })
      .catch((err) => setErrorRevenue(err.message ?? "Erro ao carregar faturamento"))
      .finally(() => setLoadingRevenue(false));

    setLoadingPerformance(true);
    setErrorPerformance(null);
    fetchWithAuth(`/api/reports/performance${qs}`, token)
      .then((data) => setPerformanceData(data))
      .catch((err) => setErrorPerformance(err.message ?? "Erro ao carregar performance"))
      .finally(() => setLoadingPerformance(false));

    setLoadingProductivity(true);
    setErrorProductivity(null);
    fetchWithAuth(`/api/reports/productivity${qs}`, token)
      .then((data) => {
        setTimeByProject(data.distribuicao_por_projeto ?? []);
        setTotalHorasRastreadas(data.total_horas_rastreadas ?? 0);
      })
      .catch((err) => setErrorProductivity(err.message ?? "Erro ao carregar produtividade"))
      .finally(() => setLoadingProductivity(false));

    setLoadingComparison(true);
    setErrorComparison(null);
    fetchWithAuth(`/api/reports/projects-comparison${qs}`, token)
      .then((comparison) => {
        setProjectsForStatus(
          (comparison.projetos ?? []).map((p: any) => ({
            id: p.id,
            status: p.status,
          }))
        );
      })
      .catch((err) => setErrorComparison(err.message ?? "Erro ao carregar projetos"))
      .finally(() => setLoadingComparison(false));
  }, [authUser, period]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const isLoading =
    loadingOverview ||
    loadingRevenue ||
    loadingPerformance ||
    loadingProductivity ||
    loadingComparison;

  return (
    <>
      <PageTour name="relatorios" steps={RELATORIOS_TOUR_STEPS} />

      <div className="flex flex-col flex-1 gap-6 sm:gap-[38px] px-4 sm:px-6 lg:pl-0 lg:pr-6 py-4 sm:py-6 overflow-y-auto overflow-x-hidden min-w-0">

        <header className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="grid place-items-center flex-none cursor-pointer transition-colors duration-200"
                style={{ width: 46, height: 46, borderRadius: 13, border: "1px solid var(--gray-700)", background: "var(--primary-800)", color: "var(--gray-200)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--primary-500)"; (e.currentTarget as HTMLElement).style.color = "var(--primary-300)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-700)"; (e.currentTarget as HTMLElement).style.color = "var(--gray-200)"; }}
              >
                <ArrowLeft size={18} />
              </button>
              <span
                className="w-[42px] h-[42px] sm:w-[52px] sm:h-[52px] rounded-[15px] flex-none flex items-center justify-center border border-primary-600 text-primary-400"
                style={{ background: "color-mix(in srgb, var(--primary-500) 10%, transparent)" }}
              >
                <BarChart3 size={22} className="sm:hidden" />
                <BarChart3 size={26} className="hidden sm:block" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-gray-100 leading-tight tracking-tight m-0 truncate">
                  Relatórios
                </h1>
                <p className="text-[13px] sm:text-[15.5px] text-gray-400 mt-1 m-0 truncate">
                  Métricas e desempenho do seu trabalho
                </p>
              </div>
            </div>

            <div className="lg:hidden shrink-0">
              <HeaderProfile />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-[14px]">
            <div className="flex items-center gap-[2px] rounded-[14px] bg-primary-800 border border-primary-700 p-[5px] overflow-x-auto flex-1 lg:flex-none">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className="px-[14px] sm:px-[18px] py-[10px] rounded-[10px] text-[13.5px] sm:text-[14.5px] font-semibold transition-colors whitespace-nowrap shrink-0"
                  style={
                    period === p.value
                      ? {
                          background: "linear-gradient(135deg, var(--primary-300), var(--primary-500))",
                          color: "var(--primary-900)",
                          boxShadow: "0 6px 16px -8px rgba(30,182,232,0.8)",
                        }
                      : { color: "var(--gray-400)" }
                  }
                  onMouseEnter={(e) => {
                    if (period !== p.value) {
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-200)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (period !== p.value) {
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--gray-400)";
                    }
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="flex items-center gap-[9px] h-[46px] sm:h-[52px] px-4 sm:px-5 rounded-[14px] bg-primary-800 border border-primary-700 text-gray-100 text-[14px] sm:text-[15px] font-semibold transition-colors hover:border-primary-600 hover:text-primary-200 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw size={18} className={["text-primary-400", isLoading ? "animate-spin" : ""].join(" ")} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <div className="hidden lg:block">
              <HeaderProfile />
            </div>
          </div>
        </header>

        {!subscription.loading && !subscription.limits.relatoriosCompletos && (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-primary-800 border border-primary-700 flex items-center justify-center">
              <Lock size={26} className="text-primary-400" />
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-gray-100 mb-2">Relatórios completos</h3>
              <p className="text-[14px] text-gray-400 max-w-sm leading-relaxed">
                Acesse métricas detalhadas, faturamento e análise de desempenho com o plano Profissional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/configuracoes?tab=assinatura")}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl text-[14px] transition-colors"
            >
              <Zap size={15} />
              Ver planos
            </button>
          </div>
        )}

        {(subscription.loading || subscription.limits.relatoriosCompletos) && (
        <>
        <section className="flex flex-col gap-[18px]">
          <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">Visão geral</h2>

          {loadingOverview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          ) : errorOverview ? (
            <ErrorCard message={errorOverview} onRetry={fetchReports} />
          ) : overviewData ? (
            <OverviewCards data={overviewData} />
          ) : null}
        </section>

        <section className="flex flex-col gap-[18px]">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">
              Faturamento
            </h2>

            {revenueTotais && !loadingRevenue && (
              <div className="flex items-center gap-x-[26px] gap-y-2 text-[14.5px] text-gray-400 flex-wrap">
                <span>
                  Recebido:{" "}
                  <b className="text-gray-100 font-bold">
                    {toCurrency(revenueTotais.valor_recebido)}
                  </b>
                </span>
                <span>
                  Líquido:{" "}
                  <b className="text-gray-100 font-bold">
                    {toCurrency(revenueTotais.faturamento_liquido)}
                  </b>
                </span>
                <span>
                  Repasses:{" "}
                  <b className="text-gray-100 font-bold">
                    {toCurrency(revenueTotais.repasses_colaboradores)}
                  </b>
                </span>
                <span>
                  A receber:{" "}
                  <b className="text-gray-100 font-bold">
                    {toCurrency(revenueTotais.valor_pendente)}
                  </b>
                </span>
              </div>
            )}
          </div>

          <div className="rounded-[18px] bg-primary-800 border border-primary-700 px-4 sm:px-[30px] pt-5 sm:pt-[30px] pb-4 sm:pb-[22px]">
            {errorRevenue ? (
              <ErrorCard message={errorRevenue} onRetry={fetchReports} />
            ) : revenueData.length > 0 ? (
              <RevenueChart data={revenueData} />
            ) : loadingRevenue ? null : (
              <EmptyState message="Nenhum dado de faturamento disponível ainda." />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-[18px]">
          <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">Distribuição</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[18px]">
            <DonutCard title="Tempo por projeto" subtitle="Horas rastreadas via time tracker">
              {loadingProductivity ? (
                <DonutSpinner />
              ) : errorProductivity ? (
                <InlineError message={errorProductivity} onRetry={fetchReports} />
              ) : (
                <DistributionSection
                  overviewData={overviewData ?? emptyOverview}
                  timeByProject={timeByProject}
                  totalHoras={totalHorasRastreadas}
                  projects={projectsForStatus}
                  slot="time"
                />
              )}
            </DonutCard>

            <DonutCard title="Distribuição financeira" subtitle="Líquido · Repasses · A receber">
              {loadingOverview ? (
                <DonutSpinner />
              ) : errorOverview ? (
                <InlineError message={errorOverview} onRetry={fetchReports} />
              ) : overviewData ? (
                <DistributionSection
                  overviewData={overviewData}
                  timeByProject={timeByProject}
                  totalHoras={totalHorasRastreadas}
                  projects={projectsForStatus}
                  slot="finance"
                />
              ) : null}
            </DonutCard>

            <DonutCard title="Status dos projetos" subtitle="Distribuição por situação atual">
              {loadingComparison ? (
                <DonutSpinner />
              ) : errorComparison ? (
                <InlineError message={errorComparison} onRetry={fetchReports} />
              ) : (
                <DistributionSection
                  overviewData={overviewData ?? emptyOverview}
                  timeByProject={timeByProject}
                  totalHoras={totalHorasRastreadas}
                  projects={projectsForStatus}
                  slot="status"
                />
              )}
            </DonutCard>
          </div>
        </section>

        <section className="flex flex-col gap-[18px]">
          <div>
            <h2 className="text-[17px] font-semibold text-gray-200 tracking-tight m-0">Performance</h2>
            <p className="text-[14.5px] text-gray-400 mt-2 m-0">
              <strong className="text-gray-200 font-semibold">Tempo de ciclo</strong> = dias corridos (inclui
              espera).{" "}
              <strong className="text-gray-200 font-semibold">Tempo de execução</strong> = horas rastreadas via
              time tracker.
            </p>
          </div>

          {loadingPerformance ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStatCard key={i} />
              ))}
            </div>
          ) : errorPerformance ? (
            <ErrorCard message={errorPerformance} onRetry={fetchReports} />
          ) : performanceData ? (
            <PerformanceSection data={performanceData} />
          ) : null}
        </section>
        </>
        )}

      </div>
    </>
  );
}

const emptyOverview: OverviewData = {
  valor_recebido: 0,
  valor_pendente: 0,
  repasses_colaboradores: 0,
  faturamento_bruto: 0,
  faturamento_liquido: 0,
  projetos_ativos: 0,
  projetos_finalizados: 0,
  projetos_total: 0,
  tempo_ciclo_medio_projeto_dias: null,
  tempo_execucao_medio_projeto_horas: null,
  tempo_execucao_medio_tarefa_horas: null,
  _meta: { projetos_com_ciclo_completo: 0, projetos_com_rastreio: 0, tarefas_com_rastreio: 0 },
};

function DonutCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col px-4 sm:px-7 pt-5 sm:pt-[26px] pb-6 sm:pb-[30px] rounded-[18px] bg-primary-800 border border-primary-700">
      <div className="mb-2">
        <div className="text-[18px] font-semibold text-gray-100">{title}</div>
        <div className="text-[14px] text-gray-400 mt-[6px]">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function DonutSpinner() {
  return (
    <div className="flex items-center justify-center h-[260px]">
      <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-[260px] text-center px-4">
      <AlertCircle size={20} className="text-red-400" />
      <div className="text-[12px] text-gray-400">{message}</div>
      <button
        onClick={onRetry}
        className="text-[12px] text-primary-400 hover:text-primary-300 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-[18px] bg-primary-800 border border-primary-700">
      <div className="flex items-center gap-3 text-[13px] text-gray-400">
        <AlertCircle size={16} className="text-red-400 shrink-0" />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="text-[13px] text-primary-400 hover:text-primary-300 transition-colors shrink-0"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-72 flex items-center justify-center text-[14px] text-gray-500">
      {message}
    </div>
  );
}
