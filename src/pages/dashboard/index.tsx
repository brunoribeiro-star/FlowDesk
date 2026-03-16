"use client";

import { useMemo, useState, useEffect, useCallback, KeyboardEvent } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonStatCard, SkeletonList } from "@/components/Skeleton";

import {
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";

const WEEKS_LABELS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];

export default function DashboardHome() {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [projetos, setProjetos] = useState<any[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [collaboratedActiveCount, setCollaboratedActiveCount] = useState(0);
  const [collabPaySplits, setCollabPaySplits] = useState<any[]>([]);
  const [collabMemberSplits, setCollabMemberSplits] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [ownedMemberSplits, setOwnedMemberSplits] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");



  const [heightsCurrent, setHeightsCurrent] = useState<number[]>([0, 0, 0, 0]);
  const [heightsLast, setHeightsLast] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    function handleUserUpdated(event: any) {
      const updatedUser = event.detail?.user;
      if (updatedUser) setUser(updatedUser);
    }
    window.addEventListener("flowdesk:user-updated", handleUserUpdated as any);
    return () =>
      window.removeEventListener(
        "flowdesk:user-updated",
        handleUserUpdated as any
      );
  }, []);

  const { user: authUser } = useAuth();

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);

    async function fetchData() {
      setLoading(true);

      const [projRes, atvRes, payRes, tasksRes, memberProjectsRes, collabPayRes, collabSplitRes, pendingInvitesRes] = await Promise.all([
        supabase
          .from("projetos")
          .select("id, titulo, status, progresso, prazo_entrega, cliente_id, orcamento, cover_url, created_at, forma_pagamento, updated_at")
          .eq("user_id", authUser!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("atividades")
          .select("id, tipo, descricao, created_at, user_id")
          .eq("user_id", authUser!.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("pagamentos")
          .select("id, valor, status, data_pagamento, data_vencimento, projeto_id, created_at")
          .eq("user_id", authUser!.id),
        supabase
          .from("tasks")
          .select("id, titulo, status, due_date, projeto_id, projetos!inner(user_id)")
          .eq("projetos.user_id", authUser!.id),
        supabase
          .from("project_members")
          .select("project_id, projetos:project_id(id, status)")
          .eq("user_id", authUser!.id),
        supabase
          .from("collaborator_payment_splits")
          .select("id, project_id, amount, status, paid_at, created_at")
          .eq("member_user_id", authUser!.id),
        supabase
          .from("project_member_splits")
          .select("project_id, split_type, split_value, payment_status, projetos:project_id(orcamento, status, updated_at)")
          .eq("member_user_id", authUser!.id),
        supabase
          .from("project_invites")
          .select("id, token, project_id, invited_by, split_type, split_value, expires_at, projetos:project_id(titulo)")
          .eq("invited_email", (authUser!.email || "").toLowerCase())
          .eq("status", "pending"),
      ]);

      const ownedIds = new Set((projRes.data || []).map((p: any) => p.id));

      const collaboratedActiveProjects = (memberProjectsRes.data || []).filter((row: any) => {
        const proj = row.projetos;
        if (!proj || ownedIds.has(proj.id)) return false;
        const s = String(proj.status || "").toLowerCase();
        return s !== "concluído" && s !== "concluido" && s !== "cancelado" && s !== "arquivado";
      });

      setProjetos(projRes.data || []);
      setAtividades(atvRes.data || []);
      setPagamentos(payRes.data || []);
      setTasks(tasksRes.data || []);
      setCollaboratedActiveCount(collaboratedActiveProjects.length);
      setCollabPaySplits((collabPayRes.data || []) as any[]);
      setCollabMemberSplits((collabSplitRes.data || []) as any[]);
      setPendingInvites((pendingInvitesRes.data || []) as any[]);
      setLoading(false);

      const ownedProjectIds = (projRes.data || []).map((p: any) => p.id);
      if (ownedProjectIds.length > 0) {
        supabase
          .from("project_member_splits")
          .select("project_id, member_user_id, split_type, split_value")
          .in("project_id", ownedProjectIds)
          .neq("member_user_id", authUser!.id)
          .then(({ data }) => setOwnedMemberSplits(data || []));
      }
    }

    fetchData();
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.email) return;

    const email = (authUser.email || "").toLowerCase();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "project_invites", filter: `invited_email=eq.${email}` }, () => {
        supabase
          .from("project_invites")
          .select("id, token, project_id, invited_by, split_type, split_value, expires_at, projetos:project_id(titulo)")
          .eq("invited_email", email)
          .eq("status", "pending")
          .then(({ data }) => { if (data) setPendingInvites(data as any[]); });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "collaborator_payment_splits", filter: `member_user_id=eq.${authUser.id}` }, () => {
        supabase
          .from("collaborator_payment_splits")
          .select("id, project_id, amount, status, paid_at, created_at")
          .eq("member_user_id", authUser.id)
          .then(({ data }) => { if (data) setCollabPaySplits(data as any[]); });
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "project_member_splits", filter: `member_user_id=eq.${authUser.id}` }, () => {
        supabase
          .from("project_member_splits")
          .select("project_id, split_type, split_value, payment_status, projetos:project_id(orcamento, status, updated_at)")
          .eq("member_user_id", authUser.id)
          .then(({ data }) => { if (data) setCollabMemberSplits(data as any[]); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authUser]);

  const now = useMemo(() => new Date(), []);
  const prevMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);

  const weeklyCurrent = useMemo(
    () => buildWeeklyRevenue(pagamentos, projetos, now, collabPaySplits, collabMemberSplits, ownedMemberSplits),
    [pagamentos, projetos, collabPaySplits, collabMemberSplits, ownedMemberSplits, now]
  );
  const weeklyLast = useMemo(
    () => buildWeeklyRevenue(pagamentos, projetos, prevMonth, collabPaySplits, collabMemberSplits, ownedMemberSplits),
    [pagamentos, projetos, collabPaySplits, collabMemberSplits, ownedMemberSplits, prevMonth]
  );
  const maxValue = Math.max(...weeklyCurrent, ...weeklyLast, 1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHeightsCurrent(weeklyCurrent.map((v) => v / maxValue));
      setHeightsLast(weeklyLast.map((v) => v / maxValue));
    }, 80);

    return () => clearTimeout(timeout);
  }, [weeklyCurrent, weeklyLast, maxValue]);

  const faturamentoMes = toCurrency(
    weeklyCurrent.reduce((acc, v) => acc + v, 0)
  );

  const projetosAtivos = useMemo(
    () => projetos.filter((p) => {
      const s = String(p.status || "").toLowerCase();
      return s !== "concluído" && s !== "concluido" && s !== "cancelado" && s !== "arquivado";
    }).length + collaboratedActiveCount,
    [projetos, collaboratedActiveCount]
  );

  const projetosConcluidos = useMemo(
    () => projetos.filter((p) => {
      const s = String(p.status || "").toLowerCase();
      return s === "concluído" || s === "concluido";
    }).length,
    [projetos]
  );

  const pagamentosPendentesTotal = useMemo(() => {
    const isDoneStatus = (status: string) => {
      const s = String(status || "").toLowerCase();
      return s === "concluído" || s === "concluido" || s === "finalizado" || s === "arquivado";
    };

    const projectsWithPayments = new Set(pagamentos.map(p => p.projeto_id).filter(id => id));

    const pendentes = pagamentos.filter((p) => {
      if (p.projeto_id) {
        const proj = projetos.find(proj => proj.id === p.projeto_id);
        if (proj && isDoneStatus(proj.status)) return false;
      }
      if (!p.status) return true;
      const s = String(p.status).toLowerCase();
      return s !== "pago" && s !== "concluido" && s !== "recebido" && s !== "ok";
    });

    let total = pendentes.reduce((acc, p) => acc + Number(p.valor ?? 0), 0);

    projetos.forEach((p) => {
      if (projectsWithPayments.has(p.id)) return;

      const orcamento = Number(p.orcamento) || 0;
      if (orcamento <= 0) return;

      if (p.forma_pagamento === "pix_2x" && !isDoneStatus(p.status)) {
        total += orcamento / 2;
      }
    });

    const collabPending = collabPaySplits
      .filter((s: any) => {
        const st = String(s.status || "").toLowerCase();
        return st !== "pago";
      })
      .reduce((acc: number, s: any) => acc + Number(s.amount ?? 0), 0);

    const projectsWithCollabPaySplits = new Set(collabPaySplits.map((s: any) => s.project_id));
    let collabFallbackPending = 0;
    collabMemberSplits.forEach((ms: any) => {
      if (projectsWithCollabPaySplits.has(ms.project_id)) return;
      const proj = ms.projetos as any;
      if (!proj) return;
      if (ms.payment_status === "paid") return;
      if (isDoneStatus(proj.status)) return;
      const orcamento = Number(proj.orcamento ?? 0);
      if (ms.split_type === "percentage") {
        collabFallbackPending += orcamento * (Number(ms.split_value) / 100);
      } else {
        collabFallbackPending += Number(ms.split_value ?? 0);
      }
    });

    return total + collabPending + collabFallbackPending;
  }, [pagamentos, projetos, collabPaySplits, collabMemberSplits]);

  const tarefasVencendo = useMemo(() => {
    const now = new Date();
    const limit = 2 * 24 * 60 * 60 * 1000;

    return tasks.filter((t) => {
      if (t.concluida) return false;
      const date = t.due_date || t.data_limite;
      if (!date) return false;

      const d = new Date(date);
      if (isNaN(d.getTime())) return false;

      const diff = d.getTime() - now.getTime();
      return diff >= 0 && diff <= limit;
    }).length;
  }, [tasks]);

  const METRICS = [
    {
      id: "projAtivos",
      icon: FolderKanban,
      label: "Projetos ativos",
      value:
        projetosAtivos === 0
          ? "Nenhum ativo"
          : `${projetosAtivos} projeto${projetosAtivos > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/projetos"),
    },
    {
      id: "projConcluidos",
      icon: CheckCircle2,
      label: "Projetos concluídos",
      value:
        projetosConcluidos === 0
          ? "Nenhum concluído"
          : `${projetosConcluidos} projeto${projetosConcluidos > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/projetos"),
    },
    {
      id: "tarefas",
      icon: AlertCircle,
      label: "Tarefas vencendo",
      value:
        tarefasVencendo === 0
          ? "Nenhuma"
          : `${tarefasVencendo} tarefa${tarefasVencendo > 1 ? "s" : ""}`,
      onClick: () => router.push("/dashboard/tarefas"),
    },
    {
      id: "pay",
      icon: Wallet,
      label: "Pagamentos a receber",
      value: toCurrency(pagamentosPendentesTotal),
      onClick: () => router.push("/dashboard/pagamentos"),
    },
  ];

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName =
    user?.user_metadata?.nome ||
    user?.email?.split("@")[0] ||
    "Usuário";

  function handleSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const q = searchTerm.trim();
      if (!q) return;
      router.push(`/dashboard/busca?query=${encodeURIComponent(q)}`);
    }
  }



  if (loading)
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
        <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full skeleton-shimmer bg-primary-800" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-40 rounded-lg skeleton-shimmer bg-primary-800" />
              <div className="h-3 w-56 rounded-lg skeleton-shimmer bg-primary-800" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="flex-1 rounded-2xl border border-primary-700 bg-primary-900/40 overflow-hidden">
            <SkeletonList rows={5} cols={3} />
          </div>
        </div>
      </div>
    );

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">
        <header className="w-full flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-primary-600">
              <Image
                src={avatarSrc}
                alt="Avatar"
                width={60}
                height={60}
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-[22px] text-gray-200 font-medium">
                Olá, {displayName}!
              </div>
              <div className="text-[14px] text-gray-300">
                Aqui está o resumo do seu trabalho.
              </div>
            </div>
          </div>

          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center gap-3 min-w-0">
            <div className="flex-1 flex items-center gap-3 bg-primary-700 border border-primary-600 rounded-lg px-3 py-2.5 min-w-0">
              <Image src="/buscar.svg" alt="Buscar" width={16} height={16} />
              <input
                placeholder="Buscar por projetos, tarefas, clientes..."
                className="w-full bg-transparent outline-none text-[14px] text-gray-200 placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            <HeaderProfile />
          </div>
        </header>

        <section className="flex-1 flex flex-col gap-4 min-h-0">
          {pendingInvites.length > 0 && (
            <div className="flex flex-col gap-2">
              {pendingInvites.map((inv: any) => {
                const projetoTitulo = inv.projetos?.titulo || "Projeto";
                const splitLabel = inv.split_value != null
                  ? (inv.split_type === "percentage"
                      ? ` · ${inv.split_value}% do projeto`
                      : ` · ${Number(inv.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
                  : "";
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-primary-800 border border-primary-600">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                      <span className="text-[14px] text-gray-200 truncate">
                        Você foi convidado para colaborar em <strong className="text-primary-200">{projetoTitulo}</strong>{splitLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`).then(() => {})}
                        className="text-[13px] text-gray-400 hover:text-gray-200 bg-primary-700 border border-primary-600 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/invite/${inv.token}`)}
                        className="text-[13px] font-semibold text-primary-900 bg-primary-500 hover:bg-primary-300 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Ver convite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="w-full grid grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={m.onClick}
                className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700 w-full h-full transition-colors cursor-pointer hover:[background:linear-gradient(180deg,var(--primary-500),var(--primary-800))]"
              >
                <m.icon size={24} className="text-primary-200" />
                <div className="text-[13px] text-gray-300">{m.label}</div>
                <div className="text-[22px] text-gray-200 font-semibold">
                  {m.value}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-[1.2fr,0.8fr] gap-4 min-h-0">
            <div className="flex flex-col gap-4 min-h-0">
              <div className="flex-1 flex flex-col rounded-lg bg-primary-800 border border-primary-700 overflow-hidden min-h-0">
                <div className="px-5 py-4 border-b border-primary-700 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="text-[14px] text-gray-300">
                      Faturamento mês atual comparado ao anterior
                    </div>
                    <div className="text-[28px] text-gray-200 font-bold">
                      {faturamentoMes}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-500" />
                      <span className="text-[12px] text-gray-300">
                        Mês atual
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-primary-700" />
                      <span className="text-[12px] text-gray-300">
                        Mês anterior
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-5 py-4 flex items-end justify-between min-h-0">
                  {WEEKS_LABELS.map((label, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-end gap-2 flex-1"
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-52">
                        <div
                          className={`rounded-sm transition-all duration-700 ease-out
                          ${
                            heightsLast[idx] === 0
                              ? "border border-primary-700 bg-transparent"
                              : "bg-primary-700"
                          }`}
                          style={{
                            width: "20px",
                            height: `${heightsLast[idx] * 100}%`,
                            opacity: heightsLast[idx] > 0 ? 1 : 0.4,
                          }}
                        ></div>

                        <div
                          className={`
                            rounded-sm bg-primary-500 transition-all duration-700 ease-out
                            ${
                              heightsCurrent[idx] === 0
                                ? "border border-primary-500 bg-transparent"
                                : "bg-primary-500"
                            }
                            `}
                          style={{
                            width: "20px",
                            height: `${heightsCurrent[idx] * 100}%`,
                            opacity: heightsCurrent[idx] > 0 ? 1 : 0.4,
                          }}
                        ></div>
                      </div>

                      <span className="text-[11px] text-gray-400">
                        {label}
                      </span>

                      <span className="text-[12px] text-gray-300">
                        {toCurrency(weeklyCurrent[idx])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/dashboard/projetos/novo")}
                  className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 text-[18px] font-semibold transition-colors"
                >
                  Novo projeto
                </button>

                <button className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 text-[18px]">
                  Novo briefing
                </button>
              </div>
            </div>

            <div className="h-full rounded-lg bg-primary-800 border border-primary-700 p-5 flex flex-col gap-4 min-h-0">
              <div className="text-[18px] text-gray-200 font-medium">
                Atividades recentes
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {atividades.length > 0 ? (
                  atividades.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-3 border-b border-primary-700 last:border-b-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary-700 border border-primary-600 flex items-center justify-center text-gray-200 text-[18px]">
                        •
                      </div>

                      <div className="flex-1 flex flex-col gap-1">
                        <div className="text-[14px] text-gray-300 font-medium">
                          {a.tipo}
                        </div>

                        <div className="text-[13px] text-gray-400">
                          {a.descricao}
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-400 whitespace-nowrap">
                        {a.created_at
                          ? new Date(a.created_at).toLocaleDateString("pt-BR")
                          : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-[14px] mt-8 text-center">
                    Nenhuma atividade recente
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-500);
          border-radius: 9999px;
          border: 2px solid var(--primary-800);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-400);
        }

        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getCollabShare(projectId: string, paymentValue: number, ownedMemberSplits: any[]): number {
  const splits = ownedMemberSplits.filter((s) => s.project_id === projectId);
  let total = 0;
  for (const split of splits) {
    if (split.split_type === "percentage") {
      total += paymentValue * (Number(split.split_value) / 100);
    } else {
      total += Number(split.split_value ?? 0);
    }
  }
  return Math.min(total, paymentValue);
}

function buildWeeklyRevenue(payments: any[], projetos: any[], refDate: Date, paidCollabSplits: any[] = [], collabMemberSplits: any[] = [], ownedMemberSplits: any[] = []): number[] {
  const month = refDate.getMonth();
  const year = refDate.getFullYear();
  const weeks = [0, 0, 0, 0];

  const projectsWithPayments = new Set(payments.map(p => p.projeto_id).filter(id => id));

  payments.forEach((p) => {
    let pago = false;
    let projCompleted = false;

    if (p.projeto_id) {
      const proj = projetos.find((proj) => proj.id === p.projeto_id);
      if (proj && proj.status === "Concluído") {
        projCompleted = true;
      }
    }

    const status = String(p.status ?? "").toLowerCase();
    pago =
      projCompleted ||
      status === "pago" ||
      status === "concluido" ||
      status === "recebido" ||
      status === "ok";

    if (!pago) return;

    let d = new Date(p.data_pagamento || p.created_at);
    if (isNaN(d.getTime())) return;

    if (projCompleted && status !== "pago" && status !== "concluido" && status !== "recebido" && status !== "ok") {
       const proj = projetos.find((proj) => proj.id === p.projeto_id);
       if (proj && proj.updated_at) {
          d = new Date(proj.updated_at);
       }
    }

    if (d.getMonth() !== month || d.getFullYear() !== year) return;

    const valor = Number(p.valor ?? 0);
    if (isNaN(valor) || valor <= 0) return;

    const day = d.getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;

    const collabShare = getCollabShare(p.projeto_id, valor, ownedMemberSplits);
    weeks[idx] += Math.max(0, valor - collabShare);
  });

  projetos.forEach((p) => {
    if (projectsWithPayments.has(p.id)) return;

    const orcamento = Number(p.orcamento) || 0;
    if (orcamento <= 0) return;

    const statusNorm = String(p.status || "").toLowerCase();
    const isConcluido = statusNorm === "concluído" || statusNorm === "concluido";
    if (!isConcluido) return;

    const dCompleted = p.updated_at ? new Date(p.updated_at) : new Date(p.created_at);
    if (isNaN(dCompleted.getTime())) return;
    if (dCompleted.getMonth() !== month || dCompleted.getFullYear() !== year) return;

    const day = dCompleted.getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    const collabShare = getCollabShare(p.id, orcamento, ownedMemberSplits);
    weeks[idx] += Math.max(0, orcamento - collabShare);
  });

  paidCollabSplits.forEach((s) => {
    const st = String(s.status || "").toLowerCase();
    if (st !== "pago") return;
    const d = new Date(s.paid_at || s.created_at);
    if (isNaN(d.getTime())) return;
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    const valor = Number(s.amount ?? 0);
    if (valor <= 0) return;
    const day = d.getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    weeks[idx] += valor;
  });

  const projectsWithSplitRecords = new Set(paidCollabSplits.map((s: any) => s.project_id));
  collabMemberSplits.forEach((ms: any) => {
    if (projectsWithSplitRecords.has(ms.project_id)) return;
    const proj = ms.projetos as any;
    if (!proj) return;
    const s = String(proj.status || "").toLowerCase();
    const projConcluido = s === "concluído" || s === "concluido";
    const isPaid = projConcluido || ms.payment_status === "paid";
    if (!isPaid) return;
    const orcamento = Number(proj.orcamento ?? 0);
    const valor = ms.split_type === "percentage"
      ? orcamento * (Number(ms.split_value) / 100)
      : Number(ms.split_value ?? 0);
    if (valor <= 0) return;
    const d = new Date(proj.updated_at || proj.created_at);
    if (isNaN(d.getTime())) return;
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    const day = d.getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    weeks[idx] += valor;
  });

  return weeks;
}