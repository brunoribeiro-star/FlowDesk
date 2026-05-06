import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Users, Zap, CreditCard, Search, X, ChevronDown, LogOut, RefreshCw,
  Mail, Trash2, AlertTriangle,
} from "lucide-react";
import clsx from "clsx";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  created_at: string;
  plan: string;
  status: string;
  isTrialActive: boolean;
  isLifetime: boolean;
  stripeSubscriptionId: string | null;
  billingInterval: "mensal" | "anual" | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  trialUsed: boolean;
}

interface Lead {
  id: string;
  nome: string | null;
  email: string;
  source: string;
  created_at: string;
}

interface RevenueData {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  planDistribution: Record<string, number>;
  weeklyGrowth: { semana: string; novos: number }[];
  trialCount: number;
  totalUsers: number;
}

type Tab = "usuarios" | "leads" | "receita";
type FilterType = "all" | "trial" | "pagantes";

const DURATION_OPTIONS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 ano", days: 365 },
];

function planBadge(user: AdminUser) {
  if (user.isLifetime) {
    return { label: "Permanente", cls: "bg-green-500/15 text-green-400 border border-green-500/30" };
  }
  if (user.isTrialActive) {
    return { label: "Trial ativo", cls: "bg-amber-500/15 text-amber-300 border border-amber-500/30" };
  }
  if (user.plan === "profissional" && user.currentPeriodEnd) {
    return { label: "Profissional", cls: "bg-primary-500/20 text-primary-300 border border-primary-500/30" };
  }
  if (user.plan === "essencial" && user.currentPeriodEnd) {
    return { label: "Essencial", cls: "bg-primary-800 text-gray-300 border border-primary-600" };
  }
  return { label: "Sem plano", cls: "bg-rose-500/15 text-rose-400 border border-rose-500/30" };
}

