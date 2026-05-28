import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Users, Zap, Search, X, ChevronDown, LogOut,
  RefreshCw, Mail, Trash2, AlertTriangle, LayoutDashboard,
  ExternalLink, Camera, Phone, CheckCircle2,
  FolderOpen, Clock, UserRound,
} from "lucide-react";
import clsx from "clsx";
import {
  ComposedChart, Bar, Line,
  AreaChart, Area,
  BarChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  plan: string;
  status: string;
  isTrialActive: boolean;
  isLifetime: boolean;
  stripeSubscriptionId: string | null;
  billingInterval: "mensal" | "anual" | null;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  trialUsed: boolean;
  projetos_ativos: number;
  clientes_count: number;
  horas_rastreadas: number;
}

interface Lead {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
  source: string;
  status: string;
  acesso_liberado_em: string | null;
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

interface SnapshotRow {
  date: string;
  mrr: number;
  arr: number;
  active_subscribers: number;
  essencial_count: number;
  profissional_count: number;
  total_users: number;
  trial_count: number;
  new_users_today: number;
}

interface AnalyticsData {
  snapshots: SnapshotRow[];
  userGrowth: { label: string; novos: number }[];
  hasSnapshotData: boolean;
  period: string;
  groupBy: "day" | "week" | "month";
  totalUsers: number;
}

type Page = "dashboard" | "usuarios" | "leads";
type Period = "7d" | "30d" | "90d" | "180d" | "365d" | "all";
type FilterType = "all" | "trial" | "pagantes";

const SNAP_PERIODS: { label: string; value: Period }[] = [
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "6 meses", value: "180d" },
  { label: "1 ano", value: "365d" },
  { label: "Tudo", value: "all" },
];

const USER_PERIODS: { label: string; value: Period }[] = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "3 meses", value: "90d" },
  { label: "6 meses", value: "180d" },
  { label: "1 ano", value: "365d" },
  { label: "Tudo", value: "all" },
];

const DURATION_OPTIONS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "6 meses", days: 180 },
  { label: "1 ano", days: 365 },
];

const PIE_COLORS = ["var(--primary-500)", "#60a5fa", "#34d399", "#f59e0b"];

