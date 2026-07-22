import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import {
  ArrowLeft, Target, Calendar as CalendarIcon, Sparkles,
  Plus, Trash2, ExternalLink, Check, X as XIcon, Map as MapIcon, BookOpen,
  ChevronLeft, ChevronRight, Video, Image as ImageIcon, Layers,
  Copy, Clock, BarChart3, Heart, Eye, MessageCircle, Ban,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Goal {
  id: string;
  titulo: string;
  meta_valor: number;
  valor_inicial: number;
  data_alvo: string;
  status: string;
  metrica: string;
}

interface CurrentValue { pagantes: number; trial: number; total: number; }
interface SnapshotPoint { date: string; active_subscribers: number; trial_count: number; total_users: number; }

interface ReelContent { roteiro: string; estilo_edicao: string; fundo: string; notas_extra?: string | null; }
interface EstaticoContent { copy: string; direcionamento_design: string; }
interface CarrosselSlide { ordem: number; copy: string; direcionamento_asset: string; estilo_visual: string; }
interface CarrosselContent { slides: CarrosselSlide[]; }
type ConteudoDetalhado = ReelContent | EstaticoContent | CarrosselContent | null;

interface CalendarItem {
  id: string;
  data_planejada: string;
  pilar: string;
  redes: string[];
  titulo: string;
  legenda: string | null;
  notas: string | null;
  status: string;
  formato: string;
  conteudo_detalhado: ConteudoDetalhado;
  link_publicado: string | null;
  curtidas: number | null;
  visualizacoes: number | null;
  comentarios: number | null;
}

interface TrendIdea {
  id: string;
  titulo: string;
  descricao: string | null;
  fonte_url: string | null;
  pilar_sugerido: string | null;
  roteiro_sugerido: string | null;
  status: string;
  detectado_em: string;
}

const PILARES: Record<string, string> = {
  dia_x: "Dia X até a meta",
  build_in_public: "Build in public",
  meme: "Meme/humor",
  carrossel: "Carrossel storytelling",
  outro: "Outro",
};

const PILAR_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  dia_x: { text: "text-primary-300", bg: "bg-primary-500/10", border: "border-primary-500/30" },
  build_in_public: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  meme: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  carrossel: { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  outro: { text: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
};

const FORMATO_LABELS: Record<string, string> = { estatico: "Estático", carrossel: "Carrossel", reel: "Reel" };
const FORMATO_ICONS: Record<string, React.ReactNode> = {
  estatico: <ImageIcon size={11} />, carrossel: <Layers size={11} />, reel: <Video size={11} />,
};

const STATUS_STEPS = ["ideia", "rascunho", "gravado", "postado"] as const;
const STATUS_STEP_LABELS: Record<string, string> = { ideia: "Ideia", rascunho: "Roteiro pronto", gravado: "Gravado", postado: "Postado" };

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* clipboard indisponível, ignora */ }
}

const REDES_OPCOES = ["instagram", "tiktok"];

const ROADMAP = [
  { fase: "Setup", periodo: "até 26/07", meta: null as number | null, foco: "Reposicionar perfil pessoal, habilitar collab post com @flowdesk, gravar banco de vídeos coringa", inicio: "2026-07-01", fim: "2026-07-26" },
  { fase: "Fundação", periodo: "Ago/2026", meta: 75, foco: "Estabelecer os 4 pilares, postar todo dia, achar o que ressoa", inicio: "2026-07-27", fim: "2026-08-31" },
  { fase: "Volume", periodo: "Set/2026", meta: 200, foco: "Dobrar cadência no que performou melhor em Agosto", inicio: "2026-09-01", fim: "2026-09-30" },
  { fase: "Aceleração", periodo: "Out/2026", meta: 400, foco: "Colaborações, comunidades de freelancer/indie hacker, formatos mais ousados", inicio: "2026-10-01", fim: "2026-10-31" },
  { fase: "Pico", periodo: "Nov/2026", meta: 700, foco: "Grande momento de conteúdo (lançamento de feature, campanha, evento)", inicio: "2026-11-01", fim: "2026-11-30" },
  { fase: "Reta final", periodo: "Dez/2026", meta: 1000, foco: "Urgência, recapitulação da jornada, mecanismo de indicação", inicio: "2026-12-01", fim: "2026-12-31" },
];

const PILARES_INFO = [
  { key: "dia_x", nome: "Dia X até a meta", desc: "Vídeo curto e cru, diário. Carro-chefe: sustenta a consistência e o algoritmo." },
  { key: "build_in_public", nome: "Build in public", desc: "Atualização semanal de números reais: usuários, MRR, tarefas criadas, o que quebrou." },
  { key: "meme", nome: "Meme/humor", desc: "Maior alcance entre os formatos analisados. Dores do freelancer: planilha, WhatsApp, cliente, cobrança." },
  { key: "carrossel", nome: "Carrossel storytelling", desc: "Arco origem → luta → virada → prova. Gera o comentário de mais qualidade." },
];

const VOICE_GUIDE = [
  "1ª pessoa, português informal, direto — frases curtas.",
  "Número real mesmo quando é pequeno ou constrangedor (é isso que gera identificação).",
  '"É grátis, testa e me fala o que achou" > "assine agora" — nunca venda dura.',
  "Hashtags: #flowdesk #freelancer #buildinpublic #saas #empreendedorismo #gestaodeprojetos #produtividade",
  "Todo post relevante sai como collab entre perfil pessoal + @flowdesk. Nunca publi fora do nicho.",
];

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function emptyContentFor(formato: string): ConteudoDetalhado {
  if (formato === "reel") return { roteiro: "", estilo_edicao: "", fundo: "", notas_extra: "" };
  if (formato === "estatico") return { copy: "", direcionamento_design: "" };
  if (formato === "carrossel") return { slides: [{ ordem: 1, copy: "", direcionamento_asset: "", estilo_visual: "" }] };
  return null;
}

