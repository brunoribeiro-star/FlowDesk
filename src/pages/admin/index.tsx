import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Users, Zap, CreditCard, Search, X, ChevronDown, LogOut, RefreshCw, Mail } from "lucide-react";
import clsx from "clsx";

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

type Tab = "usuarios" | "leads";

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
    return { label: "Essencial", cls: "bg-primary-800 text-gray-300 border border-primary-700" };
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
  if (diff <= 0) return null;
  if (diff > 1825) return null; // > 5 anos = conta permanente, não mostrar
  return diff;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("usuarios");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [search, setSearch] = useState("");

  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantPlan, setGrantPlan] = useState<"essencial" | "profissional">("profissional");
  const [grantDays, setGrantDays] = useState(30);
  const [grantLifetime, setGrantLifetime] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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

  useEffect(() => {
    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return;
    fetchUsers();
    fetchLeads();
  }, [user, fetchUsers, fetchLeads]);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const filteredUsers = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.nome ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredLeads = leads.filter(l =>
    !search ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    (l.nome ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    trial: users.filter(u => u.isTrialActive).length,
    pagantes: users.filter(u => !u.isTrialActive && !!u.currentPeriodEnd && new Date(u.currentPeriodEnd) > new Date()).length,
    leads: leads.length,
  };

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
            {[
              { label: "Usuários", value: stats.total, icon: <Users size={16} className="text-primary-400" /> },
              { label: "Trial ativo", value: stats.trial, icon: <Zap size={16} className="text-amber-400" /> },
              { label: "Pagantes", value: stats.pagantes, icon: <CreditCard size={16} className="text-green-400" /> },
              { label: "Leads LP", value: stats.leads, icon: <Mail size={16} className="text-primary-400" /> },
            ].map(s => (
              <div key={s.label} className="bg-primary-800 border border-primary-700 rounded-xl p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">{s.label}</p>
                  <p className="text-[20px] font-bold text-gray-100">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
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

            <div className="flex items-center bg-primary-800 border border-primary-700 rounded-xl p-1">
              {(["usuarios", "leads"] as Tab[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors capitalize",
                    tab === t ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-200"
                  )}
                >
                  {t === "usuarios" ? `Usuários (${users.length})` : `Leads (${leads.length})`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { fetchUsers(); fetchLeads(); }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-primary-800 border border-primary-700 rounded-xl text-[13px] text-gray-400 hover:text-gray-200 hover:bg-primary-700 transition-colors"
            >
              <RefreshCw size={13} />
            </button>
          </div>

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
                  const remaining = daysLeft(u.isTrialActive ? u.trialEnd : u.currentPeriodEnd);
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

                      <div className="hidden md:flex flex-col items-end shrink-0 text-[11px] text-gray-500">
                        <span>Cadastro: {fmt(u.created_at)}</span>
                        {remaining !== null && (
                          <span className={remaining <= 3 ? "text-rose-400" : "text-gray-500"}>
                            {u.isTrialActive ? "Trial" : "Renova"} em {remaining}d
                          </span>
                        )}
                        {!remaining && u.currentPeriodEnd && (
                          <span className="text-rose-400">Expirou {fmt(u.currentPeriodEnd)}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => { setGrantTarget(u); setGrantPlan("profissional"); setGrantDays(30); setGrantLifetime(false); setGrantSuccess(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-200 transition-colors shrink-0"
                      >
                        <Zap size={12} />
                        Conceder
                      </button>
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
                      "flex-1 py-2 rounded-xl text-[13px] font-medium capitalize border transition-colors",
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
              {grantSuccess ? "Plano concedido!" : granting ? "Concedendo..." : grantLifetime ? `Conceder acesso permanente (${grantPlan === "profissional" ? "Profissional" : "Essencial"})` : `Conceder ${grantDays} dias de ${grantPlan === "profissional" ? "Profissional" : "Essencial"}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