function initials(nome: string | null, email: string) {
  if (nome) return nome.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return email[0].toUpperCase();
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function daysLeft(date: string | null) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("usuarios");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [search, setSearch] = useState("");

  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantPlan, setGrantPlan] = useState<"essencial" | "profissional">("profissional");
  const [grantDays, setGrantDays] = useState(30);
  const [grantLifetime, setGrantLifetime] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const token = await getToken();
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoadingUsers(false);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    const token = await getToken();
    const res = await fetch("/api/admin/leads", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads ?? []);
    }
    setLoadingLeads(false);
  }, []);

  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    const token = await getToken();
    const res = await fetch("/api/admin/revenue", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRevenueData(data);
    }
    setLoadingRevenue(false);
  }, []);

  useEffect(() => {
    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return;
    fetchUsers();
    fetchLeads();
    fetchRevenue();
  }, [user, fetchUsers, fetchLeads, fetchRevenue]);

  async function handleGrantPlan() {
    if (!grantTarget) return;
    setGranting(true);
    const token = await getToken();
    const res = await fetch("/api/admin/grant-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: grantTarget.id, plan: grantPlan, days: grantDays, lifetime: grantLifetime }),
    });
    if (res.ok) {
      setGrantSuccess(true);
      fetchUsers();
      setTimeout(() => {
        setGrantTarget(null);
        setGrantSuccess(false);
      }, 1200);
    }
    setGranting(false);
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const token = await getToken();
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: deleteTarget.id }),
    });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "Erro ao excluir usuário.");
    }
    setDeleting(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function handleStatClick(filter: FilterType | "leads") {
    if (filter === "leads") {
      setTab("leads");
      setSearch("");
      return;
    }
    setTab("usuarios");
    setActiveFilter(filter);
    setSearch("");
  }

  const now = new Date();

  const filteredUsers = users.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.email.toLowerCase().includes(s) && !(u.nome ?? "").toLowerCase().includes(s)) return false;
    }
    if (activeFilter === "trial") return u.isTrialActive;
    if (activeFilter === "pagantes") {
      return !!u.stripeSubscriptionId && !!u.currentPeriodEnd && new Date(u.currentPeriodEnd) > now;
    }
    return true;
  });

  const filteredLeads = leads.filter(l =>
    !search ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    (l.nome ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    trial: users.filter(u => u.isTrialActive).length,
    pagantes: users.filter(u => !!u.stripeSubscriptionId && !!u.currentPeriodEnd && new Date(u.currentPeriodEnd) > now).length,
    leads: leads.length,
  };

  const planDistributionData = revenueData
    ? Object.entries(revenueData.planDistribution).map(([plan, count]) => ({
        plano: plan === "profissional" ? "Profissional" : "Essencial",
        assinantes: count,
      }))
    : [];

  if (authLoading || !user) return (
    <div className="h-screen flex items-center justify-center bg-primary-900">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Head><title>Admin — FlowDesk</title></Head>

      <div className="min-h-screen bg-primary-900 text-gray-100">

        <div className="border-b border-primary-800 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={110} height={28} priority />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-400 bg-primary-800 border border-primary-700 px-2 py-0.5 rounded-md">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-400 hidden sm:block">{user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {([
              { label: "Usuários", value: stats.total, icon: <Users size={16} className="text-primary-400" />, filter: "all" as const },
              { label: "Trial ativo", value: stats.trial, icon: <Zap size={16} className="text-amber-400" />, filter: "trial" as const },
              { label: "Pagantes", value: stats.pagantes, icon: <CreditCard size={16} className="text-green-400" />, filter: "pagantes" as const },
              { label: "Leads LP", value: stats.leads, icon: <Mail size={16} className="text-primary-400" />, filter: "leads" as const },
            ] as { label: string; value: number; icon: React.ReactNode; filter: FilterType | "leads" }[]).map(s => {
              const isActive = s.filter !== "leads"
                ? tab === "usuarios" && activeFilter === s.filter
                : tab === "leads";
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleStatClick(s.filter)}
                  className={clsx(
                    "bg-primary-800 border rounded-xl p-4 flex items-center gap-3 transition-all text-left",
                    isActive
                      ? "border-primary-500 ring-1 ring-primary-500/30"
                      : "border-primary-700 hover:border-primary-600"
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">{s.label}</p>
                    <p className="text-[20px] font-bold text-gray-100">{s.value}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {tab !== "receita" && (
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder={tab === "leads" ? "Buscar lead..." : "Buscar por nome ou e-mail..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-primary-800 border border-primary-700 rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center bg-primary-800 border border-primary-700 rounded-xl p-1">
              {(["usuarios", "leads", "receita"] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); if (t === "usuarios") setActiveFilter("all"); setSearch(""); }}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                    tab === t ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  {t === "usuarios" ? `Usuários (${users.length})` : t === "leads" ? `Leads (${leads.length})` : "Receita"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { fetchUsers(); fetchLeads(); fetchRevenue(); }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-primary-800 border border-primary-700 rounded-xl text-[13px] text-gray-400 hover:text-gray-200 hover:bg-primary-700 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {tab === "usuarios" && activeFilter !== "all" && (
            <div className="flex items-center gap-2 -mt-2">
              <span className="text-[12px] text-gray-500">Filtrando:</span>
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className="flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-800 border border-primary-600 rounded-full text-[12px] text-primary-300 hover:text-gray-200 transition-colors"
              >
                {activeFilter === "trial" ? "Trial ativo" : "Pagantes"}
                <X size={11} />
              </button>
            </div>
          )}

          {tab === "usuarios" && (
            <div className="flex flex-col gap-2">
              {loadingUsers ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[68px] bg-primary-800 border border-primary-700 rounded-xl animate-pulse" />
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-[14px]">Nenhum usuário encontrado.</div>
              ) : (
                filteredUsers.map(u => {
                  const badge = planBadge(u);
                  const dateForDays = u.isTrialActive ? u.trialEnd : u.currentPeriodEnd;
                  const remaining = u.isLifetime ? null : daysLeft(dateForDays);
                  const isManualGrant = !u.stripeSubscriptionId && !!u.currentPeriodEnd && !u.isLifetime;

                  return (
                    <div key={u.id} className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-[13px] font-semibold text-primary-300 shrink-0">
                        {initials(u.nome, u.email)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-gray-100 truncate">{u.nome ?? "—"}</p>
                        <p className="text-[12px] text-gray-500 truncate">{u.email}</p>
                      </div>

                      <span className={clsx("hidden sm:inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0", badge.cls)}>
                        {badge.label}
                      </span>

                      <div className="hidden md:flex flex-col items-end shrink-0 text-[11px] text-gray-500 min-w-[110px]">
                        <span>Cadastro: {fmt(u.created_at)}</span>
                        {u.isLifetime && (
                          <span className="text-green-400">Acesso permanente</span>
                        )}
                        {!u.isLifetime && remaining !== null && (
                          <span className={remaining <= 3 ? "text-rose-400" : "text-gray-500"}>
                            {u.isTrialActive ? "Trial" : isManualGrant ? "Expira" : "Renova"} em {remaining}d
                          </span>
                        )}
                        {!u.isLifetime && remaining === null && u.currentPeriodEnd && (
                          <span className="text-rose-400">Expirou {fmt(u.currentPeriodEnd)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => { setGrantTarget(u); setGrantPlan("profissional"); setGrantDays(30); setGrantLifetime(false); setGrantSuccess(false); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-200 transition-colors"
                        >
                          <Zap size={12} />
                          Conceder
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDeleteTarget(u); setDeleteError(null); }}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-700 hover:bg-rose-500/15 border border-primary-600 hover:border-rose-500/40 text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "leads" && (
            <div className="flex flex-col gap-2">
              {loadingLeads ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[60px] bg-primary-800 border border-primary-700 rounded-xl animate-pulse" />
                ))
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-[14px]">Nenhum lead encontrado.</div>
              ) : (
                filteredLeads.map(l => (
                  <div key={l.id} className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-[13px] font-semibold text-primary-300 shrink-0">
                      {initials(l.nome, l.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-gray-100 truncate">{l.nome ?? "—"}</p>
                      <p className="text-[12px] text-gray-500 truncate">{l.email}</p>
                    </div>
                    <span className="hidden sm:block text-[11px] text-gray-500 shrink-0">{fmt(l.created_at)}</span>
                    <a
                      href={`mailto:${l.email}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-200 transition-colors shrink-0"
                    >
                      <Mail size={12} />
                      Contatar
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "receita" && (
            <div className="flex flex-col gap-4">
              {loadingRevenue ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : revenueData ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                      <p className="text-[11px] text-gray-500 mb-1">MRR</p>
                      <p className="text-[26px] font-bold text-gray-100">{fmtCurrency(revenueData.mrr)}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">receita mensal recorrente</p>
                    </div>
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                      <p className="text-[11px] text-gray-500 mb-1">ARR</p>
                      <p className="text-[26px] font-bold text-gray-100">{fmtCurrency(revenueData.arr)}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">receita anual recorrente</p>
                    </div>
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                      <p className="text-[11px] text-gray-500 mb-1">Assinantes ativos</p>
                      <p className="text-[26px] font-bold text-gray-100">{revenueData.activeSubscribers}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">planos Stripe ativos</p>
                    </div>
                  </div>

                  <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                    <h3 className="text-[14px] font-semibold text-gray-200 mb-4">Novos usuários por semana (últimas 12 semanas)</h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData.weeklyGrowth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradNovos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                          <XAxis
                            dataKey="semana"
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2 text-[12px] shadow-xl">
                                  <div className="text-gray-400 mb-0.5">{label}</div>
                                  <div className="text-gray-100 font-medium">{payload[0].value} novos usuários</div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="novos"
                            stroke="var(--primary-500)"
                            strokeWidth={2}
                            fill="url(#gradNovos)"
                            dot={false}
                            activeDot={{ r: 4, fill: "var(--primary-500)" }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {planDistributionData.length > 0 && (
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-5">
                      <h3 className="text-[14px] font-semibold text-gray-200 mb-4">Distribuição de planos (assinantes ativos)</h3>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={planDistributionData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                            <XAxis
                              dataKey="plano"
                              tick={{ fill: "#9ca3af", fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "#9ca3af", fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              content={({ active, payload, label }: any) => {
                                if (!active || !payload?.length) return null;
                                return (
                                  <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2 text-[12px] shadow-xl">
                                    <div className="text-gray-400 mb-0.5">{label}</div>
                                    <div className="text-gray-100 font-medium">{payload[0].value} assinantes</div>
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="assinantes" fill="var(--primary-500)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {planDistributionData.length === 0 && (
                    <div className="bg-primary-800 border border-primary-700 rounded-xl p-8 text-center">
                      <p className="text-[13px] text-gray-500">Nenhum assinante Stripe ativo ainda.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 text-[14px]">Falha ao carregar dados de receita.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {grantTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => !granting && setGrantTarget(null)}
        >
          <div
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-100">Conceder plano</h2>
                <p className="text-[13px] text-gray-500 mt-0.5 truncate max-w-[220px]">{grantTarget.nome ?? grantTarget.email}</p>
              </div>
              <button type="button" onClick={() => setGrantTarget(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-gray-400">Plano</label>
              <div className="flex gap-2">
                {(["essencial", "profissional"] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setGrantPlan(p)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-[13px] font-medium border transition-colors",
                      grantPlan === p
                        ? "bg-primary-500/20 border-primary-500 text-primary-300"
                        : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
                    )}
                  >
                    {p === "essencial" ? "Essencial" : "Profissional"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setGrantLifetime(v => !v)}
              className={clsx(
                "flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-[13px] transition-colors",
                grantLifetime
                  ? "bg-green-500/15 border-green-500/40 text-green-300"
                  : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
              )}
            >
              <span>Acesso permanente</span>
              <div className={clsx(
                "w-8 h-4 rounded-full relative transition-colors",
                grantLifetime ? "bg-green-500" : "bg-primary-600"
              )}>
                <div className={clsx(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                  grantLifetime ? "translate-x-4" : "translate-x-0.5"
                )} />
              </div>
            </button>

            {!grantLifetime && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-400">Duração</label>
                <div className="relative">
                  <select
                    value={grantDays}
                    onChange={e => setGrantDays(Number(e.target.value))}
                    className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 appearance-none transition-colors"
                  >
                    {DURATION_OPTIONS.map(opt => (
                      <option key={opt.days} value={opt.days}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGrantPlan}
              disabled={granting || grantSuccess}
              className={clsx(
                "w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
                grantSuccess
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-primary-500 hover:bg-primary-400 text-primary-900 disabled:opacity-60"
              )}
            >
              {grantSuccess
                ? "Plano concedido!"
                : granting
                ? "Concedendo..."
                : grantLifetime
                ? `Acesso permanente — ${grantPlan === "profissional" ? "Profissional" : "Essencial"}`
                : `Conceder ${grantDays}d de ${grantPlan === "profissional" ? "Profissional" : "Essencial"}`}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-gray-100">Excluir conta</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">Esta ação é permanente e não pode ser desfeita.</p>
              </div>
              <button type="button" onClick={() => !deleting && setDeleteTarget(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3">
              <p className="text-[14px] font-medium text-gray-200">{deleteTarget.nome ?? "—"}</p>
              <p className="text-[12px] text-gray-500">{deleteTarget.email}</p>
            </div>

            {deleteError && (
              <p className="text-[13px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-primary-800 border border-primary-700 text-[13px] text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
              >
                {deleting ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