function planBadge(user: AdminUser) {
  if (user.isLifetime) return { label: "Permanente", cls: "bg-green-500/15 text-green-400 border border-green-500/30" };
  if (user.isTrialActive) return { label: "Trial ativo", cls: "bg-amber-500/15 text-amber-300 border border-amber-500/30" };
  if (user.plan === "profissional" && user.currentPeriodEnd) return { label: "Profissional", cls: "bg-primary-500/20 text-primary-300 border border-primary-500/30" };
  if (user.plan === "essencial" && user.currentPeriodEnd) return { label: "Essencial", cls: "bg-primary-800 text-gray-300 border border-primary-600" };
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

function fmtLastAccess(date: string | null): string {
  if (!date) return "nunca";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem atrás`;
  return fmt(date);
}

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  if (h === 0) return "<1h";
  return `${h}h`;
}

function fmtCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ChartTip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2.5 text-[12px] shadow-xl min-w-[120px]">
      <div className="text-gray-400 mb-1.5 font-medium">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-gray-300">{entry.name ?? entry.dataKey}:</span>
          <span className="text-gray-100 font-semibold">
            {currency ? fmtCurrency(Number(entry.value)) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PeriodPills({ options, value, onChange }: {
  options: { label: string; value: Period }[];
  value: Period;
  onChange: (v: Period) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
            value === o.value
              ? "bg-primary-500 text-primary-900"
              : "bg-primary-800 border border-primary-700 text-gray-400 hover:text-gray-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface DashboardPageProps {
  revenueData: RevenueData | null;
  loadingRevenue: boolean;
  totalUsers: number;
  trialCount: number;
  getToken: () => Promise<string>;
  onTriggerSnapshot: () => void;
  snapshotting: boolean;
}

function DashboardPage({ revenueData, loadingRevenue, totalUsers, trialCount, getToken, onTriggerSnapshot, snapshotting }: DashboardPageProps) {
  const [snapPeriod, setSnapPeriod] = useState<Period>("90d");
  const [snapData, setSnapData] = useState<AnalyticsData | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(true);

  const [userPeriod, setUserPeriod] = useState<Period>("90d");
  const [userData, setUserData] = useState<AnalyticsData | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const fetchSnap = useCallback(async (period: Period) => {
    setLoadingSnap(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/analytics?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setSnapData(await res.json());
    setLoadingSnap(false);
  }, [getToken]);

  const fetchUser = useCallback(async (period: Period) => {
    setLoadingUser(true);
    const token = await getToken();
    const res = await fetch(`/api/admin/analytics?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUserData(await res.json());
    setLoadingUser(false);
  }, [getToken]);

  useEffect(() => { fetchSnap(snapPeriod); }, [snapPeriod, fetchSnap]);
  useEffect(() => { fetchUser(userPeriod); }, [userPeriod, fetchUser]);

  const planDistData = revenueData
    ? Object.entries(revenueData.planDistribution).map(([plan, count]) => ({
        name: plan === "profissional" ? "Profissional" : "Essencial",
        value: count,
      }))
    : [];

  const noSnap = !loadingSnap && (!snapData?.hasSnapshotData || snapData.snapshots.length === 0);

  return (
    <div className="flex flex-col gap-5">

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "MRR", value: fmtCurrency(revenueData?.mrr ?? 0), sub: "mensal recorrente", color: "text-primary-300" },
          { label: "ARR", value: fmtCurrency(revenueData?.arr ?? 0), sub: "anual recorrente", color: "text-primary-300" },
          { label: "Assinantes", value: String(revenueData?.activeSubscribers ?? 0), sub: "planos Stripe ativos", color: "text-green-400" },
          { label: "Usuários", value: String(totalUsers), sub: "contas criadas", color: "text-gray-200" },
          { label: "Em trial", value: String(trialCount), sub: "trial ativo agora", color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="bg-primary-800 border border-primary-700 rounded-xl p-4">
            <p className="text-[11px] text-gray-500 mb-1">{s.label}</p>
            <p className={clsx("text-[20px] font-bold leading-tight", s.color)}>{loadingRevenue ? "—" : s.value}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2 bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[14px] font-semibold text-gray-200">MRR & Assinantes ativos</h3>
            <PeriodPills options={SNAP_PERIODS} value={snapPeriod} onChange={v => { setSnapPeriod(v); }} />
          </div>

          {loadingSnap ? (
            <div className="h-56 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : noSnap ? (
            <div className="h-56 flex flex-col items-center justify-center gap-2 text-center">
              <p className="text-[13px] text-gray-400 font-medium">Histórico ainda sendo coletado</p>
              <p className="text-[12px] text-gray-600 max-w-[260px]">O cron grava um snapshot por dia. Volte amanhã para ver a primeira tendência, ou grave agora.</p>
              <button
                type="button"
                onClick={onTriggerSnapshot}
                disabled={snapshotting}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 border border-primary-600 rounded-lg text-[12px] text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-60"
              >
                <Camera size={12} />
                {snapshotting ? "Gravando..." : "Gravar snapshot agora"}
              </button>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={snapData!.snapshots} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="mrr"
                    orientation="left"
                    tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`}
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <YAxis
                    yAxisId="sub"
                    orientation="right"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip content={<ChartTip currency />} />
                  <Bar yAxisId="sub" dataKey="active_subscribers" name="Assinantes" fill="#60a5fa" fillOpacity={0.35} radius={[3, 3, 0, 0]} />
                  <Line yAxisId="mrr" type="monotone" dataKey="mrr" name="MRR" stroke="var(--primary-500)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
          <h3 className="text-[14px] font-semibold text-gray-200">Distribuição de planos</h3>
          {loadingRevenue ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : planDistData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[12px] text-gray-500 text-center">Nenhum assinante ativo ainda</p>
            </div>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={64}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {planDistData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-primary-900 border border-primary-600 rounded-lg px-3 py-2 text-[12px] shadow-xl">
                            <div className="text-gray-300 font-medium">{payload[0].name}</div>
                            <div className="text-gray-100">{payload[0].value} assinantes</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {planDistData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-gray-200 font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {!noSnap && snapData && snapData.snapshots.length > 0 && (
        <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[14px] font-semibold text-gray-200">ARR ao longo do tempo</h3>
            <PeriodPills options={SNAP_PERIODS} value={snapPeriod} onChange={setSnapPeriod} />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapData.snapshots} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradArr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTip currency />} />
                <Area type="monotone" dataKey="arr" name="ARR" stroke="#60a5fa" strokeWidth={2} fill="url(#gradArr)" dot={false} activeDot={{ r: 4, fill: "#60a5fa" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!noSnap && snapData && snapData.snapshots.length > 0 && (
        <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-[14px] font-semibold text-gray-200">Total de usuários cadastrados</h3>
            <PeriodPills options={SNAP_PERIODS} value={snapPeriod} onChange={setSnapPeriod} />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snapData.snapshots} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="total_users" name="Total" stroke="#34d399" strokeWidth={2} fill="url(#gradUsers)" dot={false} activeDot={{ r: 4, fill: "#34d399" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-[14px] font-semibold text-gray-200">Novos usuários</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {userData?.groupBy === "day" ? "agrupado por dia" : userData?.groupBy === "week" ? "agrupado por semana" : "agrupado por mês"}
            </p>
          </div>
          <PeriodPills options={USER_PERIODS} value={userPeriod} onChange={v => { setUserPeriod(v); }} />
        </div>
        {loadingUser ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userData?.userGrowth ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--primary-700)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="novos" name="Novos usuários" fill="var(--primary-500)" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onTriggerSnapshot}
          disabled={snapshotting}
          className="flex items-center gap-2 px-4 py-2 bg-primary-800 border border-primary-700 hover:border-primary-600 rounded-xl text-[12px] text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-60"
        >
          <Camera size={13} />
          {snapshotting ? "Gravando snapshot..." : "Gravar snapshot agora"}
        </button>
      </div>
    </div>
  );
}

interface UsersPageProps {
  users: AdminUser[];
  loading: boolean;
  onGrant: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

function UsersPage({ users, loading, onGrant, onDelete }: UsersPageProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const now = new Date();

  const filtered = users.filter(u => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.email.toLowerCase().includes(s) && !(u.nome ?? "").toLowerCase().includes(s)) return false;
    }
    if (activeFilter === "trial") return u.isTrialActive;
    if (activeFilter === "pagantes") return !!u.stripeSubscriptionId && !!u.currentPeriodEnd && new Date(u.currentPeriodEnd) > now;
    return true;
  });

  const counts = {
    all: users.length,
    trial: users.filter(u => u.isTrialActive).length,
    pagantes: users.filter(u => !!u.stripeSubscriptionId && !!u.currentPeriodEnd && new Date(u.currentPeriodEnd) > now).length,
  };

  return (
    <div className="flex flex-col gap-4">
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
        <div className="flex items-center bg-primary-800 border border-primary-700 rounded-xl p-1 gap-0.5">
          {([
            { label: `Todos (${counts.all})`, value: "all" },
            { label: `Trial (${counts.trial})`, value: "trial" },
            { label: `Pagantes (${counts.pagantes})`, value: "pagantes" },
          ] as { label: string; value: FilterType }[]).map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setActiveFilter(f.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                activeFilter === f.value ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[84px] bg-primary-800 border border-primary-700 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-[14px]">Nenhum usuário encontrado.</div>
        ) : (
          filtered.map(u => {
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
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                      <FolderOpen size={10} />
                      {u.projetos_ativos} {u.projetos_ativos === 1 ? "projeto" : "projetos"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                      <UserRound size={10} />
                      {u.clientes_count} {u.clientes_count === 1 ? "cliente" : "clientes"}
                    </span>
                    {u.horas_rastreadas > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Clock size={10} />
                        {fmtHours(u.horas_rastreadas)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={clsx("hidden sm:inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0", badge.cls)}>
                  {badge.label}
                </span>
                <div className="hidden md:flex flex-col items-end shrink-0 text-[11px] text-gray-500 min-w-[120px]">
                  <span>Cadastro: {fmt(u.created_at)}</span>
                  <span className="text-gray-600">Acesso: {fmtLastAccess(u.last_sign_in_at)}</span>
                  {u.isLifetime && <span className="text-green-400">Acesso permanente</span>}
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
                    onClick={() => onGrant(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-200 transition-colors"
                  >
                    <Zap size={12} />
                    Conceder
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(u)}
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
    </div>
  );
}

interface LeadsPageProps {
  leads: Lead[];
  loading: boolean;
  onGrantEarlyAccess: (lead: Lead) => void;
}

function LeadsPage({ leads, loading, onGrantEarlyAccess }: LeadsPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pendente" | "acesso_liberado">("all");

  const filtered = leads.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      if (!l.email.toLowerCase().includes(s) && !(l.nome ?? "").toLowerCase().includes(s)) return false;
    }
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    all: leads.length,
    pendente: leads.filter(l => l.status === "pendente").length,
    acesso_liberado: leads.filter(l => l.status === "acesso_liberado").length,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar lead..."
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
        <div className="flex items-center bg-primary-800 border border-primary-700 rounded-xl p-1 gap-0.5">
          {([
            { label: `Todos (${counts.all})`, value: "all" },
            { label: `Pendentes (${counts.pendente})`, value: "pendente" },
            { label: `Liberados (${counts.acesso_liberado})`, value: "acesso_liberado" },
          ] as { label: string; value: typeof statusFilter }[]).map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                statusFilter === f.value ? "bg-primary-500 text-primary-900" : "text-gray-400 hover:text-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[68px] bg-primary-800 border border-primary-700 rounded-xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-[14px]">Nenhum lead encontrado.</div>
        ) : (
          filtered.map(l => {
            const isLiberated = l.status === "acesso_liberado";
            return (
              <div key={l.id} className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-[13px] font-semibold text-primary-300 shrink-0">
                  {initials(l.nome, l.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-gray-100 truncate">{l.nome ?? "—"}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-[12px] text-gray-500 truncate">{l.email}</p>
                    {l.telefone && (
                      <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-600 shrink-0">
                        <Phone size={10} />
                        {l.telefone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end shrink-0 text-[11px] text-gray-500 min-w-[90px]">
                  <span>{fmt(l.created_at)}</span>
                  {isLiberated && l.acesso_liberado_em && (
                    <span className="text-green-400">Liberado {fmt(l.acesso_liberado_em)}</span>
                  )}
                </div>
                {isLiberated ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-[12px] text-green-400 shrink-0">
                    <CheckCircle2 size={12} />
                    Liberado
                  </span>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onGrantEarlyAccess(l)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/40 rounded-lg text-[12px] text-primary-300 transition-colors"
                    >
                      <Zap size={12} />
                      Liberar Acesso
                    </button>
                    <a
                      href={`mailto:${l.email}`}
                      className="flex items-center justify-center w-8 h-8 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <Mail size={13} />
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState<Page>("dashboard");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);
  const [grantPlan, setGrantPlan] = useState<"essencial" | "profissional">("profissional");
  const [grantDays, setGrantDays] = useState(30);
  const [grantLifetime, setGrantLifetime] = useState(false);
  const [granting, setGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [earlyAccessTarget, setEarlyAccessTarget] = useState<Lead | null>(null);
  const [eaPlan, setEaPlan] = useState<"essencial" | "profissional">("profissional");
  const [eaDays, setEaDays] = useState(30);
  const [eaLifetime, setEaLifetime] = useState(false);
  const [eaGranting, setEaGranting] = useState(false);
  const [eaSuccess, setEaSuccess] = useState(false);
  const [eaError, setEaError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) router.replace("/dashboard");
  }, [user, authLoading, router]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const token = await getToken();
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setUsers(d.users ?? []); }
    setLoadingUsers(false);
  }, [getToken]);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    const token = await getToken();
    const res = await fetch("/api/admin/leads", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setLeads(d.leads ?? []); }
    setLoadingLeads(false);
  }, [getToken]);

  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    const token = await getToken();
    const res = await fetch("/api/admin/revenue", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setRevenueData(await res.json());
    setLoadingRevenue(false);
  }, [getToken]);

  useEffect(() => {
    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return;
    fetchUsers();
    fetchLeads();
    fetchRevenue();
  }, [user, fetchUsers, fetchLeads, fetchRevenue]);

  async function handleTriggerSnapshot() {
    setSnapshotting(true);
    const token = await getToken();
    await fetch("/api/admin/snapshot", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSnapshotting(false);
    fetchRevenue();
  }

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
      setTimeout(() => { setGrantTarget(null); setGrantSuccess(false); }, 1200);
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
      const d = await res.json();
      setDeleteError(d.error ?? "Erro ao excluir usuário.");
    }
    setDeleting(false);
  }

  async function handleGrantEarlyAccess() {
    if (!earlyAccessTarget) return;
    setEaGranting(true);
    setEaError(null);
    const token = await getToken();
    const res = await fetch("/api/admin/grant-early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ leadId: earlyAccessTarget.id, email: earlyAccessTarget.email, plan: eaPlan, days: eaDays, lifetime: eaLifetime }),
    });
    if (res.ok) {
      setEaSuccess(true);
      fetchLeads();
      setTimeout(() => { setEarlyAccessTarget(null); setEaSuccess(false); }, 1400);
    } else {
      const d = await res.json();
      setEaError(d.error ?? "Erro ao liberar acesso.");
    }
    setEaGranting(false);
  }

  function openEarlyAccess(lead: Lead) {
    setEarlyAccessTarget(lead);
    setEaPlan("profissional");
    setEaDays(30);
    setEaLifetime(false);
    setEaSuccess(false);
    setEaError(null);
  }

  function openGrant(u: AdminUser) {
    setGrantTarget(u);
    setGrantPlan("profissional");
    setGrantDays(30);
    setGrantLifetime(false);
    setGrantSuccess(false);
  }

  function openDelete(u: AdminUser) {
    setDeleteTarget(u);
    setDeleteError(null);
  }

  const navItems: { label: string; value: Page; icon: React.ReactNode }[] = [
    { label: "Dashboard", value: "dashboard", icon: <LayoutDashboard size={18} /> },
    { label: `Usuários (${users.length})`, value: "usuarios", icon: <Users size={18} /> },
    { label: `Leads (${leads.length})`, value: "leads", icon: <Mail size={18} /> },
  ];

  if (authLoading || !user) return (
    <div className="h-screen flex items-center justify-center bg-primary-900">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <Head><title>Admin — FlowDesk</title></Head>

      <div className="flex h-screen bg-primary-900 overflow-hidden">

        <aside className="w-[220px] shrink-0 bg-primary-800 border-r border-primary-700 flex flex-col h-full">
          <div className="px-4 py-5 border-b border-primary-700">
            <Image src="/logo-flowdesk-nova.svg" alt="FlowDesk" width={100} height={24} priority />
            <span className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-widest text-primary-400 bg-primary-900 border border-primary-700 px-2 py-0.5 rounded-md">
              Admin
            </span>
          </div>

          <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1">
            {navItems.map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPage(item.value)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all w-full text-left",
                  page === item.value
                    ? "bg-gradient-to-r from-primary-800 to-primary-700 border-l-2 border-primary-400 text-primary-100"
                    : "text-gray-400 hover:text-gray-200 hover:bg-primary-700"
                )}
              >
                <span className={page === item.value ? "text-primary-300" : "text-gray-500"}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="px-2 pb-4 flex flex-col gap-1 border-t border-primary-700 pt-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-400 hover:text-gray-200 hover:bg-primary-700 transition-colors"
            >
              <ExternalLink size={16} className="text-gray-500" />
              Abrir FlowDesk
            </Link>
            <button
              type="button"
              onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-400 hover:text-gray-200 hover:bg-primary-700 transition-colors w-full text-left"
            >
              <LogOut size={16} className="text-gray-500" />
              Sair
            </button>
            <p className="px-3 pt-2 text-[10px] text-gray-600 truncate">{user.email}</p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-8 py-5 border-b border-primary-800">
            <h1 className="text-[16px] font-semibold text-gray-100">
              {page === "dashboard" ? "Dashboard" : page === "usuarios" ? "Usuários" : "Leads"}
            </h1>
            <button
              type="button"
              onClick={() => { fetchUsers(); fetchLeads(); fetchRevenue(); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-800 border border-primary-700 rounded-xl text-[12px] text-gray-400 hover:text-gray-200 hover:bg-primary-700 transition-colors"
            >
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>

          <div className="px-8 py-6">
            {page === "dashboard" && (
              <DashboardPage
                revenueData={revenueData}
                loadingRevenue={loadingRevenue}
                totalUsers={users.length}
                trialCount={users.filter(u => u.isTrialActive).length}
                getToken={getToken}
                onTriggerSnapshot={handleTriggerSnapshot}
                snapshotting={snapshotting}
              />
            )}
            {page === "usuarios" && (
              <UsersPage
                users={users}
                loading={loadingUsers}
                onGrant={openGrant}
                onDelete={openDelete}
              />
            )}
            {page === "leads" && (
              <LeadsPage
                leads={leads}
                loading={loadingLeads}
                onGrantEarlyAccess={openEarlyAccess}
              />
            )}
          </div>
        </main>
      </div>

      {grantTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !granting && setGrantTarget(null)}>
          <div className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-100">Conceder plano</h2>
                <p className="text-[13px] text-gray-500 mt-0.5 truncate max-w-[220px]">{grantTarget.nome ?? grantTarget.email}</p>
              </div>
              <button type="button" onClick={() => setGrantTarget(null)} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-gray-400">Plano</label>
              <div className="flex gap-2">
                {(["essencial", "profissional"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setGrantPlan(p)}
                    className={clsx("flex-1 py-2 rounded-xl text-[13px] font-medium border transition-colors",
                      grantPlan === p ? "bg-primary-500/20 border-primary-500 text-primary-300" : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
                    )}>
                    {p === "essencial" ? "Essencial" : "Profissional"}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => setGrantLifetime(v => !v)}
              className={clsx("flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-[13px] transition-colors",
                grantLifetime ? "bg-green-500/15 border-green-500/40 text-green-300" : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
              )}>
              <span>Acesso permanente</span>
              <div className={clsx("w-8 h-4 rounded-full relative transition-colors", grantLifetime ? "bg-green-500" : "bg-primary-600")}>
                <div className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", grantLifetime ? "translate-x-4" : "translate-x-0.5")} />
              </div>
            </button>

            {!grantLifetime && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-400">Duração</label>
                <div className="relative">
                  <select value={grantDays} onChange={e => setGrantDays(Number(e.target.value))}
                    className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 appearance-none transition-colors">
                    {DURATION_OPTIONS.map(opt => <option key={opt.days} value={opt.days}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}

            <button type="button" onClick={handleGrantPlan} disabled={granting || grantSuccess}
              className={clsx("w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
                grantSuccess ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-primary-500 hover:bg-primary-400 text-primary-900 disabled:opacity-60"
              )}>
              {grantSuccess ? "Plano concedido!" : granting ? "Concedendo..." : grantLifetime
                ? `Acesso permanente — ${grantPlan === "profissional" ? "Profissional" : "Essencial"}`
                : `Conceder ${grantDays}d de ${grantPlan === "profissional" ? "Profissional" : "Essencial"}`}
            </button>
          </div>
        </div>
      )}

      {earlyAccessTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !eaGranting && setEarlyAccessTarget(null)}>
          <div className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-100">Liberar acesso antecipado</h2>
                <p className="text-[13px] text-gray-500 mt-0.5 truncate max-w-[220px]">{earlyAccessTarget.nome ?? earlyAccessTarget.email}</p>
              </div>
              <button type="button" onClick={() => setEarlyAccessTarget(null)} className="text-gray-500 hover:text-gray-300 transition-colors"><X size={18} /></button>
            </div>

            <div className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3 text-[12px] text-gray-400">
              Um e-mail de convite será enviado para <span className="text-gray-200 font-medium">{earlyAccessTarget.email}</span> para que o usuário crie sua senha e acesse o FlowDesk.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-gray-400">Plano</label>
              <div className="flex gap-2">
                {(["essencial", "profissional"] as const).map(p => (
                  <button key={p} type="button" onClick={() => setEaPlan(p)}
                    className={clsx("flex-1 py-2 rounded-xl text-[13px] font-medium border transition-colors",
                      eaPlan === p ? "bg-primary-500/20 border-primary-500 text-primary-300" : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
                    )}>
                    {p === "essencial" ? "Essencial" : "Profissional"}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => setEaLifetime(v => !v)}
              className={clsx("flex items-center justify-between w-full px-4 py-2.5 rounded-xl border text-[13px] transition-colors",
                eaLifetime ? "bg-green-500/15 border-green-500/40 text-green-300" : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
              )}>
              <span>Acesso permanente</span>
              <div className={clsx("w-8 h-4 rounded-full relative transition-colors", eaLifetime ? "bg-green-500" : "bg-primary-600")}>
                <div className={clsx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform", eaLifetime ? "translate-x-4" : "translate-x-0.5")} />
              </div>
            </button>

            {!eaLifetime && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-400">Duração</label>
                <div className="relative">
                  <select value={eaDays} onChange={e => setEaDays(Number(e.target.value))}
                    className="w-full bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 appearance-none transition-colors">
                    {DURATION_OPTIONS.map(opt => <option key={opt.days} value={opt.days}>{opt.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            )}

            {eaError && <p className="text-[13px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{eaError}</p>}

            <button type="button" onClick={handleGrantEarlyAccess} disabled={eaGranting || eaSuccess}
              className={clsx("w-full py-3 rounded-xl font-semibold text-[14px] transition-all",
                eaSuccess ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-primary-500 hover:bg-primary-400 text-primary-900 disabled:opacity-60"
              )}>
              {eaSuccess ? "Acesso liberado!" : eaGranting ? "Liberando..." : "Enviar convite e liberar acesso"}
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-semibold text-gray-100">Excluir conta</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">Esta ação é permanente.</p>
              </div>
              <button type="button" onClick={() => !deleting && setDeleteTarget(null)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-3">
              <p className="text-[14px] font-medium text-gray-200">{deleteTarget.nome ?? "—"}</p>
              <p className="text-[12px] text-gray-500">{deleteTarget.email}</p>
            </div>
            {deleteError && <p className="text-[13px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{deleteError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-primary-800 border border-primary-700 text-[13px] text-gray-300 hover:text-gray-100 transition-colors disabled:opacity-60">
                Cancelar
              </button>
              <button type="button" onClick={handleDeleteUser} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-[13px] font-semibold text-white transition-colors disabled:opacity-60">
                {deleting ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
