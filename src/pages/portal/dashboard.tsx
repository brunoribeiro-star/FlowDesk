import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientDashboardStats, getClientActivities, getClientAllPagamentos } from "@/lib/supabaseQueries/clientPortal";
import { getAdiantamentosPendentesCliente } from "@/lib/supabaseQueries/adiantamentos";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { Package, ClipboardList, Wallet, CheckCircle2, Upload, CreditCard, FileText, Send, Clock, BellRing, Copy, Check, X, ArrowRight } from "lucide-react";

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

type PagamentoCobranca = {
  id: string;
  valor: number;
  pix_chave: string | null;
  notificado_em: string;
  projeto_id: string;
};

type AdiantamentoPendente = {
  id: string;
  projeto_id: string;
  user_id: string;
  valor: number;
  motivo: string;
  status: string;
  pix_chave: string | null;
  pix_tipo: string | null;
  solicitado_em: string;
  projetos: { titulo: string } | null;
};

function AdiantamentoPixCard({ pixChave }: { pixChave: string }) {
  const [copied, setCopied] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(pixChave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-3 bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 mb-0.5">Chave PIX para transferência</p>
        <p className="text-[13px] text-primary-300 font-medium truncate">{pixChave}</p>
      </div>
      <button
        onClick={copiar}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 text-[12px] text-gray-200 transition-colors flex-shrink-0"
      >
        {copied ? <Check size={13} className="text-third-400" /> : <Copy size={13} />}
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [_sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rawStats, setRawStats] = useState<RawStats>({ entregaveis: [], briefings: [], pagamentos: [], tasks: [] });
  const [cobrancasPendentes, setCobrancasPendentes] = useState<PagamentoCobranca[]>([]);
  const [adiantamentosPendentes, setAdiantamentosPendentes] = useState<AdiantamentoPendente[]>([]);
  const [recusandoId, setRecusandoId] = useState<string | null>(null);
  const [recusaFeedback, setRecusaFeedback] = useState<Record<string, string>>({});
  const [recusandoConfirmId, setRecusandoConfirmId] = useState<string | null>(null);
  const [aprovandoId, setAprovandoId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);

      await fetch("/api/client-invites/accept-pending", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const { data: memberRows } = await getClientProjects(session.user.id);
      if (!memberRows.length) { setLoading(false); return; }

      const projectIds = memberRows.map((r: any) => r.project_id);
      const [stats, { data: actData }, { data: pagData }, adiantamentosData] = await Promise.all([
        getClientDashboardStats(projectIds),
        getClientActivities(projectIds),
        getClientAllPagamentos(projectIds),
        getAdiantamentosPendentesCliente(projectIds),
      ]);

      const cobrancas = (pagData ?? []).filter(
        (p: any) => p.status === "pendente" && p.notificado_em
      ) as PagamentoCobranca[];
      setCobrancasPendentes(cobrancas);
      setAdiantamentosPendentes(adiantamentosData as AdiantamentoPendente[]);

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

      const channel = supabase
        .channel(`portal-adiantamentos-${session.user.id}`)
        .on("postgres_changes" as any, { event: "*", schema: "public", table: "adiantamentos" }, async () => {
          const fresh = await getAdiantamentosPendentesCliente(projectIds);
          setAdiantamentosPendentes(fresh as AdiantamentoPendente[]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    })();
  }, []);

  async function handleAprovarAdiantamento(adiantamentoId: string) {
    setAprovandoId(adiantamentoId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch("/api/adiantamentos/aprovar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adiantamento_id: adiantamentoId }),
      });
      setAdiantamentosPendentes((prev) => prev.filter((a) => a.id !== adiantamentoId));
    } finally {
      setAprovandoId(null);
    }
  }

  async function handleRecusarAdiantamento(adiantamentoId: string) {
    const feedback = recusaFeedback[adiantamentoId]?.trim();
    if (!feedback) { setRecusandoConfirmId(adiantamentoId); return; }
    setRecusandoId(adiantamentoId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      await fetch("/api/adiantamentos/recusar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adiantamento_id: adiantamentoId, feedback }),
      });
      setAdiantamentosPendentes((prev) => prev.filter((a) => a.id !== adiantamentoId));
      setRecusandoConfirmId(null);
    } finally {
      setRecusandoId(null);
    }
  }

  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente";
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  const totalApprovals = projects.reduce((s, p) => s + p.pendingApprovals, 0);
  const totalBriefings = projects.reduce((s, p) => s + p.pendingBriefings, 0);
  const totalPayments = projects.reduce((s, p) => s + p.pendingPayments, 0);

  const firstProject = projects[0];

  const METRICS = [
    { icon: Package, label: "Para aprovar", value: totalApprovals === 0 ? "Nenhum" : `${totalApprovals} entregável${totalApprovals > 1 ? "is" : ""}`, onClick: () => router.push("/portal/aprovacoes"), accent: totalApprovals > 0 },
    { icon: ClipboardList, label: "Briefings pendentes", value: totalBriefings === 0 ? "Nenhum" : `${totalBriefings} briefing${totalBriefings > 1 ? "s" : ""}`, onClick: () => router.push("/portal/briefings"), accent: false },
    { icon: Wallet, label: "Pagamentos pendentes", value: totalPayments === 0 ? "Nenhum" : `${totalPayments} pagamento${totalPayments > 1 ? "s" : ""}`, onClick: () => router.push("/portal/pagamentos"), accent: false },
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
    { name: "Tarefas", pct: toPct(aggTarefas.done, aggTarefas.total) },
    { name: "Subtarefas", pct: toPct(aggSubs.done, aggSubs.total) },
    { name: "Entregáveis", pct: toPct(aggEntregaveis.done, aggEntregaveis.total) },
    { name: "Briefings", pct: toPct(aggBriefings.done, aggBriefings.total) },
    { name: "Pagamentos", pct: toPct(aggPagamentos.done, aggPagamentos.total) },
  ];

  const hasAnyData = projects.length > 0;
  const hasNotifications = cobrancasPendentes.length > 0 || adiantamentosPendentes.length > 0;

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
        <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
        <div style={{ flex: 1, minWidth: 0, padding: "44px 52px 52px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "34px" }}>
            <div className="w-[66px] h-[66px] rounded-full bg-primary-800 animate-pulse flex-none" />
            <div className="flex flex-col gap-2">
              <div className="h-8 w-52 rounded-xl bg-primary-800 animate-pulse" />
              <div className="h-4 w-64 rounded-lg bg-primary-800 animate-pulse" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "22px", marginBottom: "24px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 rounded-[18px] bg-primary-800 animate-pulse" />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "22px" }}>
            <div className="h-72 rounded-[18px] bg-primary-800 animate-pulse" />
            <div className="h-72 rounded-[18px] bg-primary-800 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
      <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="po">
        <div className="po-bg" />

        <header className="po-top">
          <div className="po-greet">
            <span className="po-avatar">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={50}
                  height={50}
                  style={{ width: "50px", height: "50px", objectFit: "cover" }}
                />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </span>
            <div>
              <h1 className="po-hello">Olá, {displayName}!</h1>
            </div>
          </div>
          <div className="po-account">
            <span className="po-email">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        {hasNotifications && (
          <div className="po-notifications">
            {cobrancasPendentes.length > 0 && (
              <button
                type="button"
                onClick={() => router.push("/portal/pagamentos")}
                className="w-full flex items-center gap-3 px-5 py-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-colors text-left"
              >
                <BellRing size={18} className="text-yellow-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-semibold text-yellow-300">
                    {cobrancasPendentes.length === 1
                      ? "Você tem 1 cobrança pendente"
                      : `Você tem ${cobrancasPendentes.length} cobranças pendentes`}
                  </span>
                  <span className="text-[13px] text-yellow-400/70 ml-2">— clique para ver e pagar</span>
                </div>
                <span className="text-yellow-400/60 text-[13px] flex-shrink-0">Ver pagamentos →</span>
              </button>
            )}

            {adiantamentosPendentes.map((ad) => {
              const fmtValor = Number(ad.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              const projetoTitulo = ad.projetos?.titulo ?? "Projeto";
              const isRecusando = recusandoConfirmId === ad.id;
              return (
                <div key={ad.id} className="w-full flex flex-col gap-3 px-5 py-4 rounded-xl bg-primary-700/40 border border-primary-600 transition-colors">
                  <div className="flex items-start gap-3">
                    <BellRing size={18} className="text-primary-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-gray-100">
                        Solicitação de adiantamento — {projetoTitulo}
                      </div>
                      <div className="text-[13px] text-gray-400 mt-0.5">
                        Valor: <span className="text-primary-300 font-medium">{fmtValor}</span>
                      </div>
                      <div className="text-[13px] text-gray-400 mt-1 leading-relaxed">{ad.motivo}</div>
                    </div>
                  </div>

                  {ad.pix_chave && <AdiantamentoPixCard pixChave={ad.pix_chave} />}

                  {!isRecusando ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAprovarAdiantamento(ad.id)}
                        disabled={aprovandoId === ad.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-third-500/15 hover:bg-third-500/25 border border-third-500/30 text-[13px] font-medium text-third-400 transition-colors disabled:opacity-60"
                      >
                        <Check size={14} />
                        {aprovandoId === ad.id ? "Aprovando..." : "Aprovar e transferir"}
                      </button>
                      <button
                        onClick={() => setRecusandoConfirmId(ad.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[13px] font-medium text-red-400 transition-colors"
                      >
                        <X size={14} />
                        Recusar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={recusaFeedback[ad.id] ?? ""}
                        onChange={(e) => setRecusaFeedback((prev) => ({ ...prev, [ad.id]: e.target.value }))}
                        placeholder="Informe o motivo da recusa para o freelancer..."
                        rows={2}
                        className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 placeholder-gray-500 outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRecusandoConfirmId(null)}
                          className="flex-1 py-2 rounded-xl border border-primary-600 text-[13px] text-gray-400 hover:bg-primary-700 transition-colors"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => handleRecusarAdiantamento(ad.id)}
                          disabled={recusandoId === ad.id || !recusaFeedback[ad.id]?.trim()}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-[13px] font-medium text-red-400 transition-colors disabled:opacity-60"
                        >
                          {recusandoId === ad.id ? "Enviando..." : "Confirmar recusa"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <section className="po-stats">
          {METRICS.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={m.onClick}
              className={"po-stat" + (m.accent ? " accent" : "")}
            >
              <span className="po-stat-ico">
                <m.icon size={22} />
              </span>
              <span className="po-stat-label">{m.label}</span>
              <span className="po-stat-value">{m.value}</span>
            </button>
          ))}
        </section>

        <section className="po-grid">
          <div className="po-panel">
            <div className="po-panel-head">
              <div>
                <h2 className="po-panel-title">Saúde dos projetos</h2>
                <p className="po-panel-sub">% de conclusão por categoria</p>
              </div>
              {projects.length > 0 && (
                <button
                  type="button"
                  className="po-link"
                  onClick={() =>
                    router.push(projects.length === 1 ? `/portal/projeto/${firstProject!.id}` : "/portal/projetos")
                  }
                >
                  {projects.length === 1 ? "Ver projeto" : "Ver projetos"}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>

            {!hasAnyData ? (
              <div className="po-empty">
                <span className="po-empty-ico">
                  <Package size={26} strokeWidth={1.8} />
                </span>
                <p className="po-empty-txt">Nenhum projeto disponível</p>
              </div>
            ) : (
              <div className="po-chart">
                {chartData.map(({ name, pct }) => (
                  <div key={name} className="po-chart-row">
                    <span className="po-chart-label">{name}</span>
                    <div className="po-chart-bar-area">
                      <div className="po-chart-track">
                        {pct > 0 && <div className="po-chart-fill" style={{ width: `${pct}%` }} />}
                      </div>
                      <span className="po-chart-pct">{pct}%</span>
                    </div>
                  </div>
                ))}
                <div className="po-chart-axis">
                  {["0%", "25%", "50%", "75%", "100%"].map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="po-panel">
            <div className="po-panel-head">
              <div>
                <h2 className="po-panel-title">Atividades recentes</h2>
                <p className="po-panel-sub">Últimas ações nos seus projetos</p>
              </div>
            </div>

            {activities.length === 0 ? (
              <div className="po-empty">
                <span className="po-empty-ico">
                  <Clock size={26} strokeWidth={1.8} />
                </span>
                <p className="po-empty-txt">Nenhuma atividade registrada ainda</p>
              </div>
            ) : (
              <div className="po-activities custom-scrollbar">
                {activities.map((act, i) => {
                  const { icon: Icon, color } = getActivityMeta(act.tipo);
                  const timeAgo = formatTimeAgo(act.created_at);
                  return (
                    <div
                      key={act.id}
                      className={`flex items-start gap-3 py-3.5${i < activities.length - 1 ? " po-activity-divider" : ""}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug" style={{ color: "var(--gray-200)" }}>
                          {act.descricao || formatActivityLabel(act.tipo)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {act.projetos && (
                            <span className="text-[11px] truncate max-w-[120px]" style={{ color: "var(--primary-400)" }}>
                              {(act.projetos as any).titulo}
                            </span>
                          )}
                          {act.projetos && (
                            <span className="text-[11px]" style={{ color: "var(--gray-700)" }}>·</span>
                          )}
                          <span className="text-[11px] flex-shrink-0" style={{ color: "var(--gray-500)" }}>
                            {timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .po {
          position: relative;
          flex: 1;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 44px 52px 52px;
          overflow: hidden;
          background: var(--primary-900);
          color: var(--gray-100);
          -webkit-font-smoothing: antialiased;
        }
        .po-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(42% 40% at 88% 0%, color-mix(in srgb, var(--primary-500) 10%, transparent), transparent 70%),
            radial-gradient(36% 38% at 4% 6%, color-mix(in srgb, var(--primary-800) 42%, transparent), transparent 70%);
        }
        .po > *:not(.po-bg) { position: relative; z-index: 1; }
        .po > .po-top { position: relative; z-index: 10; }

        /* header */
        .po-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 22px;
        }
        .po-greet { display: flex; align-items: center; gap: 16px; }
        .po-avatar {
          display: grid;
          place-items: center;
          width: 50px;
          height: 50px;
          flex: none;
          border-radius: 50%;
          font-size: 20px;
          font-weight: 700;
          color: var(--primary-200);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 30%, transparent);
          overflow: hidden;
        }
        .po-hello {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.02em;
        }
        .po-account { display: flex; align-items: center; gap: 18px; }
        .po-email { font-size: 15.5px; color: var(--gray-300); }

        /* notifications */
        .po-notifications {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 22px;
        }

        /* stat cards */
        .po-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }
        .po-stat {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px 22px;
          border-radius: 16px;
          border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-900) 50%, transparent)
          );
          text-align: left;
          cursor: pointer;
          transition: opacity 0.18s;
          width: 100%;
        }
        .po-stat:hover { opacity: 0.82; }
        .po-stat.accent {
          border-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-500) 10%, transparent),
            color-mix(in srgb, var(--primary-900) 40%, transparent)
          );
        }
        .po-stat-ico {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 11px;
          color: var(--primary-400);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 22%, transparent);
        }
        .po-stat-label { font-size: 14px; color: var(--gray-400); }
        .po-stat-value { font-size: 22px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.015em; }

        /* main grid */
        .po-grid {
          display: grid;
          grid-template-columns: 1.55fr 1fr;
          gap: 22px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }
        .po-panel {
          display: flex;
          flex-direction: column;
          padding: 22px 26px;
          border-radius: 18px;
          border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 35%, transparent),
            color-mix(in srgb, var(--primary-900) 45%, transparent)
          );
          min-height: 0;
        }
        .po-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 16px;
          margin-bottom: 18px;
          border-bottom: 1px solid var(--gray-700);
          flex-shrink: 0;
        }
        .po-panel-title { margin: 0; font-size: 19px; font-weight: 700; color: var(--gray-100); }
        .po-panel-sub { margin: 6px 0 0; font-size: 14.5px; color: var(--gray-500); }
        .po-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 42px;
          padding: 0 18px;
          flex: none;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          color: var(--primary-300);
          cursor: pointer;
          white-space: nowrap;
          border-radius: 11px;
          border: 1px solid color-mix(in srgb, var(--primary-500) 28%, transparent);
          background: color-mix(in srgb, var(--primary-500) 7%, transparent);
          transition: background 0.18s, color 0.18s;
        }
        .po-link:hover { background: color-mix(in srgb, var(--primary-500) 13%, transparent); color: var(--primary-200); }

        /* health bar chart */
        .po-chart { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; overflow: hidden; }
        .po-chart-row { display: grid; grid-template-columns: 110px 1fr; align-items: stretch; gap: 18px; flex: 1; min-height: 0; }
        .po-chart-bar-area { display: flex; align-items: center; gap: 12px; height: 100%; }
        .po-chart-label { font-size: 15px; color: var(--gray-300); display: flex; align-items: center; }
        .po-chart-track {
          flex: 1;
          height: 100%;
          min-height: 22px;
          border-radius: 9px;
          background: color-mix(in srgb, var(--primary-900) 60%, transparent);
          border: 1px solid var(--gray-700);
          overflow: hidden;
        }
        .po-chart-fill {
          height: 100%;
          min-width: 2px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--primary-500), var(--primary-400));
          box-shadow: 0 0 22px -6px color-mix(in srgb, var(--primary-500) 70%, transparent);
        }
        .po-chart-pct {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--gray-300);
          flex-shrink: 0;
          min-width: 36px;
          text-align: right;
        }
        .po-chart-axis {
          display: flex;
          justify-content: space-between;
          margin: 4px 48px 0 128px;
          font-size: 13px;
          color: var(--gray-500);
        }

        /* recent activities */
        .po-activities {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .po-activity-divider { border-bottom: 1px solid var(--gray-700); }

        /* empty state */
        .po-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 40px 20px;
          text-align: center;
        }
        .po-empty-ico {
          display: grid;
          place-items: center;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          color: var(--gray-500);
          background: color-mix(in srgb, var(--gray-400) 8%, transparent);
          border: 1px solid var(--gray-700);
        }
        .po-empty-txt { margin: 0; font-size: 15.5px; color: var(--gray-500); }

        /* scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--gray-700); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--gray-600); }
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
