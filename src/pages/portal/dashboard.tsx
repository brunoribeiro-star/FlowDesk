import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientDashboardStats, getClientActivities } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { Package, ClipboardList, Wallet, CheckCircle2, Upload, CreditCard, FileText, Send, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type DashboardProject = {
  id: string;
  titulo: string;
  status: string;
  progresso: number | null;
  prazo_entrega: string | null;
  cover_url: string | null;
  pendingApprovals: number;
  pendingBriefings: number;
  pendingPayments: number;
  tasksDone: number;
  tasksTotal: number;
  subsDone: number;
  subsTotal: number;
};

type Activity = {
  id: string;
  tipo: string;
  descricao: string | null;
  created_at: string;
  projeto_id: string;
  projetos: { titulo: string } | null;
};

type RawStats = {
  entregaveis: any[];
  briefings: any[];
  pagamentos: any[];
  tasks: any[];
};

export default function PortalDashboardPage() {
  const router = useRouter();
  const [_sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rawStats, setRawStats] = useState<RawStats>({ entregaveis: [], briefings: [], pagamentos: [], tasks: [] });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const { data: memberRows } = await getClientProjects(session.user.id);
      if (!memberRows.length) { setLoading(false); return; }

      const projectIds = memberRows.map((r: any) => r.project_id);
      const [stats, { data: actData }] = await Promise.all([
        getClientDashboardStats(projectIds),
        getClientActivities(projectIds),
      ]);

      const built: DashboardProject[] = memberRows.map((row: any) => {
        const proj = row.projetos as any;
        if (!proj) return null;
        const pid = proj.id;
        const pendingApprovals = stats.entregaveis.filter((e: any) => e.project_id === pid && e.status === "aguardando_aprovacao").length;
        const pendingBriefings = stats.briefings.filter((b: any) => b.projeto_id === pid && b.status !== "respondido" && !b.respondido_em).length;
        const pendingPayments = stats.pagamentos.filter((p: any) => p.projeto_id === pid && p.status === "pendente").length;
        const projectTasks = stats.tasks.filter((t: any) => t.projeto_id === pid);
        const tasksDone = projectTasks.filter((t: any) => t.status === "concluida" || t.concluida).length;
        const allSubs = projectTasks.flatMap((t: any) => t.subtasks || []);
        const subsDone = allSubs.filter((s: any) => s.concluida).length;
        return { id: pid, titulo: proj.titulo, status: proj.status, progresso: proj.progresso, prazo_entrega: proj.prazo_entrega, cover_url: proj.cover_url, pendingApprovals, pendingBriefings, pendingPayments, tasksDone, tasksTotal: projectTasks.length, subsDone, subsTotal: allSubs.length };
      }).filter(Boolean) as DashboardProject[];

      setProjects(built);
      setRawStats(stats);
      setActivities((actData ?? []) as unknown as Activity[]);
      setLoading(false);
    })();
  }, [router]);

  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente";
  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";

  const totalApprovals = projects.reduce((s, p) => s + p.pendingApprovals, 0);
  const totalBriefings = projects.reduce((s, p) => s + p.pendingBriefings, 0);
  const totalPayments = projects.reduce((s, p) => s + p.pendingPayments, 0);

  const firstProject = projects[0];

  const METRICS = [
    { icon: Package, label: "Para aprovar", value: totalApprovals === 0 ? "Nenhum" : `${totalApprovals} entregável${totalApprovals > 1 ? "is" : ""}`, onClick: () => router.push("/portal/aprovacoes") },
    { icon: ClipboardList, label: "Briefings pendentes", value: totalBriefings === 0 ? "Nenhum" : `${totalBriefings} briefing${totalBriefings > 1 ? "s" : ""}`, onClick: () => router.push("/portal/briefings") },
    { icon: Wallet, label: "Pagamentos pendentes", value: totalPayments === 0 ? "Nenhum" : `${totalPayments} pagamento${totalPayments > 1 ? "s" : ""}`, onClick: () => router.push("/portal/pagamentos") },
  ];

  const aggTarefas = {
    done: projects.reduce((s, p) => s + p.tasksDone, 0),
    total: projects.reduce((s, p) => s + p.tasksTotal, 0),
  };
  const aggSubs = {
    done: projects.reduce((s, p) => s + p.subsDone, 0),
    total: projects.reduce((s, p) => s + p.subsTotal, 0),
  };
  const aggEntregaveis = {
    done: rawStats.entregaveis.filter((e: any) => e.status === "aprovado").length,
    total: rawStats.entregaveis.length,
  };
  const aggBriefings = {
    done: rawStats.briefings.filter((b: any) => b.status === "respondido" || b.respondido_em).length,
    total: rawStats.briefings.length,
  };
  const aggPagamentos = {
    done: rawStats.pagamentos.filter((p: any) => p.status === "pago").length,
    total: rawStats.pagamentos.length,
  };

  function toPct(done: number, total: number) {
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  const chartData = [
    { name: "Tarefas", pct: toPct(aggTarefas.done, aggTarefas.total), done: aggTarefas.done, total: aggTarefas.total },
    { name: "Subtarefas", pct: toPct(aggSubs.done, aggSubs.total), done: aggSubs.done, total: aggSubs.total },
    { name: "Entregáveis", pct: toPct(aggEntregaveis.done, aggEntregaveis.total), done: aggEntregaveis.done, total: aggEntregaveis.total },
    { name: "Briefings", pct: toPct(aggBriefings.done, aggBriefings.total), done: aggBriefings.done, total: aggBriefings.total },
    { name: "Pagamentos", pct: toPct(aggPagamentos.done, aggPagamentos.total), done: aggPagamentos.done, total: aggPagamentos.total },
  ];

  const hasAnyData = projects.length > 0;

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
        <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-full bg-primary-800 animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-40 rounded-lg bg-primary-800 animate-pulse" />
              <div className="h-3 w-56 rounded-lg bg-primary-800 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-primary-800 animate-pulse" />)}
          </div>
          <div className="flex-1 grid grid-cols-[1.2fr,0.8fr] gap-4">
            <div className="rounded-lg bg-primary-800 animate-pulse" />
            <div className="rounded-lg bg-primary-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">

        <header className="w-full flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-primary-600 flex-shrink-0">
              <Image src={avatarSrc} alt="Avatar" width={60} height={60} className="object-cover" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[22px] text-gray-200 font-medium">Olá, {displayName}!</div>
              <div className="text-[14px] text-gray-300">Aqui está o resumo dos seus projetos.</div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
            <span className="text-[14px] text-gray-400">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <section className="flex-1 flex flex-col gap-4 min-h-0">

          <div className="w-full grid grid-cols-3 gap-4">
            {METRICS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={m.onClick}
                className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700 w-full h-full transition-colors cursor-pointer hover:[background:linear-gradient(180deg,var(--primary-500),var(--primary-800))]"
              >
                <m.icon size={24} className="text-primary-200" />
                <div className="text-[13px] text-gray-300">{m.label}</div>
                <div className="text-[22px] text-gray-200 font-semibold">{m.value}</div>
              </button>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-[1.2fr,0.8fr] gap-4 min-h-0">

            <div className="flex flex-col rounded-lg bg-primary-800 border border-primary-700 overflow-hidden min-h-0">
              <div className="px-5 py-4 border-b border-primary-700 flex-shrink-0 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-gray-200">Saúde dos projetos</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">% de conclusão por categoria</div>
                </div>
                {firstProject && (
                  <button
                    onClick={() => router.push(projects.length === 1 ? `/portal/projeto/${firstProject.id}` : `/portal/projeto/${firstProject.id}`)}
                    className="text-[12px] text-primary-300 hover:text-primary-200 border border-primary-600 hover:border-primary-500 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
                  >
                    Ver projeto →
                  </button>
                )}
              </div>

              <div className="flex-1 p-4 min-h-0">
                {!hasAnyData ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 text-[13px]">Nenhum projeto disponível</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 0, right: 52, left: 0, bottom: 0 }}
                      barCategoryGap="30%"
                    >
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: "var(--gray-400, #9ca3af)", fontSize: 11 }}
                        axisLine={{ stroke: "var(--primary-700, #334155)" }}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                        tickCount={5}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={(props: any) => (
                          <text
                            x={props.x - 82}
                            y={props.y}
                            dy={4}
                            textAnchor="start"
                            fill="var(--gray-300, #cbd5e1)"
                            fontSize={12}
                          >
                            {props.payload.value}
                          </text>
                        )}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--primary-800, #1e293b)",
                          border: "1px solid var(--primary-600, #475569)",
                          borderRadius: 10,
                          color: "#e2e8f0",
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                        cursor={{ fill: "rgba(100,116,139,0.06)" }}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value}% (${props.payload.done}/${props.payload.total})`,
                          "Concluído",
                        ]}
                      />
                      <Bar
                        dataKey="pct"
                        fill="var(--primary-500, #6366f1)"
                        radius={[0, 4, 4, 0]}
                        background={{ fill: "var(--primary-900, #0f172a)", radius: 4 } as any}
                        label={{ position: "right", formatter: (v: any) => `${v}%`, fill: "var(--gray-400, #94a3b8)", fontSize: 11 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="h-full rounded-lg bg-primary-800 border border-primary-700 flex flex-col min-h-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-primary-700 flex-shrink-0">
                <div className="text-[15px] font-semibold text-gray-200">Atividades recentes</div>
                <div className="text-[12px] text-gray-500 mt-0.5">Últimas ações nos seus projetos</div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                    <Clock size={24} className="text-gray-600" />
                    <p className="text-gray-500 text-[13px]">Nenhuma atividade registrada ainda</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {activities.map((act, i) => {
                      const { icon: Icon, color } = getActivityMeta(act.tipo);
                      const timeAgo = formatTimeAgo(act.created_at);
                      return (
                        <div
                          key={act.id}
                          className={`flex items-start gap-3 px-5 py-3.5 ${i < activities.length - 1 ? "border-b border-primary-700" : ""}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-gray-200 leading-snug">
                              {act.descricao || formatActivityLabel(act.tipo)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {act.projetos && (
                                <span className="text-[11px] text-primary-400 truncate max-w-[120px]">{(act.projetos as any).titulo}</span>
                              )}
                              {act.projetos && <span className="text-gray-700 text-[11px]">·</span>}
                              <span className="text-[11px] text-gray-600 flex-shrink-0">{timeAgo}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-700); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-600); }
      `}</style>
    </div>
  );
}

function getActivityMeta(tipo: string): { icon: any; color: string } {
  const t = tipo?.toLowerCase() ?? "";
  if (t.includes("task") || t.includes("tarefa") || t.includes("conclu")) return { icon: CheckCircle2, color: "bg-third-400/15 text-third-400" };
  if (t.includes("arquivo") || t.includes("file") || t.includes("upload")) return { icon: Upload, color: "bg-primary-600 text-primary-200" };
  if (t.includes("pagamento") || t.includes("payment") || t.includes("cobran")) return { icon: CreditCard, color: "bg-yellow-500/15 text-yellow-400" };
  if (t.includes("briefing")) return { icon: FileText, color: "bg-primary-600 text-primary-200" };
  if (t.includes("entregavel") || t.includes("entregável") || t.includes("deliver")) return { icon: Send, color: "bg-primary-500/20 text-primary-300" };
  if (t.includes("link")) return { icon: FileText, color: "bg-primary-600 text-primary-200" };
  return { icon: Clock, color: "bg-primary-700 text-gray-400" };
}

function formatActivityLabel(tipo: string): string {
  const map: Record<string, string> = {
    task_completed: "Tarefa concluída",
    tarefa_concluida: "Tarefa concluída",
    arquivo_enviado: "Arquivo enviado",
    file_uploaded: "Arquivo enviado",
    pagamento_enviado: "Cobrança enviada",
    payment_sent: "Cobrança enviada",
    briefing_enviado: "Briefing enviado",
    entregavel_enviado: "Entregável enviado",
    entregavel_aprovado: "Entregável aprovado",
    link_adicionado: "Link adicionado",
  };
  return map[tipo] ?? tipo?.replace(/_/g, " ") ?? "Atividade registrada";
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

