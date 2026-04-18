import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientDashboardStats } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { Package, ClipboardList, Wallet, FolderKanban, Clock, AlertCircle, ChevronRight } from "lucide-react";

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
};

type PendingItem = {
  type: "entregavel" | "briefing" | "pagamento";
  label: string;
  sublabel: string;
  projectId: string;
  tab: string;
};

export default function PortalDashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);

      const { data: memberRows } = await getClientProjects(session.user.id);
      if (!memberRows.length) { setLoading(false); return; }

      const projectIds = memberRows.map((r: any) => r.project_id);
      const stats = await getClientDashboardStats(projectIds);

      const built: DashboardProject[] = memberRows.map((row: any) => {
        const proj = row.projetos as any;
        if (!proj) return null;
        const pid = proj.id;
        const pendingApprovals = stats.entregaveis.filter((e: any) => e.project_id === pid && e.status === "aguardando_aprovacao").length;
        const pendingBriefings = stats.briefings.filter((b: any) => b.projeto_id === pid && b.status !== "respondido" && !b.respondido_em).length;
        const pendingPayments = stats.pagamentos.filter((p: any) => p.projeto_id === pid && p.status === "pendente").length;
        const projectTasks = stats.tasks.filter((t: any) => t.projeto_id === pid);
        const tasksDone = projectTasks.filter((t: any) => t.status === "concluida" || t.concluida).length;
        return { id: pid, titulo: proj.titulo, status: proj.status, progresso: proj.progresso, prazo_entrega: proj.prazo_entrega, cover_url: proj.cover_url, pendingApprovals, pendingBriefings, pendingPayments, tasksDone, tasksTotal: projectTasks.length };
      }).filter(Boolean) as DashboardProject[];

      setProjects(built);

      const items: PendingItem[] = [];
      built.forEach((p) => {
        if (p.pendingApprovals > 0)
          items.push({ type: "entregavel", label: "Entregável aguardando aprovação", sublabel: p.titulo, projectId: p.id, tab: "entregaveis" });
        if (p.pendingBriefings > 0)
          items.push({ type: "briefing", label: "Briefing para responder", sublabel: p.titulo, projectId: p.id, tab: "briefings" });
        if (p.pendingPayments > 0)
          items.push({ type: "pagamento", label: "Pagamento pendente", sublabel: p.titulo, projectId: p.id, tab: "pagamentos" });
      });
      setPendingItems(items);
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
    { icon: Package, label: "Para aprovar", value: totalApprovals === 0 ? "Nenhum" : `${totalApprovals} entregável${totalApprovals > 1 ? "is" : ""}`, onClick: () => firstProject && router.push(`/portal/projeto/${firstProject.id}`) },
    { icon: ClipboardList, label: "Briefings pendentes", value: totalBriefings === 0 ? "Nenhum" : `${totalBriefings} briefing${totalBriefings > 1 ? "s" : ""}`, onClick: () => firstProject && router.push(`/portal/projeto/${firstProject.id}`) },
    { icon: Wallet, label: "Pagamentos pendentes", value: totalPayments === 0 ? "Nenhum" : `${totalPayments} pagamento${totalPayments > 1 ? "s" : ""}`, onClick: () => firstProject && router.push(`/portal/projeto/${firstProject.id}`) },
  ];

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

          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center justify-end gap-3 min-w-0">
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

            <div className="flex flex-col gap-4 min-h-0">

              <div className="flex-1 flex flex-col rounded-lg bg-primary-800 border border-primary-700 overflow-hidden min-h-0">
                <div className="px-5 py-4 border-b border-primary-700 flex items-center justify-between flex-shrink-0">
                  <div className="flex flex-col gap-1">
                    <div className="text-[14px] text-gray-300">Meus projetos</div>
                    <div className="text-[28px] text-gray-200 font-bold">
                      {projects.length === 0 ? "Nenhum projeto" : `${projects.length} projeto${projects.length > 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary-500" />
                    <span className="text-[12px] text-gray-300">Em andamento</span>
                  </div>
                </div>

                <div className="flex-1 px-5 py-4 overflow-y-auto custom-scrollbar min-h-0">
                  {projects.length === 0 ? (
                    <div className="text-gray-400 text-[14px] mt-8 text-center">Nenhum projeto disponível</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {projects.map((p) => {
                        const progress = p.tasksTotal > 0 ? Math.round((p.tasksDone / p.tasksTotal) * 100) : (p.progresso ?? 0);
                        const isUrgent = p.prazo_entrega ? new Date(p.prazo_entrega) < new Date(Date.now() + 7 * 86400000) : false;
                        return (
                          <div key={p.id} className="flex flex-col gap-2">
                            {p.cover_url && (
                              <img src={p.cover_url} alt="" className="w-full h-20 object-cover rounded-lg opacity-75" />
                            )}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[15px] font-semibold text-gray-200 truncate">{p.titulo}</span>
                                {p.prazo_entrega && (
                                  <span className={`flex items-center gap-1 text-[12px] mt-0.5 ${isUrgent ? "text-yellow-400" : "text-gray-500"}`}>
                                    {isUrgent ? <AlertCircle size={11} /> : <Clock size={11} />}
                                    Entrega: {formatDate(p.prazo_entrega)}
                                  </span>
                                )}
                              </div>
                              <StatusBadge status={p.status} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[12px] text-gray-400">Progresso</span>
                                <span className="text-[12px] text-gray-300 font-medium">{progress}%</span>
                              </div>
                              <div className="h-1.5 bg-primary-700 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                              </div>
                              {p.tasksTotal > 0 && (
                                <p className="text-[11px] text-gray-600 mt-1">{p.tasksDone}/{p.tasksTotal} tarefas concluídas</p>
                              )}
                            </div>
                            <div className="border-t border-primary-700 pt-2" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => firstProject && router.push(`/portal/projeto/${firstProject.id}`)}
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 text-[18px] font-semibold transition-colors"
                >
                  Acessar projeto
                </button>
                <button
                  onClick={() => firstProject && router.push(`/portal/projeto/${firstProject.id}`)}
                  className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 text-[18px] hover:bg-primary-700 transition-colors"
                >
                  Ver pendências
                </button>
              </div>
            </div>

            <div className="h-full rounded-lg bg-primary-800 border border-primary-700 p-5 flex flex-col gap-4 min-h-0">
              <div className="text-[18px] text-gray-200 font-medium">Pendências</div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {pendingItems.length > 0 ? (
                  pendingItems.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => router.push(`/portal/projeto/${item.projectId}`)}
                      className="flex items-start gap-3 py-3 border-b border-primary-700 last:border-b-0 w-full text-left hover:bg-primary-700/30 transition-colors px-1 rounded"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary-700 border border-primary-600 flex items-center justify-center text-gray-200 text-[18px] flex-shrink-0">
                        •
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="text-[14px] text-gray-300 font-medium">{item.label}</div>
                        <div className="text-[13px] text-gray-400 truncate">{item.sublabel}</div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600 flex-shrink-0 mt-1" />
                    </button>
                  ))
                ) : (
                  <div className="text-gray-400 text-[14px] mt-8 text-center">
                    Nenhuma pendência no momento
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-500); border-radius: 9999px; border: 2px solid var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-400); }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "em_andamento": "text-primary-400 bg-primary-400/10 border-primary-400/20",
    "Em andamento": "text-primary-400 bg-primary-400/10 border-primary-400/20",
    "concluído": "text-third-400 bg-third-400/10 border-third-400/20",
    "Concluído": "text-third-400 bg-third-400/10 border-third-400/20",
    "finalizado": "text-third-400 bg-third-400/10 border-third-400/20",
  };
  const cls = map[status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0 ${cls}`}>{status}</span>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