export default function GrowthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [currentValue, setCurrentValue] = useState<CurrentValue>({ pagantes: 0, trial: 0, total: 0 });
  const [historico, setHistorico] = useState<SnapshotPoint[]>([]);
  const [loadingGoal, setLoadingGoal] = useState(true);
  const [metricaView, setMetricaView] = useState<"pagantes" | "trial" | "total">("pagantes");

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [trendItems, setTrendItems] = useState<TrendIdea[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ titulo: "1.000 usuários pagantes até 31/12/2026", meta_valor: 1000, data_alvo: "2026-12-31" });

  const [viewDate, setViewDate] = useState(() => new Date());
  const hoje = isoDate(new Date());

  const [showAddModal, setShowAddModal] = useState(false);
  const [calendarForm, setCalendarForm] = useState({
    data_planejada: "", pilar: "dia_x", formato: "reel", redes: ["instagram", "tiktok"], titulo: "", legenda: "",
  });

  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);
  const [detailDraft, setDetailDraft] = useState<{
    legenda: string; status: string; conteudo_detalhado: ConteudoDetalhado;
    link_publicado: string; curtidas: string; visualizacoes: string; comentarios: string;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) router.replace("/dashboard");
  }, [user, authLoading, router]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const fetchGoal = useCallback(async () => {
    setLoadingGoal(true);
    const token = await getToken();
    const res = await fetch("/api/admin/growth/goal", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const d = await res.json();
      setGoal(d.goal);
      setCurrentValue(d.currentValue ?? { pagantes: 0, trial: 0, total: 0 });
      setHistorico(d.historico ?? []);
    }
    setLoadingGoal(false);
  }, [getToken]);

  const fetchCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    const token = await getToken();
    const res = await fetch("/api/admin/growth/calendar", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setCalendarItems(d.items ?? []); }
    setLoadingCalendar(false);
  }, [getToken]);

  const fetchTrends = useCallback(async () => {
    setLoadingTrends(true);
    const token = await getToken();
    const res = await fetch("/api/admin/growth/trends", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setTrendItems(d.items ?? []); }
    setLoadingTrends(false);
  }, [getToken]);

  useEffect(() => {
    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return;
    fetchGoal();
    fetchCalendar();
    fetchTrends();
  }, [user, fetchGoal, fetchCalendar, fetchTrends]);

  async function handleSaveGoal() {
    const token = await getToken();
    const res = await fetch("/api/admin/growth/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...goalForm, metrica: "pagantes", valor_inicial: currentValue.pagantes }),
    });
    if (res.ok) { setShowGoalForm(false); fetchGoal(); }
  }

  async function handleAddCalendarItem() {
    if (!calendarForm.data_planejada || !calendarForm.titulo) return;
    const token = await getToken();
    const res = await fetch("/api/admin/growth/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...calendarForm, conteudo_detalhado: emptyContentFor(calendarForm.formato) }),
    });
    if (res.ok) {
      setCalendarForm({ data_planejada: "", pilar: "dia_x", formato: "reel", redes: ["instagram", "tiktok"], titulo: "", legenda: "" });
      setShowAddModal(false);
      fetchCalendar();
    }
  }

  async function handleDeleteCalendarItem(id: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/calendar/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setDetailItem(null);
    fetchCalendar();
  }

  function openAddForDate(date: string) {
    setCalendarForm(f => ({ ...f, data_planejada: date }));
    setShowAddModal(true);
  }

  function openDetail(item: CalendarItem) {
    setDetailItem(item);
    setDetailDraft({
      legenda: item.legenda ?? "",
      status: item.status,
      conteudo_detalhado: item.conteudo_detalhado ?? emptyContentFor(item.formato),
      link_publicado: item.link_publicado ?? "",
      curtidas: item.curtidas != null ? String(item.curtidas) : "",
      visualizacoes: item.visualizacoes != null ? String(item.visualizacoes) : "",
      comentarios: item.comentarios != null ? String(item.comentarios) : "",
    });
  }

  async function handleSaveDetail() {
    if (!detailItem || !detailDraft) return;
    const token = await getToken();
    await fetch(`/api/admin/growth/calendar/${detailItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        legenda: detailDraft.legenda,
        status: detailDraft.status,
        conteudo_detalhado: detailDraft.conteudo_detalhado,
        link_publicado: detailDraft.link_publicado || null,
        curtidas: detailDraft.curtidas === "" ? null : Number(detailDraft.curtidas),
        visualizacoes: detailDraft.visualizacoes === "" ? null : Number(detailDraft.visualizacoes),
        comentarios: detailDraft.comentarios === "" ? null : Number(detailDraft.comentarios),
      }),
    });
    setDetailItem(null);
    setDetailDraft(null);
    fetchCalendar();
  }

  async function handleQuickStatus(item: CalendarItem, status: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/calendar/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchCalendar();
  }

  async function handleUseTrend(trend: TrendIdea) {
    const token = await getToken();
    const res = await fetch("/api/admin/growth/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        data_planejada: isoDate(new Date()),
        pilar: trend.pilar_sugerido || "outro",
        formato: "reel",
        redes: ["instagram", "tiktok"],
        titulo: trend.titulo,
        legenda: trend.roteiro_sugerido || "",
        origem_trend_id: trend.id,
        conteudo_detalhado: emptyContentFor("reel"),
      }),
    });
    if (res.ok) {
      await fetch(`/api/admin/growth/trends/${trend.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "usado" }),
      });
      fetchCalendar();
      fetchTrends();
    }
  }

  async function handleTrendStatus(id: string, status: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/trends/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchTrends();
  }

  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const itemsByDate = new Map<string, CalendarItem[]>();
    for (const item of calendarItems) {
      const arr = itemsByDate.get(item.data_planejada) ?? [];
      arr.push(item);
      itemsByDate.set(item.data_planejada, arr);
    }
    const cells: { day: number | null; date: string | null; items: CalendarItem[] }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, date: null, items: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, date, items: itemsByDate.get(date) ?? [] });
    }
    return { cells, label: `${MONTHS_PT[month]} de ${year}` };
  }, [viewDate, calendarItems]);

  const ritmoSemana = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const inicio = isoDate(monday);
    const fim = isoDate(sunday);
    const daSemana = calendarItems.filter(i => i.data_planejada >= inicio && i.data_planejada <= fim);
    const gravados = daSemana.filter(i => i.status === "gravado" || i.status === "postado").length;
    const postados = daSemana.filter(i => i.status === "postado").length;
    return { planejados: daSemana.length, gravados, postados };
  }, [calendarItems]);

  const performancePorPilar = useMemo(() => {
    const comResultado = calendarItems.filter(i => i.status === "postado" && i.curtidas != null);
    const porPilar = new Map<string, { soma: number; count: number }>();
    for (const item of comResultado) {
      const acc = porPilar.get(item.pilar) ?? { soma: 0, count: 0 };
      acc.soma += item.curtidas ?? 0;
      acc.count += 1;
      porPilar.set(item.pilar, acc);
    }
    return Array.from(porPilar.entries())
      .map(([pilar, v]) => ({ pilar, media: Math.round(v.soma / v.count), count: v.count }))
      .sort((a, b) => b.media - a.media);
  }, [calendarItems]);

  const historicoMetas = useMemo(() => {
    return ROADMAP.filter(f => f.meta !== null && f.fim < hoje).map(f => {
      const proximos = historico.filter(h => h.date <= f.fim).sort((a, b) => b.date.localeCompare(a.date));
      const valor = proximos[0]?.active_subscribers ?? null;
      return { ...f, valorNoFim: valor, bateu: valor !== null ? valor >= (f.meta as number) : null };
    });
  }, [historico, hoje]);

  const conversaoTrend = useMemo(() => {
    const total = trendItems.length;
    const usado = trendItems.filter(t => t.status === "usado").length;
    const descartado = trendItems.filter(t => t.status === "descartado").length;
    const novo = trendItems.filter(t => t.status === "novo").length;
    return { total, usado, descartado, novo };
  }, [trendItems]);

  const hojeItems = useMemo(
    () => calendarItems.filter(i => i.data_planejada === hoje && i.status !== "postado" && i.status !== "descartado"),
    [calendarItems, hoje]
  );

  if (authLoading || !user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return (
    <div className="h-screen flex items-center justify-center bg-primary-900">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pendingTrends = trendItems.filter(t => t.status === "novo");
  const metricValue = currentValue[metricaView];
  const progressPct = goal && metricaView === "pagantes" ? Math.min(100, Math.round((metricValue / goal.meta_valor) * 100)) : null;

  return (
    <>
      <Head><title>Growth — FlowDesk Admin</title></Head>

      <div className="min-h-screen bg-primary-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col gap-5">

          <div className="flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-800 border border-primary-700 hover:border-primary-600 text-gray-400 hover:text-gray-200 transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-[18px] font-semibold text-gray-100">FlowDesk Growth</h1>
                <p className="text-[12px] text-gray-500">Meta, calendário de conteúdo e ideias de trend</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400 bg-primary-800 border border-primary-700 px-2 py-1 rounded-md">
              Somente admin
            </span>
          </div>

          {/* O que gravar hoje */}
          {!loadingCalendar && (
            <section
              className={clsx(
                "relative overflow-hidden rounded-[20px] border p-5 sm:p-6 flex flex-col gap-3 animate-fade-in",
                hojeItems.length > 0 ? "border-amber-500/40" : "border-primary-700"
              )}
              style={{ background: hojeItems.length > 0 ? "rgba(245,158,11,0.06)" : "var(--primary-800)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: hojeItems.length > 0 ? "#F59E0B" : "var(--primary-400)", background: hojeItems.length > 0 ? "rgba(245,158,11,0.12)" : "rgba(79,197,235,0.12)", borderColor: hojeItems.length > 0 ? "rgba(245,158,11,0.40)" : "rgba(79,197,235,0.40)" }}>
                  <Clock size={18} />
                </div>
                <h2 className="text-[14px] font-semibold text-gray-200">O que gravar/postar hoje</h2>
              </div>

              {hojeItems.length === 0 ? (
                <p className="text-[12px] text-gray-500">Nada pendente pra hoje. 🎉</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {hojeItems.map(item => {
                    const c = PILAR_COLORS[item.pilar] ?? PILAR_COLORS.outro;
                    return (
                      <div key={item.id} className="bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
                        <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0", c.text, c.bg, c.border)}>{PILARES[item.pilar] ?? item.pilar}</span>
                        <button onClick={() => openDetail(item)} className="flex-1 min-w-[140px] text-left text-[13px] text-gray-200 hover:text-primary-300 transition-colors truncate">
                          {item.titulo}
                        </button>
                        <span className="text-[11px] text-gray-500 shrink-0">{STATUS_STEP_LABELS[item.status] ?? item.status}</span>
                        <div className="flex gap-1.5 shrink-0">
                          {STATUS_STEPS.slice(STATUS_STEPS.indexOf(item.status as any) + 1).slice(0, 1).map(next => (
                            <button
                              key={next}
                              onClick={() => handleQuickStatus(item, next)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-[11px] text-white transition-colors"
                            >
                              <Check size={12} /> {STATUS_STEP_LABELS[next]}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Meta */}
          <section className="relative overflow-hidden rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-4 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="absolute inset-x-0 top-0 h-[2px] opacity-80" style={{ background: "linear-gradient(90deg, var(--primary-400), transparent 60%)" }} />

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                  <Target size={18} />
                </div>
                <h2 className="text-[14px] font-semibold text-gray-200">Meta de usuários</h2>
              </div>

              <div className="flex items-center bg-primary-900 border border-primary-700 rounded-xl p-1 gap-0.5">
                {(["pagantes", "trial", "total"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMetricaView(m)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                      metricaView === m ? "bg-primary-500 text-white" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    {m === "pagantes" ? "Pagantes" : m === "trial" ? "Em trial" : "Total"}
                  </button>
                ))}
              </div>
            </div>

            {loadingGoal ? (
              <div className="h-24 bg-primary-900/60 rounded-lg animate-pulse" />
            ) : !goal && !showGoalForm ? (
              <button
                onClick={() => setShowGoalForm(true)}
                className="self-start flex items-center gap-2 px-3 py-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-200 transition-colors"
              >
                <Plus size={14} /> Definir meta
              </button>
            ) : showGoalForm ? (
              <div className="flex flex-col gap-3">
                <input
                  value={goalForm.titulo}
                  onChange={e => setGoalForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Título da meta"
                  className="bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={goalForm.meta_valor}
                    onChange={e => setGoalForm(f => ({ ...f, meta_valor: Number(e.target.value) }))}
                    className="w-32 bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                  />
                  <input
                    type="date"
                    value={goalForm.data_alvo}
                    onChange={e => setGoalForm(f => ({ ...f, data_alvo: e.target.value }))}
                    className="bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveGoal} className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-400 rounded-lg text-[12px] text-white transition-colors">
                    <Check size={14} /> Salvar
                  </button>
                  <button onClick={() => setShowGoalForm(false)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-300 transition-colors">
                    <XIcon size={14} /> Cancelar
                  </button>
                </div>
              </div>
            ) : goal && (
              <div className="flex flex-col gap-3">
                <div className="flex items-end justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[36px] sm:text-[44px] font-bold text-gray-100 tracking-tight tabular-nums leading-none">
                      {metricValue}
                    </span>
                    {metricaView === "pagantes" && (
                      <span className="text-[15px] text-gray-500 ml-1.5">/ {goal.meta_valor}</span>
                    )}
                    <p className="text-[12px] text-gray-500 mt-1">
                      {metricaView === "pagantes" ? "usuários pagantes" : metricaView === "trial" ? "em trial (7 dias)" : "contas totais"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-gray-500 gap-4">
                    <button onClick={() => { setGoalForm({ titulo: goal.titulo, meta_valor: goal.meta_valor, data_alvo: goal.data_alvo }); setShowGoalForm(true); }} className="text-gray-500 hover:text-gray-300 text-[11px] underline decoration-dotted">
                      editar meta
                    </button>
                    <span>alvo: {new Date(goal.data_alvo + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                {progressPct !== null && (
                  <div className="h-3 bg-primary-900 rounded-full overflow-hidden border border-primary-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--primary-500), var(--primary-400))", boxShadow: "0 0 14px -2px var(--primary-500)" }}
                    />
                  </div>
                )}

                {historico.length > 1 && (
                  <div className="h-[110px] -mx-1 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historico} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gPagantes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1EB6E8" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#1EB6E8" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gTrial" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--primary-700)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                        <Tooltip
                          contentStyle={{ background: "var(--primary-900)", border: "1px solid var(--primary-600)", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#9ca3af" }}
                        />
                        <Area type="monotone" dataKey="active_subscribers" name="Pagantes" stroke="#1EB6E8" fill="url(#gPagantes)" strokeWidth={2} />
                        <Area type="monotone" dataKey="trial_count" name="Trial" stroke="#F59E0B" fill="url(#gTrial)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Roadmap */}
          <section className="rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-4 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                <MapIcon size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-200">Roadmap por fase</h2>
            </div>
            <div className="relative flex flex-col gap-1 pl-4">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-primary-700" />
              {ROADMAP.map(f => {
                const ativa = hoje >= f.inicio && hoje <= f.fim;
                const passada = hoje > f.fim;
                return (
                  <div key={f.fase} className="relative flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 rounded-lg px-4 py-3">
                    <div
                      className="absolute -left-4 top-1/2 -translate-y-1/2 w-[13px] h-[13px] rounded-full border-2"
                      style={{
                        background: ativa ? "var(--primary-400)" : passada ? "var(--primary-600)" : "var(--primary-900)",
                        borderColor: ativa ? "var(--primary-400)" : "var(--primary-700)",
                        boxShadow: ativa ? "0 0 12px 1px var(--primary-500)" : "none",
                      }}
                    />
                    <div className={clsx("sm:w-[110px] shrink-0 flex items-center gap-2 rounded-lg", ativa && "bg-primary-500/10 -mx-2 px-2 py-1")}>
                      <span className={clsx("text-[13px] font-semibold", ativa ? "text-primary-300" : "text-gray-200")}>{f.fase}</span>
                      {ativa && <span className="text-[9px] font-bold uppercase text-primary-300 bg-primary-900 border border-primary-500/40 px-1.5 py-0.5 rounded-md">agora</span>}
                    </div>
                    <div className="sm:w-20 shrink-0 text-[12px] text-gray-500">{f.periodo}</div>
                    <div className="flex-1 text-[12px] text-gray-400">{f.foco}</div>
                    <div className="sm:w-36 shrink-0 text-[12px] text-gray-300 sm:text-right">
                      {f.meta ? `meta: ${f.meta} pagantes` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pillars & voice guide */}
          <section className="rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-4 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                <BookOpen size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-200">Pilares de conteúdo &amp; guia de voz</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {PILARES_INFO.map(p => {
                const c = PILAR_COLORS[p.key];
                return (
                  <div key={p.key} className="bg-primary-900 border border-primary-700 rounded-xl p-3.5 flex flex-col gap-1.5 transition-all hover:border-primary-600">
                    <span className={clsx("self-start text-[11px] font-semibold px-2 py-0.5 rounded-md border", c.text, c.bg, c.border)}>{p.nome}</span>
                    <span className="text-[12px] text-gray-400">{p.desc}</span>
                  </div>
                );
              })}
            </div>
            <ul className="flex flex-col gap-1.5 pt-1 border-t border-primary-700">
              {VOICE_GUIDE.map((v, i) => (
                <li key={i} className="text-[12px] text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary-500">
                  {v}
                </li>
              ))}
            </ul>
          </section>

          {/* Trend ideas */}
          <section className="rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-4 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                <Sparkles size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-200">
                Ideias de trend
                {pendingTrends.length > 0 && (
                  <span className="ml-2 text-[10px] font-bold text-primary-300 bg-primary-900 border border-primary-600 px-1.5 py-0.5 rounded-md align-middle">{pendingTrends.length} novas</span>
                )}
              </h2>
            </div>

            {loadingTrends ? (
              <div className="h-16 bg-primary-900/60 rounded-lg animate-pulse" />
            ) : trendItems.length === 0 ? (
              <p className="text-[12px] text-gray-500">Nenhuma ideia mapeada ainda. O agente de monitoramento vai popular essa lista quando encontrar algo relevante.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {trendItems.map(t => (
                  <div key={t.id} className="bg-primary-900 border border-primary-700 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-medium text-gray-100">{t.titulo}</p>
                        {t.descricao && <p className="text-[12px] text-gray-400 mt-0.5">{t.descricao}</p>}
                      </div>
                      <span className={clsx(
                        "shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border",
                        t.status === "novo" && "text-primary-300 bg-primary-800 border-primary-600",
                        t.status === "aprovado" && "text-green-400 bg-green-500/10 border-green-500/30",
                        t.status === "usado" && "text-gray-400 bg-primary-800 border-primary-700",
                        t.status === "descartado" && "text-rose-400 bg-rose-500/10 border-rose-500/30",
                      )}>
                        {t.status}
                      </span>
                    </div>
                    {t.roteiro_sugerido && (
                      <p className="text-[12px] text-gray-300 bg-primary-800 border border-primary-700 rounded-md p-2 whitespace-pre-wrap">{t.roteiro_sugerido}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      {t.pilar_sugerido && <span>{PILARES[t.pilar_sugerido] ?? t.pilar_sugerido}</span>}
                      {t.fonte_url && (
                        <a href={t.fonte_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-400 hover:text-primary-300">
                          fonte <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {t.status === "novo" && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleUseTrend(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-[11px] text-white transition-colors">
                          <Plus size={12} /> Usar no calendário
                        </button>
                        <button onClick={() => handleTrendStatus(t.id, "descartado")} className="px-3 py-1.5 bg-primary-800 hover:bg-primary-700 border border-primary-700 rounded-lg text-[11px] text-gray-400 transition-colors">
                          Descartar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Content calendar */}
          <section className="rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-4 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                  <CalendarIcon size={18} />
                </div>
                <h2 className="text-[14px] font-semibold text-gray-200">Calendário de conteúdo</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-primary-900 border border-primary-700 rounded-xl p-1 gap-0.5">
                  <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-primary-800 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 text-[12px] text-gray-300 font-medium w-[128px] text-center">{monthGrid.label}</span>
                  <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-primary-800 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <button
                  onClick={() => openAddForDate(hoje)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-[11px] text-white transition-colors"
                >
                  <Plus size={12} /> Novo post
                </button>
              </div>
            </div>

            {loadingCalendar ? (
              <div className="h-64 bg-primary-900/60 rounded-lg animate-pulse" />
            ) : (
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS_PT.map(w => <div key={w} className="text-[10px] font-medium text-gray-500 py-1">{w}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.cells.map((cell, i) => (
                    <div
                      key={i}
                      onClick={() => cell.date && cell.items.length === 0 && openAddForDate(cell.date)}
                      className={clsx(
                        "min-h-[76px] sm:min-h-[92px] rounded-lg border p-1.5 flex flex-col gap-1 transition-colors",
                        cell.day === null ? "border-transparent" : "border-primary-700 bg-primary-900/60",
                        cell.date === hoje && "ring-1 ring-primary-500",
                        cell.date && cell.items.length === 0 && "cursor-pointer hover:border-primary-600"
                      )}
                    >
                      {cell.day !== null && (
                        <>
                          <span className={clsx("text-[10px]", cell.date === hoje ? "text-primary-300 font-bold" : "text-gray-500")}>{cell.day}</span>
                          <div className="flex flex-col gap-0.5 overflow-hidden">
                            {cell.items.map(item => {
                              const c = PILAR_COLORS[item.pilar] ?? PILAR_COLORS.outro;
                              return (
                                <button
                                  key={item.id}
                                  onClick={(e) => { e.stopPropagation(); openDetail(item); }}
                                  className={clsx("flex items-center gap-1 text-left text-[9.5px] sm:text-[10px] px-1.5 py-0.5 rounded border truncate transition-transform hover:-translate-y-px", c.text, c.bg, c.border)}
                                  title={item.titulo}
                                >
                                  {FORMATO_ICONS[item.formato]}
                                  <span className="truncate">{item.titulo}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Ritmo & performance */}
          <section className="rounded-[20px] border border-primary-700 p-5 sm:p-6 flex flex-col gap-5 animate-fade-in" style={{ background: "var(--primary-800)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center border" style={{ color: "var(--primary-400)", background: "rgba(79,197,235,0.12)", borderColor: "rgba(79,197,235,0.40)" }}>
                <BarChart3 size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-gray-200">Ritmo &amp; performance</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-primary-900 border border-primary-700 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-gray-400">Ritmo desta semana</span>
                <div className="flex items-end gap-4">
                  <div><span className="text-[22px] font-bold text-gray-100">{ritmoSemana.planejados}</span><p className="text-[10px] text-gray-500">planejados</p></div>
                  <div><span className="text-[22px] font-bold text-primary-300">{ritmoSemana.gravados}</span><p className="text-[10px] text-gray-500">gravados</p></div>
                  <div><span className="text-[22px] font-bold text-emerald-400">{ritmoSemana.postados}</span><p className="text-[10px] text-gray-500">postados</p></div>
                </div>
              </div>

              <div className="bg-primary-900 border border-primary-700 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-gray-400">Conversão de trend</span>
                <div className="flex items-end gap-3 flex-wrap">
                  <div><span className="text-[22px] font-bold text-gray-100">{conversaoTrend.total}</span><p className="text-[10px] text-gray-500">detectados</p></div>
                  <div><span className="text-[22px] font-bold text-emerald-400">{conversaoTrend.usado}</span><p className="text-[10px] text-gray-500">viraram post</p></div>
                  <div><span className="text-[22px] font-bold text-rose-400">{conversaoTrend.descartado}</span><p className="text-[10px] text-gray-500">descartados</p></div>
                </div>
              </div>

              <div className="bg-primary-900 border border-primary-700 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[11px] font-medium text-gray-400">Performance por pilar</span>
                {performancePorPilar.length === 0 ? (
                  <p className="text-[11px] text-gray-500 mt-1">Sem posts com resultado registrado ainda.</p>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {performancePorPilar.map(p => (
                      <div key={p.pilar} className="flex items-center justify-between text-[12px]">
                        <span className={PILAR_COLORS[p.pilar]?.text}>{PILARES[p.pilar] ?? p.pilar}</span>
                        <span className="text-gray-300 font-medium">{p.media} curtidas <span className="text-gray-600">({p.count})</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-gray-400">Histórico de metas do roadmap</span>
              {historicoMetas.length === 0 ? (
                <p className="text-[12px] text-gray-500">Nenhuma fase com prazo encerrado ainda.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {historicoMetas.map(f => (
                    <div key={f.fase} className="flex items-center justify-between text-[12px] bg-primary-900 border border-primary-700 rounded-lg px-3 py-2">
                      <span className="text-gray-300">{f.fase} <span className="text-gray-600">({f.periodo})</span></span>
                      <span className="text-gray-500">meta: {f.meta} · fechou com: {f.valorNoFim ?? "sem dado"}</span>
                      <span className={clsx("text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border", f.bateu === null ? "text-gray-500 bg-primary-800 border-primary-700" : f.bateu ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-rose-400 bg-rose-500/10 border-rose-500/30")}>
                        {f.bateu === null ? "sem dado" : f.bateu ? "bateu" : "não bateu"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Add post modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700">
              <h3 className="text-[14px] font-semibold text-gray-100">Novo post</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-300"><XIcon size={16} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  value={calendarForm.data_planejada}
                  onChange={e => setCalendarForm(f => ({ ...f, data_planejada: e.target.value }))}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                />
                <select
                  value={calendarForm.pilar}
                  onChange={e => setCalendarForm(f => ({ ...f, pilar: e.target.value }))}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                >
                  {Object.entries(PILARES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select
                  value={calendarForm.formato}
                  onChange={e => setCalendarForm(f => ({ ...f, formato: e.target.value }))}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                >
                  {Object.entries(FORMATO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {REDES_OPCOES.map(rede => (
                  <label key={rede} className="flex items-center gap-1.5 text-[12px] text-gray-300 bg-primary-800 border border-primary-700 rounded-lg px-2.5 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calendarForm.redes.includes(rede)}
                      onChange={e => setCalendarForm(f => ({
                        ...f,
                        redes: e.target.checked ? [...f.redes, rede] : f.redes.filter(r => r !== rede),
                      }))}
                    />
                    {rede === "instagram" ? "Instagram" : "TikTok"}
                  </label>
                ))}
              </div>
              <input
                value={calendarForm.titulo}
                onChange={e => setCalendarForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Título / ideia do post"
                className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
              />
              <textarea
                value={calendarForm.legenda}
                onChange={e => setCalendarForm(f => ({ ...f, legenda: e.target.value }))}
                placeholder="Rascunho da legenda"
                rows={3}
                className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 resize-none"
              />
              <p className="text-[11px] text-gray-500">O roteiro/estrutura detalhada (por formato) é preenchido depois, clicando no post.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddCalendarItem} className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-400 rounded-lg text-[12px] text-white transition-colors">
                  <Check size={14} /> Adicionar
                </button>
                <button onClick={() => setShowAddModal(false)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-300 transition-colors">
                  <XIcon size={14} /> Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && detailDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setDetailItem(null); setDetailDraft(null); }}>
          <div onClick={e => e.stopPropagation()} className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary-700 sticky top-0 bg-primary-900">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-md border", PILAR_COLORS[detailItem.pilar]?.text, PILAR_COLORS[detailItem.pilar]?.bg, PILAR_COLORS[detailItem.pilar]?.border)}>
                  {PILARES[detailItem.pilar] ?? detailItem.pilar}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400 bg-primary-800 border border-primary-700 px-2 py-0.5 rounded-md">
                  {FORMATO_ICONS[detailItem.formato]} {FORMATO_LABELS[detailItem.formato] ?? detailItem.formato}
                </span>
                <span className="text-[11px] text-gray-500">{new Date(detailItem.data_planejada + "T00:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
              <button onClick={() => { setDetailItem(null); setDetailDraft(null); }} className="text-gray-500 hover:text-gray-300"><XIcon size={16} /></button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <h3 className="text-[15px] font-semibold text-gray-100">{detailItem.titulo}</h3>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {detailItem.redes.map(r => (
                    <span key={r} className="text-[11px] text-gray-400 bg-primary-800 border border-primary-700 px-2 py-0.5 rounded-md">
                      {r === "instagram" ? "Instagram" : "TikTok"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Checklist de produção */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_STEPS.map((step, idx) => {
                  const currentIdx = STATUS_STEPS.indexOf(detailDraft.status as any);
                  const done = detailDraft.status !== "descartado" && currentIdx >= idx;
                  return (
                    <React.Fragment key={step}>
                      {idx > 0 && <div className={clsx("h-px w-4", done ? "bg-primary-500" : "bg-primary-700")} />}
                      <button
                        onClick={() => setDetailDraft(d => d && ({ ...d, status: step }))}
                        className={clsx(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                          done ? "bg-primary-500 border-primary-400 text-white" : "bg-primary-800 border-primary-700 text-gray-400 hover:text-gray-200"
                        )}
                      >
                        {done && <Check size={12} />} {STATUS_STEP_LABELS[step]}
                      </button>
                    </React.Fragment>
                  );
                })}
                <button
                  onClick={() => setDetailDraft(d => d && ({ ...d, status: "descartado" }))}
                  className={clsx(
                    "ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                    detailDraft.status === "descartado" ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-primary-800 border-primary-700 text-gray-500 hover:text-rose-400"
                  )}
                >
                  <Ban size={12} /> Descartar
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-gray-400">Legenda / caption</label>
                  <button onClick={() => copyText(detailDraft.legenda)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-300 transition-colors">
                    <Copy size={11} /> copiar
                  </button>
                </div>
                <textarea
                  value={detailDraft.legenda}
                  onChange={e => setDetailDraft(d => d && ({ ...d, legenda: e.target.value }))}
                  rows={3}
                  className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 resize-none"
                />
              </div>

              {detailDraft.status === "postado" && (
                <div className="border-t border-primary-700 pt-4 flex flex-col gap-3">
                  <label className="text-[11px] font-medium text-gray-400">Resultado real</label>
                  <input
                    value={detailDraft.link_publicado}
                    onChange={e => setDetailDraft(d => d && ({ ...d, link_publicado: e.target.value }))}
                    placeholder="Link do post publicado"
                    className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><Heart size={11} /> curtidas</span>
                      <input type="number" value={detailDraft.curtidas} onChange={e => setDetailDraft(d => d && ({ ...d, curtidas: e.target.value }))} className="bg-primary-800 border border-primary-700 rounded-lg px-2 py-1.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><Eye size={11} /> views</span>
                      <input type="number" value={detailDraft.visualizacoes} onChange={e => setDetailDraft(d => d && ({ ...d, visualizacoes: e.target.value }))} className="bg-primary-800 border border-primary-700 rounded-lg px-2 py-1.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500"><MessageCircle size={11} /> comentários</span>
                      <input type="number" value={detailDraft.comentarios} onChange={e => setDetailDraft(d => d && ({ ...d, comentarios: e.target.value }))} className="bg-primary-800 border border-primary-700 rounded-lg px-2 py-1.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500" />
                    </label>
                  </div>
                </div>
              )}

              <div className="border-t border-primary-700 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-300">Estrutura ({FORMATO_LABELS[detailItem.formato]})</span>
                  <button
                    onClick={() => copyText(buildFullCopyText(detailItem.titulo, detailDraft.legenda, detailDraft.conteudo_detalhado, detailItem.formato))}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-300 transition-colors"
                  >
                    <Copy size={11} /> copiar tudo
                  </button>
                </div>
                {detailItem.formato === "reel" && (
                  <>
                    <DetailField label="Roteiro do reel" value={(detailDraft.conteudo_detalhado as ReelContent)?.roteiro ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as ReelContent), roteiro: v } }))} />
                    <DetailField label="Estilo de edição" value={(detailDraft.conteudo_detalhado as ReelContent)?.estilo_edicao ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as ReelContent), estilo_edicao: v } }))} />
                    <DetailField label="Fundo / cenário" value={(detailDraft.conteudo_detalhado as ReelContent)?.fundo ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as ReelContent), fundo: v } }))} />
                    <DetailField label="Notas extra" value={(detailDraft.conteudo_detalhado as ReelContent)?.notas_extra ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as ReelContent), notas_extra: v } }))} />
                  </>
                )}
                {detailItem.formato === "estatico" && (
                  <>
                    <DetailField label="Copy da peça" value={(detailDraft.conteudo_detalhado as EstaticoContent)?.copy ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as EstaticoContent), copy: v } }))} />
                    <DetailField label="Direcionamento de design" value={(detailDraft.conteudo_detalhado as EstaticoContent)?.direcionamento_design ?? ""} onChange={v => setDetailDraft(d => d && ({ ...d, conteudo_detalhado: { ...(d.conteudo_detalhado as EstaticoContent), direcionamento_design: v } }))} />
                  </>
                )}
                {detailItem.formato === "carrossel" && (
                  <div className="flex flex-col gap-3">
                    {((detailDraft.conteudo_detalhado as CarrosselContent)?.slides ?? []).map((slide, idx) => (
                      <div key={idx} className="bg-primary-800 border border-primary-700 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-violet-400">Slide {slide.ordem}</span>
                          <button
                            onClick={() => setDetailDraft(d => {
                              if (!d) return d;
                              const content = d.conteudo_detalhado as CarrosselContent;
                              const slides = content.slides.filter((_, i) => i !== idx).map((s, i) => ({ ...s, ordem: i + 1 }));
                              return { ...d, conteudo_detalhado: { slides } };
                            })}
                            className="text-gray-500 hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <DetailField label="Copy do slide" value={slide.copy} onChange={v => setDetailDraft(d => {
                          if (!d) return d;
                          const content = d.conteudo_detalhado as CarrosselContent;
                          const slides = content.slides.map((s, i) => i === idx ? { ...s, copy: v } : s);
                          return { ...d, conteudo_detalhado: { slides } };
                        })} />
                        <DetailField label="Direcionamento de asset" value={slide.direcionamento_asset} onChange={v => setDetailDraft(d => {
                          if (!d) return d;
                          const content = d.conteudo_detalhado as CarrosselContent;
                          const slides = content.slides.map((s, i) => i === idx ? { ...s, direcionamento_asset: v } : s);
                          return { ...d, conteudo_detalhado: { slides } };
                        })} />
                        <DetailField label="Estilo visual" value={slide.estilo_visual} onChange={v => setDetailDraft(d => {
                          if (!d) return d;
                          const content = d.conteudo_detalhado as CarrosselContent;
                          const slides = content.slides.map((s, i) => i === idx ? { ...s, estilo_visual: v } : s);
                          return { ...d, conteudo_detalhado: { slides } };
                        })} />
                      </div>
                    ))}
                    <button
                      onClick={() => setDetailDraft(d => {
                        if (!d) return d;
                        const content = d.conteudo_detalhado as CarrosselContent;
                        const slides = [...(content?.slides ?? []), { ordem: (content?.slides?.length ?? 0) + 1, copy: "", direcionamento_asset: "", estilo_visual: "" }];
                        return { ...d, conteudo_detalhado: { slides } };
                      })}
                      className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-primary-800 hover:bg-primary-700 border border-primary-700 rounded-lg text-[11px] text-gray-300 transition-colors"
                    >
                      <Plus size={12} /> Adicionar slide
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-primary-700">
                <button onClick={() => handleDeleteCalendarItem(detailItem.id)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-800 hover:bg-rose-500/15 border border-primary-700 hover:border-rose-500/40 rounded-lg text-[12px] text-gray-400 hover:text-rose-400 transition-colors">
                  <Trash2 size={14} /> Excluir
                </button>
                <button onClick={handleSaveDetail} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-lg text-[12px] text-white transition-colors">
                  <Check size={14} /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-fade-in { animation: growthFadeIn 0.2s ease-out forwards; }
        @keyframes growthFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function buildFullCopyText(titulo: string, legenda: string, conteudo: ConteudoDetalhado, formato: string): string {
  const partes = [`Título: ${titulo}`, `Legenda: ${legenda}`];
  if (formato === "reel" && conteudo) {
    const c = conteudo as ReelContent;
    partes.push(`Roteiro: ${c.roteiro}`, `Estilo de edição: ${c.estilo_edicao}`, `Fundo/cenário: ${c.fundo}`);
    if (c.notas_extra) partes.push(`Notas extra: ${c.notas_extra}`);
  } else if (formato === "estatico" && conteudo) {
    const c = conteudo as EstaticoContent;
    partes.push(`Copy: ${c.copy}`, `Direcionamento de design: ${c.direcionamento_design}`);
  } else if (formato === "carrossel" && conteudo) {
    const c = conteudo as CarrosselContent;
    for (const slide of c.slides) {
      partes.push(`Slide ${slide.ordem}: ${slide.copy}\n  Asset: ${slide.direcionamento_asset}\n  Estilo: ${slide.estilo_visual}`);
    }
  }
  return partes.join("\n\n");
}

function DetailField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-gray-400">{label}</label>
        <button onClick={() => copyText(value)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-primary-300 transition-colors">
          <Copy size={11} /> copiar
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 resize-none"
      />
    </div>
  );
}
