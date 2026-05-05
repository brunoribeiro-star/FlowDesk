"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
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
import { BarChart3, RefreshCw, AlertCircle, Lock, Zap } from "lucide-react";
import { useRouter } from "next/router";
import { useSubscription } from "@/hooks/useSubscription";

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
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-y-auto min-w-0">

        <header className="w-full flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 size={26} className="text-primary-400" />
            <div>
              <div className="text-[20px] font-semibold text-gray-200">Relatórios</div>
              <div className="text-[13px] text-gray-400">
                Métricas e desempenho do seu trabalho
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg bg-primary-800 border border-primary-700 p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={[
                    "px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
                    period === p.value
                      ? "bg-primary-600 text-gray-100"
                      : "text-gray-400 hover:text-gray-200 hover:bg-primary-700",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-800 border border-primary-700 text-gray-300 hover:text-gray-200 hover:bg-primary-700 transition-colors text-[13px] disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              Atualizar
            </button>
            <HeaderProfile />
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
        <section className="flex flex-col gap-3">
          <div className="text-[15px] font-medium text-gray-300">Visão geral</div>

          {loadingOverview ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[15px] font-medium text-gray-300">
              Faturamento
            </div>

            {revenueTotais && !loadingRevenue && (
              <div className="flex items-center gap-4 text-[12px] text-gray-400 flex-wrap">
                <span>
                  Recebido:{" "}
                  <span className="text-gray-200 font-medium">
                    {toCurrency(revenueTotais.valor_recebido)}
                  </span>
                </span>
                <span>
                  Líquido:{" "}
                  <span className="text-gray-200 font-medium">
                    {toCurrency(revenueTotais.faturamento_liquido)}
                  </span>
                </span>
                <span>
                  Repasses:{" "}
                  <span className="text-gray-200 font-medium">
                    {toCurrency(revenueTotais.repasses_colaboradores)}
                  </span>
                </span>
                <span>
                  A receber:{" "}
                  <span className="text-gray-200 font-medium">
                    {toCurrency(revenueTotais.valor_pendente)}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-primary-800 border border-primary-700 p-5">
            {errorRevenue ? (
              <ErrorCard message={errorRevenue} onRetry={fetchReports} />
            ) : revenueData.length > 0 ? (
              <RevenueChart data={revenueData} />
            ) : loadingRevenue ? null : (
              <EmptyState message="Nenhum dado de faturamento disponível ainda." />
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="text-[15px] font-medium text-gray-300">Distribuição</div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-[15px] font-medium text-gray-300">Performance</div>
            <div className="text-[12px] text-gray-500">
              <strong className="text-gray-400">Tempo de ciclo</strong> = dias corridos (inclui
              espera).{" "}
              <strong className="text-gray-400">Tempo de execução</strong> = horas rastreadas via
              time tracker.
            </div>
          </div>

          {loadingPerformance ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
    </div>
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
    <div className="flex flex-col gap-4 p-5 rounded-lg bg-primary-800 border border-primary-700">
      <div>
        <div className="text-[14px] font-medium text-gray-200">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{subtitle}</div>
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
    <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-primary-800 border border-primary-700">
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
