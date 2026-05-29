"use client";

import { useMemo, useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import HeaderProfile from "@/components/HeaderProfile";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonStatCard, SkeletonList } from "@/components/Skeleton";

import {
  FolderKanban,
  AlertCircle,
  Wallet,
  HardDrive,
  CheckSquare,
  Paperclip,
  DollarSign,
  FileText,
  Activity,
  Users,
  X,
  Search,
  ArrowUp,
  Plus,
} from "lucide-react";

const WEEKS_LABELS = ["Semana 1", "Semana 2", "Semana 3", "Semana 4"];

const ACCENT_CYAN = {
  color: "var(--primary-400)",
  soft: "rgba(79,197,235,0.12)",
  line: "rgba(79,197,235,0.40)",
  top: "linear-gradient(90deg, var(--primary-400), transparent 60%)",
};
const ACCENT_SUCCESS = {
  color: "var(--success-medium)",
  soft: "rgba(102,187,106,0.12)",
  line: "rgba(102,187,106,0.38)",
  top: "linear-gradient(90deg, var(--success-medium), transparent 60%)",
};

export default function DashboardHome() {
  const router = useRouter();

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
  const [ownedCollabPaySplitsPending, setOwnedCollabPaySplitsPending] = useState<any[]>([]);

  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{ projetos: any[]; tarefas: any[]; clientes: any[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [storageUsedGB, setStorageUsedGB] = useState<number | null>(null);
  const [storageLimitGB, setStorageLimitGB] = useState<number>(5);

  const [heightsCurrent, setHeightsCurrent] = useState<number[]>([0, 0, 0, 0]);
  const [heightsLast, setHeightsLast] = useState<number[]>([0, 0, 0, 0]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  useEffect(() => {
    function handleUserUpdated(event: any) {
      const updatedUser = event.detail?.user;
      if (updatedUser) setUser(updatedUser);
    }
    window.addEventListener("flowdesk:user-updated", handleUserUpdated as any);
    return () => window.removeEventListener("flowdesk:user-updated", handleUserUpdated as any);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) { setSearchResults(null); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    const timer = setTimeout(async () => {
      const pattern = `%${q}%`;
      const [projRes, tarefasRes, clientesRes] = await Promise.all([
        supabase.from("projetos").select("id, titulo, status").ilike("titulo", pattern).eq("user_id", authUser?.id ?? "").limit(5),
        supabase.from("tasks").select("id, titulo, status, projeto_id").ilike("titulo", pattern).limit(5),
        supabase.from("clientes").select("id, nome, email").ilike("nome", pattern).eq("user_id", authUser?.id ?? "").limit(5),
      ]);
      setSearchResults({
        projetos: projRes.data ?? [],
        tarefas: tarefasRes.data ?? [],
        clientes: clientesRes.data ?? [],
      });
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, authUser]);

  useEffect(() => {
    const CACHE_KEY = "flowdesk_storage_cache";
    const CACHE_TTL = 5 * 60 * 1000;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { usedGB, limitGB, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setStorageUsedGB(usedGB);
          setStorageLimitGB(limitGB);
        }
      }
    } catch {}
    async function fetchStorage() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch("/api/subscription/storage-usage", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setStorageUsedGB(json.usedGB);
          setStorageLimitGB(json.limitGB);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ usedGB: json.usedGB, limitGB: json.limitGB, ts: Date.now() }));
        }
      } catch {}
    }
    fetchStorage();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    setUser(authUser);
    async function fetchData() {
      setLoading(true);
      const [projRes, atvRes, payRes, tasksRes, memberProjectsRes, collabPayRes, collabSplitRes, pendingInvitesRes, ownedMemberSplitsRes, ownedCollabPendingRes] = await Promise.all([
        supabase.from("projetos").select("id, titulo, status, progresso, prazo_entrega, cliente_id, orcamento, cover_url, created_at, forma_pagamento, updated_at").eq("user_id", authUser!.id).order("created_at", { ascending: false }),
        supabase.from("atividades").select("id, tipo, descricao, created_at, user_id").eq("user_id", authUser!.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("pagamentos").select("id, valor, status, data_pagamento, data_prevista, projeto_id, created_at").eq("user_id", authUser!.id),
        supabase.from("tasks").select("id, titulo, status, due_date, projeto_id, projetos!inner(user_id)").eq("projetos.user_id", authUser!.id),
        supabase.from("project_members").select("project_id, projetos:project_id(id, status)").eq("user_id", authUser!.id),
        supabase.from("collaborator_payment_splits").select("id, project_id, amount, status, paid_at, created_at").eq("member_user_id", authUser!.id),
        supabase.from("project_member_splits").select("project_id, split_type, split_value, payment_status, projetos:project_id(orcamento, status, updated_at)").eq("member_user_id", authUser!.id),
        supabase.from("project_invites").select("id, token, project_id, invited_by, split_type, split_value, expires_at, projetos:project_id(titulo)").eq("invited_email", (authUser!.email || "").toLowerCase()).eq("status", "pending"),
        supabase.from("project_member_splits").select("project_id, member_user_id, split_type, split_value, projetos:project_id!inner(user_id)").eq("projetos.user_id", authUser!.id).neq("member_user_id", authUser!.id),
        supabase.from("collaborator_payment_splits").select("amount, project_id, projetos:project_id!inner(user_id)").eq("projetos.user_id", authUser!.id).eq("status", "pendente"),
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
      setOwnedMemberSplits((ownedMemberSplitsRes.data || []) as any[]);
      setOwnedCollabPaySplitsPending((ownedCollabPendingRes.data || []) as any[]);
      setLoading(false);
    }
    fetchData();
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.email) return;
    const email = (authUser.email || "").toLowerCase();
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "project_invites", filter: `invited_email=eq.${email}` }, () => {
        supabase.from("project_invites").select("id, token, project_id, invited_by, split_type, split_value, expires_at, projetos:project_id(titulo)").eq("invited_email", email).eq("status", "pending").then(({ data }) => { if (data) setPendingInvites(data as any[]); });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "collaborator_payment_splits", filter: `member_user_id=eq.${authUser.id}` }, () => {
        supabase.from("collaborator_payment_splits").select("id, project_id, amount, status, paid_at, created_at").eq("member_user_id", authUser.id).then(({ data }) => { if (data) setCollabPaySplits(data as any[]); });
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "project_member_splits", filter: `member_user_id=eq.${authUser.id}` }, () => {
        supabase.from("project_member_splits").select("project_id, split_type, split_value, payment_status, projetos:project_id(orcamento, status, updated_at)").eq("member_user_id", authUser.id).then(({ data }) => { if (data) setCollabMemberSplits(data as any[]); });
      })
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "pagamentos", filter: `user_id=eq.${authUser.id}` }, () => {
        supabase.from("pagamentos").select("id, valor, status, data_pagamento, data_prevista, projeto_id, created_at").eq("user_id", authUser.id).then(({ data }) => { if (data) setPagamentos(data); });
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

  const faturamentoMes = toCurrency(weeklyCurrent.reduce((acc, v) => acc + v, 0));

  const peakIdx = useMemo(() => {
    const max = Math.max(...weeklyCurrent);
    return max > 0 ? weeklyCurrent.indexOf(max) : -1;
  }, [weeklyCurrent]);

  const growthPct = useMemo(() => {
    const curr = weeklyCurrent.reduce((a, b) => a + b, 0);
    const last = weeklyLast.reduce((a, b) => a + b, 0);
    if (last <= 0) return null;
    return Math.round(((curr - last) / last) * 100);
  }, [weeklyCurrent, weeklyLast]);

  const projetosAtivos = useMemo(
    () => projetos.filter((p) => {
      const s = String(p.status || "").toLowerCase();
      return s !== "concluído" && s !== "concluido" && s !== "cancelado" && s !== "arquivado";
    }).length + collaboratedActiveCount,
    [projetos, collaboratedActiveCount]
  );

  const pagamentosPendentesTotal = useMemo(() => {
    const projectsWithPayments = new Set(pagamentos.map(p => p.projeto_id).filter(id => id));
    const pendentes = pagamentos.filter((p) => {
      if (!p.status) return true;
      const s = String(p.status).toLowerCase();
      return s !== "pago" && s !== "concluido" && s !== "recebido" && s !== "ok";
    });
    let total = pendentes.reduce((acc, p) => acc + Number(p.valor ?? 0), 0);
    projetos.forEach((p) => {
      if (projectsWithPayments.has(p.id)) return;
      const orcamento = Number(p.orcamento) || 0;
      if (orcamento <= 0) return;
      const fp = p.forma_pagamento;
      if (fp === "pix_2x" || fp === "50/50") { total += orcamento / 2; }
      else if (fp === "pix" || fp === "cartao") { total += orcamento; }
    });
    const ownedCollabPending = ownedCollabPaySplitsPending.reduce((acc: number, s: any) => acc + Number(s.amount ?? 0), 0);
    return Math.max(0, total - ownedCollabPending);
  }, [pagamentos, projetos, ownedCollabPaySplitsPending]);

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

  const pagamentosAbertosCount = useMemo(() => {
    return pagamentos.filter(p => {
      const s = String(p.status || "").toLowerCase();
      return s !== "pago" && s !== "concluido" && s !== "recebido" && s !== "ok";
    }).length;
  }, [pagamentos]);

  const projetosNovosEsteMes = useMemo(() => {
    const d = new Date();
    return projetos.filter(p => {
      const pd = new Date(p.created_at);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    }).length;
  }, [projetos]);

  const avatarSrc = user?.user_metadata?.avatar_url || null;
  const displayName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

  const faturamentoPartes = faturamentoMes.split(",");
  const faturamentoPrincipal = faturamentoPartes[0] ?? faturamentoMes;
  const faturamentoCentavos = faturamentoPartes[1] ?? "00";

  function handleSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (!searchTerm.trim()) return;
      setSearchOpen(false);
      setSearchModalOpen(true);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchModalOpen(false);
    }
  }

  if (loading)
    return (
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
    );

  const METRICS = [
    {
      id: "projAtivos",
      icon: FolderKanban,
      accent: ACCENT_CYAN,
      label: "Projetos ativos",
      value: projetosAtivos === 0 ? "Nenhum ativo" : `${projetosAtivos} projeto${projetosAtivos > 1 ? "s" : ""}`,
      calm: false,
      trend: projetosNovosEsteMes > 0 ? `+${projetosNovosEsteMes} este mês` : "Sem novos",
      onClick: () => router.push("/dashboard/projetos"),
    },
    {
      id: "tarefas",
      icon: AlertCircle,
      accent: ACCENT_SUCCESS,
      label: "Tarefas vencendo",
      value: tarefasVencendo === 0 ? "Nenhuma" : `${tarefasVencendo} tarefa${tarefasVencendo > 1 ? "s" : ""}`,
      calm: tarefasVencendo === 0,
      trend: tarefasVencendo === 0 ? "Tudo em dia" : "Atenção necessária",
      onClick: () => router.push("/dashboard/tarefas"),
    },
    {
      id: "pay",
      icon: Wallet,
      accent: ACCENT_CYAN,
      label: "Pagamentos a receber",
      value: toCurrency(pagamentosPendentesTotal),
      calm: false,
      trend: pagamentosAbertosCount === 0 ? "Em dia" : pagamentosAbertosCount === 1 ? "1 em aberto" : `${pagamentosAbertosCount} em aberto`,
      onClick: () => router.push("/dashboard/pagamentos"),
    },
  ];


  return (
    <>
      <div className="relative flex flex-col flex-1 gap-5 pr-6 py-6 w-full overflow-hidden">
        <div
          className="pointer-events-none absolute rounded-full z-0"
          style={{
            width: "480px", height: "480px", right: "-160px", bottom: "-200px",
            background: "radial-gradient(circle, var(--primary-700), transparent 70%)",
            filter: "blur(100px)",
          }}
        />

        <header className="relative z-20 flex items-center gap-6">
          <div className="flex items-center gap-4 flex-none">
            <UserAvatar
              src={avatarSrc}
              name={displayName}
              size={54}
              className="border-2 border-primary-600"
            />
            <div>
              <h1 className="m-0 text-[24px] font-semibold tracking-tight text-gray-100 leading-tight">
                Olá, {displayName}
              </h1>
              <p className="m-0 mt-0.5 text-[15px] text-gray-400">
                Aqui está o resumo do seu trabalho.
              </p>
            </div>
          </div>

          <div ref={searchRef} className="flex-1 relative">
            <div
              className="flex items-center gap-3 h-[52px] px-[18px] rounded-[14px] border border-gray-700 text-gray-400 transition-colors focus-within:border-primary-600"
              style={{ background: "var(--primary-800)" }}
            >
              <Search size={20} className="shrink-0" />
              <input
                type="text"
                placeholder="Buscar por projetos, tarefas, clientes…"
                className="flex-1 bg-transparent border-0 outline-none text-[15.5px] text-gray-100 placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
                onFocus={() => { if (searchTerm.trim()) setSearchOpen(true); }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); setSearchResults(null); setSearchOpen(false); }}>
                  <X size={14} className="text-gray-400 hover:text-gray-200" />
                </button>
              )}
            </div>

            {searchOpen && searchTerm.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-primary-800 border border-primary-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                {searchLoading ? (
                  <div className="px-4 py-3 text-[13px] text-gray-400">Buscando...</div>
                ) : !searchResults || (searchResults.projetos.length + searchResults.tarefas.length + searchResults.clientes.length) === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-gray-400">Nenhum resultado encontrado.</div>
                ) : (
                  <div className="flex flex-col">
                    {searchResults.projetos.length > 0 && (
                      <div>
                        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Projetos</div>
                        {searchResults.projetos.map((p) => (
                          <button key={p.id} onClick={() => { setSearchOpen(false); router.push(`/dashboard/projetos/${p.id}`); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-700 transition-colors text-left">
                            <FolderKanban size={14} className="text-primary-300 shrink-0" />
                            <span className="text-[13px] text-gray-200 truncate">{p.titulo}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.tarefas.length > 0 && (
                      <div>
                        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tarefas</div>
                        {searchResults.tarefas.map((t) => (
                          <button key={t.id} onClick={() => { setSearchOpen(false); router.push(`/dashboard/tarefas/${t.id}`); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-700 transition-colors text-left">
                            <CheckSquare size={14} className="text-primary-300 shrink-0" />
                            <span className="text-[13px] text-gray-200 truncate">{t.titulo}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.clientes.length > 0 && (
                      <div>
                        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Clientes</div>
                        {searchResults.clientes.map((c) => (
                          <button key={c.id} onClick={() => { setSearchOpen(false); router.push(`/dashboard/clientes`); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary-700 transition-colors text-left">
                            <Users size={14} className="text-primary-300 shrink-0" />
                            <span className="text-[13px] text-gray-200 truncate">{c.nome}</span>
                            {c.email && <span className="text-[12px] text-gray-500 truncate">{c.email}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { setSearchOpen(false); setSearchModalOpen(true); }} className="w-full px-4 py-3 text-[12px] text-primary-300 hover:bg-primary-700 border-t border-primary-700 text-left transition-colors">
                      Ver todos os resultados para <strong>"{searchTerm}"</strong>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <HeaderProfile />
        </header>

        {pendingInvites.length > 0 && (
          <div className="relative z-10 flex flex-col gap-2">
            {pendingInvites.map((inv: any) => {
              const projetoTitulo = inv.projetos?.titulo || "Projeto";
              const splitLabel = inv.split_value != null
                ? (inv.split_type === "percentage"
                    ? ` · ${inv.split_value}% do projeto`
                    : ` · ${Number(inv.split_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`)
                : "";
              return (
                <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-[14px] border border-primary-600"
                     style={{ background: "var(--primary-800)" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" style={{ boxShadow: "0 0 10px -1px var(--primary-500)" }} />
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

        <section className="relative z-10 grid grid-cols-4 gap-5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={m.onClick}
              className="relative overflow-hidden flex flex-col p-[22px_24px_24px] rounded-[20px] border border-gray-700 transition-all duration-200 hover:-translate-y-[3px] hover:border-primary-400 cursor-pointer text-left"
              style={{ background: "var(--primary-800)" }}
            >
              <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[20px] opacity-80"
                   style={{ background: m.accent.top }} />
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-11 h-11 rounded-[12px] flex items-center justify-center border"
                  style={{ color: m.accent.color, background: m.accent.soft, borderColor: m.accent.line }}
                >
                  <m.icon size={22} />
                </div>
                <span
                  className="text-[12.5px] font-medium text-gray-400 px-[10px] py-1 rounded-full"
                  style={{ background: "var(--primary-700)" }}
                >
                  {m.trend}
                </span>
              </div>
              <p className="m-0 text-[14px] text-gray-400">{m.label}</p>
              <p className={`m-0 mt-0.5 text-[28px] font-bold tracking-tight tabular-nums leading-tight ${m.calm ? "text-success-medium" : "text-gray-100"}`}>
                {m.value}
              </p>
            </button>
          ))}

          <button
            type="button"
            onClick={() => router.push("/dashboard/configuracoes?tab=armazenamento")}
            className="relative overflow-hidden flex flex-col p-[22px_24px_24px] rounded-[20px] border border-gray-700 transition-all duration-200 hover:-translate-y-[3px] hover:border-primary-400 cursor-pointer text-left"
            style={{ background: "var(--primary-800)" }}
          >
            <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-[20px] opacity-80"
                 style={{ background: "linear-gradient(90deg, var(--primary-400), transparent 60%)" }} />
            <div className="flex items-center mb-3">
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center border"
                style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}
              >
                <HardDrive size={22} />
              </div>
            </div>
            <p className="m-0 text-[14px] text-gray-400">Armazenamento</p>
            {storageUsedGB !== null ? (
              <>
                <p className="m-0 mt-0.5 text-[28px] font-bold tracking-tight text-gray-100 leading-tight">
                  {storageUsedGB < 1 ? `${(storageUsedGB * 1024).toFixed(0)} MB` : `${storageUsedGB.toFixed(2)} GB`}
                </p>
                <div
                  className="mt-3.5 h-[7px] rounded-full overflow-hidden"
                  style={{ background: "var(--primary-700)" }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((storageUsedGB / storageLimitGB) * 100, 100)}%`,
                      background: storageUsedGB / storageLimitGB > 0.85
                        ? "var(--error-medium)"
                        : storageUsedGB / storageLimitGB > 0.6
                        ? "var(--alert-medium)"
                        : "linear-gradient(90deg, var(--primary-400), var(--primary-500))",
                      boxShadow: "0 0 12px -1px var(--primary-500)",
                    }}
                  />
                </div>
                <p className="m-0 mt-2 text-[12.5px] text-gray-500">de {storageLimitGB} GB usados</p>
              </>
            ) : (
              <p className="m-0 mt-0.5 text-[28px] font-bold tracking-tight text-gray-100 leading-tight">–</p>
            )}
          </button>
        </section>

        <section
          className="relative z-10 flex-1 min-h-0"
          style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "20px" }}
        >
          <div
            className="flex flex-col rounded-[22px] border border-gray-700 p-[26px_28px]"
            style={{ background: "var(--primary-800)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="m-0 mb-2.5 text-[13.5px] font-medium text-gray-400">
                  Faturamento · mês atual vs. anterior
                </p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-[38px] font-bold text-gray-100 tracking-tight tabular-nums leading-none">
                    {faturamentoPrincipal}
                    <span className="text-[22px] font-semibold text-gray-300">,{faturamentoCentavos}</span>
                  </span>
                  {growthPct !== null && growthPct !== 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-300 px-[10px] py-[4px] rounded-full border self-center"
                      style={{ background: "rgba(30,182,232,0.12)", borderColor: "rgba(30,182,232,0.30)" }}
                    >
                      <ArrowUp size={13} />
                      {growthPct > 0 ? "+" : ""}{growthPct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end flex-none">
                <span className="flex items-center gap-2 text-[13px] text-gray-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full bg-primary-400"
                    style={{ boxShadow: "0 0 10px -1px var(--primary-500)" }}
                  />
                  Mês atual
                </span>
                <span className="flex items-center gap-2 text-[13px] text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                  Mês anterior
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 mt-6 flex flex-col overflow-visible">
              <div className="flex-1 min-h-0 relative overflow-visible">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-px" style={{ background: "var(--primary-700)" }} />
                  ))}
                </div>

                <div className="absolute inset-0 flex gap-[18px]">
                  {WEEKS_LABELS.map((_, idx) => {
                    const isPeak = idx === peakIdx && heightsCurrent[idx] > 0;
                    const isHovered = hoveredBar === idx;
                    return (
                      <div
                        key={idx}
                        className="flex-1 h-full flex items-end justify-center overflow-visible cursor-default"
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        <div className="flex items-end gap-1.5 h-full overflow-visible justify-center">
                          <div
                            className="w-5 rounded-t-[6px]"
                            style={{
                              height: heightsLast[idx] > 0 ? `${heightsLast[idx] * 100}%` : "4px",
                              background: heightsLast[idx] > 0
                                ? isHovered ? "var(--primary-600)" : "var(--primary-700)"
                                : "transparent",
                              border: heightsLast[idx] === 0 ? "1px solid var(--primary-600)" : "none",
                              transition: "height 700ms ease-out, background 200ms ease",
                            }}
                          />
                          <div
                            className="relative rounded-t-[8px] overflow-visible"
                            style={{
                              width: "28px",
                              height: heightsCurrent[idx] > 0 ? `${heightsCurrent[idx] * 100}%` : "4px",
                              background: isPeak
                                ? "linear-gradient(180deg, var(--primary-300), var(--primary-500))"
                                : heightsCurrent[idx] > 0
                                ? "var(--primary-500)"
                                : "transparent",
                              border: heightsCurrent[idx] === 0 ? "1px solid var(--primary-600)" : "none",
                              boxShadow: isPeak
                                ? isHovered
                                  ? "0 0 40px -2px rgba(30,182,232,0.8), inset 0 1px 0 rgba(255,255,255,0.25)"
                                  : "0 0 30px -4px rgba(30,182,232,0.6), inset 0 1px 0 rgba(255,255,255,0.2)"
                                : heightsCurrent[idx] > 0 && isHovered
                                  ? "0 0 20px -4px rgba(30,182,232,0.5)"
                                  : "none",
                              opacity: isHovered || hoveredBar === null ? 1 : 0.6,
                              filter: isHovered && !isPeak && heightsCurrent[idx] > 0 ? "brightness(1.2)" : "none",
                              transition: "height 700ms ease-out, box-shadow 200ms ease, opacity 200ms ease, filter 200ms ease",
                            }}
                          >
                            {isHovered && heightsCurrent[idx] > 0 && (
                              <div
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[12px] font-semibold px-2.5 py-1 rounded-[8px] z-20"
                                style={{
                                  color: "var(--primary-900)",
                                  background: "var(--primary-300)",
                                  boxShadow: "0 8px 20px -8px rgba(30,182,232,0.8)",
                                  animation: "fadeIn 0.1s ease-out",
                                }}
                              >
                                {toCurrency(weeklyCurrent[idx])}
                                <div
                                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                                  style={{
                                    borderLeft: "5px solid transparent",
                                    borderRight: "5px solid transparent",
                                    borderTop: "5px solid var(--primary-300)",
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-[18px] mt-3.5 shrink-0">
                {WEEKS_LABELS.map((label, idx) => {
                  const isPeak = idx === peakIdx && heightsCurrent[idx] > 0;
                  const isHovered = hoveredBar === idx;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <span className="text-[13px] text-gray-300">{label}</span>
                      <span
                        className="mt-0.5 text-[12.5px] font-semibold tabular-nums transition-colors duration-200"
                        style={{
                          color: isHovered
                            ? "var(--primary-300)"
                            : isPeak
                            ? "var(--primary-400)"
                            : "var(--gray-500)",
                        }}
                      >
                        {toCurrency(weeklyCurrent[idx])}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3.5 mt-4">
              <button
                type="button"
                onClick={() => router.push("/dashboard/projetos/novo")}
                className="flex flex-1 items-center justify-center gap-2 h-[54px] text-[16px] font-semibold rounded-[14px] border-0 cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  color: "var(--primary-900)",
                  background: "linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)",
                  boxShadow: "0 14px 32px -14px rgba(30,182,232,0.8)",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={18} /> Novo projeto
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/briefings/novo")}
                className="flex flex-1 items-center justify-center gap-2 h-[54px] text-[16px] font-semibold text-gray-100 rounded-[14px] border border-gray-600 cursor-pointer transition-colors duration-200 hover:border-primary-600 hover:text-gray-100"
                style={{ background: "var(--primary-800)", fontFamily: "inherit" }}
              >
                <FileText size={18} /> Novo briefing
              </button>
            </div>
          </div>

          <div
            className="flex flex-col rounded-[22px] border border-gray-700 p-[26px_28px] overflow-hidden"
            style={{ background: "var(--primary-800)" }}
          >
            <p className="m-0 text-[19px] font-semibold text-gray-100">Atividades recentes</p>

            <ul className="list-none m-0 p-0 mt-5 flex flex-col gap-1.5 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0">
              {atividades.length > 0 ? (
                atividades.map((a, i) => {
                  const isTask = isTaskActivity(a.tipo);
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-3.5 px-3 py-3.5 rounded-[14px] transition-colors hover:bg-white/5 cursor-default"
                    >
                      <span
                        className="flex-none grid place-items-center w-[38px] h-[38px] rounded-[11px] border shrink-0"
                        style={{
                          color: isTask ? "var(--success-medium)" : "var(--primary-300)",
                          background: isTask ? "rgba(102,187,106,0.12)" : "rgba(30,182,232,0.10)",
                          borderColor: isTask ? "rgba(102,187,106,0.28)" : "rgba(30,182,232,0.25)",
                        }}
                      >
                        {getAtividadeIconDesign(a.tipo)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="m-0 text-[11px] font-semibold tracking-[0.08em] uppercase"
                          style={{ color: isTask ? "var(--success-medium)" : "var(--primary-300)" }}
                        >
                          {getAtividadeLabel(a.tipo)}
                        </p>
                        <p className="m-0 mt-1 text-[14px] text-gray-200 leading-[1.35] overflow-hidden text-ellipsis whitespace-nowrap">
                          {a.descricao}
                        </p>
                      </div>
                      <span className="flex-none text-[12px] text-gray-500 tabular-nums">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : ""}
                      </span>
                    </li>
                  );
                })
              ) : (
                <li className="text-gray-400 text-[14px] mt-8 text-center">
                  Nenhuma atividade recente
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>

      {searchModalOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchModalOpen(false)}
        >
          <div
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-primary-700">
              <Search size={15} className="text-gray-400 shrink-0" />
              <span className="text-[14px] text-gray-200 flex-1">Resultados para <strong>"{searchTerm}"</strong></span>
              <button onClick={() => setSearchModalOpen(false)}><X size={16} className="text-gray-400 hover:text-gray-200" /></button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
              {searchLoading ? (
                <div className="px-4 py-6 text-[13px] text-gray-400 text-center">Buscando...</div>
              ) : !searchResults || (searchResults.projetos.length + searchResults.tarefas.length + searchResults.clientes.length) === 0 ? (
                <div className="px-4 py-8 text-[13px] text-gray-400 text-center">Nenhum resultado encontrado.</div>
              ) : (
                <div className="flex flex-col divide-y divide-primary-700">
                  {searchResults.projetos.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2"><FolderKanban size={12} /> Projetos ({searchResults.projetos.length})</div>
                      {searchResults.projetos.map((p) => (
                        <button key={p.id} onClick={() => { setSearchModalOpen(false); router.push(`/dashboard/projetos/${p.id}`); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-800 transition-colors text-left">
                          <FolderKanban size={15} className="text-primary-300 shrink-0" />
                          <span className="text-[14px] text-gray-200">{p.titulo}</span>
                          <span className="ml-auto text-[11px] text-gray-500 capitalize">{p.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.tarefas.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2"><CheckSquare size={12} /> Tarefas ({searchResults.tarefas.length})</div>
                      {searchResults.tarefas.map((t) => (
                        <button key={t.id} onClick={() => { setSearchModalOpen(false); router.push(`/dashboard/tarefas/${t.id}`); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-800 transition-colors text-left">
                          <CheckSquare size={15} className="text-primary-300 shrink-0" />
                          <span className="text-[14px] text-gray-200">{t.titulo}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.clientes.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Users size={12} /> Clientes ({searchResults.clientes.length})</div>
                      {searchResults.clientes.map((c) => (
                        <button key={c.id} onClick={() => { setSearchModalOpen(false); router.push(`/dashboard/clientes`); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-800 transition-colors text-left">
                          <Users size={15} className="text-primary-300 shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-[14px] text-gray-200">{c.nome}</span>
                            {c.email && <span className="text-[12px] text-gray-500">{c.email}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--primary-700);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: var(--primary-600);
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function isTaskActivity(tipo: string): boolean {
  const t = (tipo || "").toLowerCase();
  return t === "tarefa_concluida" || t === "tarefa";
}

function getAtividadeLabel(tipo: string): string {
  const t = (tipo || "").toLowerCase();
  if (t === "tarefa_concluida") return "Tarefa concluída";
  if (t === "tarefa") return "Tarefa";
  if (t === "arquivo_enviado") return "Arquivo enviado";
  if (t === "arquivo") return "Arquivo";
  if (t === "pagamentos" || t === "pagamento") return "Pagamento";
  if (t === "projetos" || t === "projeto") return "Projeto";
  if (t === "briefing") return "Briefing";
  return "Atividade";
}

function getAtividadeIconDesign(tipo: string) {
  const t = (tipo || "").toLowerCase();
  if (t === "tarefa_concluida" || t === "tarefa") return <CheckSquare size={18} />;
  if (t === "arquivo_enviado" || t === "arquivo") return <Paperclip size={18} />;
  if (t === "pagamentos" || t === "pagamento") return <DollarSign size={18} />;
  if (t === "projetos" || t === "projeto") return <FolderKanban size={18} />;
  if (t === "briefing") return <FileText size={18} />;
  return <Activity size={18} />;
}

function toCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
      if (proj && proj.status === "Concluído") projCompleted = true;
    }
    const status = String(p.status ?? "").toLowerCase();
    pago = projCompleted || status === "pago" || status === "concluido" || status === "recebido" || status === "ok";
    if (!pago) return;
    let d = new Date(p.data_pagamento || p.created_at);
    if (isNaN(d.getTime())) return;
    if (projCompleted && status !== "pago" && status !== "concluido" && status !== "recebido" && status !== "ok") {
      const proj = projetos.find((proj) => proj.id === p.projeto_id);
      if (proj && proj.updated_at) d = new Date(proj.updated_at);
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
