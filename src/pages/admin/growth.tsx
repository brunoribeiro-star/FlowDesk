import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import clsx from "clsx";
import {
  ArrowLeft, Target, Calendar as CalendarIcon, Sparkles,
  Plus, Trash2, ExternalLink, Check, X as XIcon, Map, BookOpen,
} from "lucide-react";

interface Goal {
  id: string;
  titulo: string;
  meta_valor: number;
  valor_inicial: number;
  data_alvo: string;
  status: string;
}

interface CalendarItem {
  id: string;
  data_planejada: string;
  pilar: string;
  redes: string[];
  titulo: string;
  legenda: string | null;
  notas: string | null;
  status: string;
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

const CALENDAR_STATUS: Record<string, string> = {
  ideia: "Ideia",
  rascunho: "Rascunho",
  gravado: "Gravado",
  postado: "Postado",
  descartado: "Descartado",
};

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

export default function GrowthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [currentValue, setCurrentValue] = useState(0);
  const [loadingGoal, setLoadingGoal] = useState(true);

  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const [trendItems, setTrendItems] = useState<TrendIdea[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ titulo: "1.000 usuários até 31/12/2026", meta_valor: 1000, data_alvo: "2026-12-31" });

  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [calendarForm, setCalendarForm] = useState({
    data_planejada: "", pilar: "dia_x", redes: ["instagram", "tiktok"], titulo: "", legenda: "",
  });

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
      setCurrentValue(d.currentValue ?? 0);
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
      body: JSON.stringify({ ...goalForm, valor_inicial: currentValue }),
    });
    if (res.ok) { setShowGoalForm(false); fetchGoal(); }
  }

  async function handleAddCalendarItem() {
    if (!calendarForm.data_planejada || !calendarForm.titulo) return;
    const token = await getToken();
    const res = await fetch("/api/admin/growth/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(calendarForm),
    });
    if (res.ok) {
      setCalendarForm({ data_planejada: "", pilar: "dia_x", redes: ["instagram", "tiktok"], titulo: "", legenda: "" });
      setShowCalendarForm(false);
      fetchCalendar();
    }
  }

  async function handleUpdateCalendarStatus(id: string, status: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/calendar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchCalendar();
  }

  async function handleDeleteCalendarItem(id: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/calendar/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchCalendar();
  }

  async function handleUseTrend(trend: TrendIdea) {
    const token = await getToken();
    const res = await fetch("/api/admin/growth/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        data_planejada: new Date().toISOString().slice(0, 10),
        pilar: trend.pilar_sugerido || "outro",
        redes: ["instagram", "tiktok"],
        titulo: trend.titulo,
        legenda: trend.roteiro_sugerido || "",
        origem_trend_id: trend.id,
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

  async function handleDeleteTrend(id: string) {
    const token = await getToken();
    await fetch(`/api/admin/growth/trends/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    fetchTrends();
  }

  if (authLoading || !user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) return (
    <div className="h-screen flex items-center justify-center bg-primary-900">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const progressPct = goal ? Math.min(100, Math.round((currentValue / goal.meta_valor) * 100)) : 0;
  const pendingTrends = trendItems.filter(t => t.status === "novo");
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Head><title>Growth — FlowDesk Admin</title></Head>

      <div className="min-h-screen bg-primary-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col gap-8">

          <div className="flex items-center justify-between gap-3">
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

          <section className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Target size={16} className="text-primary-400" />
              <h2 className="text-[14px] font-semibold">Meta de usuários</h2>
            </div>

            {loadingGoal ? (
              <div className="h-16 bg-primary-900/60 rounded-lg animate-pulse" />
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-200 font-medium">{goal.titulo}</span>
                  <button onClick={() => { setGoalForm({ titulo: goal.titulo, meta_valor: goal.meta_valor, data_alvo: goal.data_alvo }); setShowGoalForm(true); }} className="text-gray-500 hover:text-gray-300 text-[11px]">
                    editar
                  </button>
                </div>
                <div className="h-3 bg-primary-900 rounded-full overflow-hidden border border-primary-700">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[12px] text-gray-500">
                  <span>{currentValue} / {goal.meta_valor} usuários ({progressPct}%)</span>
                  <span>alvo: {new Date(goal.data_alvo + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            )}
          </section>

          <section className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Map size={16} className="text-primary-400" />
              <h2 className="text-[14px] font-semibold">Roadmap por fase</h2>
            </div>
            <div className="flex flex-col gap-2">
              {ROADMAP.map(f => {
                const ativa = hoje >= f.inicio && hoje <= f.fim;
                return (
                  <div
                    key={f.fase}
                    className={clsx(
                      "flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 rounded-lg px-4 py-3 border",
                      ativa ? "bg-primary-500/10 border-primary-500/40" : "bg-primary-900 border-primary-700"
                    )}
                  >
                    <div className="sm:w-[110px] shrink-0 flex items-center gap-2">
                      <span className={clsx("text-[13px] font-semibold", ativa ? "text-primary-300" : "text-gray-200")}>{f.fase}</span>
                      {ativa && <span className="text-[9px] font-bold uppercase text-primary-300 bg-primary-900 border border-primary-500/40 px-1.5 py-0.5 rounded-md">agora</span>}
                    </div>
                    <div className="sm:w-20 shrink-0 text-[12px] text-gray-500">{f.periodo}</div>
                    <div className="flex-1 text-[12px] text-gray-400">{f.foco}</div>
                    <div className="sm:w-32 shrink-0 text-[12px] text-gray-300 sm:text-right">
                      {f.meta ? `meta: ${f.meta} usuários` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <BookOpen size={16} className="text-primary-400" />
              <h2 className="text-[14px] font-semibold">Pilares de conteúdo &amp; guia de voz</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {PILARES_INFO.map(p => (
                <div key={p.key} className="bg-primary-900 border border-primary-700 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-primary-300">{p.nome}</span>
                  <span className="text-[12px] text-gray-400">{p.desc}</span>
                </div>
              ))}
            </div>
            <ul className="flex flex-col gap-1.5 pt-1 border-t border-primary-700">
              {VOICE_GUIDE.map((v, i) => (
                <li key={i} className="text-[12px] text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary-500">
                  {v}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-gray-300">
              <Sparkles size={16} className="text-primary-400" />
              <h2 className="text-[14px] font-semibold">Ideias de trend {pendingTrends.length > 0 && (
                <span className="ml-1 text-[10px] font-bold text-primary-300 bg-primary-900 border border-primary-600 px-1.5 py-0.5 rounded-md align-middle">{pendingTrends.length} novas</span>
              )}</h2>
            </div>

            {loadingTrends ? (
              <div className="h-16 bg-primary-900/60 rounded-lg animate-pulse" />
            ) : trendItems.length === 0 ? (
              <p className="text-[12px] text-gray-500">Nenhuma ideia mapeada ainda. O agente de monitoramento vai popular essa lista quando encontrar algo relevante.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {trendItems.map(t => (
                  <div key={t.id} className="bg-primary-900 border border-primary-700 rounded-lg p-4 flex flex-col gap-2">
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

          <section className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <CalendarIcon size={16} className="text-primary-400" />
                <h2 className="text-[14px] font-semibold">Calendário de conteúdo</h2>
              </div>
              <button
                onClick={() => setShowCalendarForm(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[11px] text-gray-200 transition-colors"
              >
                <Plus size={12} /> Novo post
              </button>
            </div>

            {showCalendarForm && (
              <div className="bg-primary-900 border border-primary-700 rounded-lg p-4 flex flex-col gap-3">
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
                <div className="flex gap-2">
                  <button onClick={handleAddCalendarItem} className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-400 rounded-lg text-[12px] text-white transition-colors">
                    <Check size={14} /> Adicionar
                  </button>
                  <button onClick={() => setShowCalendarForm(false)} className="flex items-center gap-1.5 px-3 py-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-lg text-[12px] text-gray-300 transition-colors">
                    <XIcon size={14} /> Cancelar
                  </button>
                </div>
              </div>
            )}

            {loadingCalendar ? (
              <div className="h-16 bg-primary-900/60 rounded-lg animate-pulse" />
            ) : calendarItems.length === 0 ? (
              <p className="text-[12px] text-gray-500">Nenhum post planejado ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {calendarItems.map(item => (
                  <div key={item.id} className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="text-[12px] text-gray-500 sm:w-20 shrink-0">
                      {new Date(item.data_planejada + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium text-primary-300 bg-primary-800 border border-primary-700 px-2 py-0.5 rounded-md">
                          {PILARES[item.pilar] ?? item.pilar}
                        </span>
                        {item.redes.map(r => (
                          <span key={r} className="text-[11px] text-gray-400 bg-primary-800 border border-primary-700 px-2 py-0.5 rounded-md">
                            {r === "instagram" ? "Instagram" : "TikTok"}
                          </span>
                        ))}
                      </div>
                      <p className="text-[13px] text-gray-200 mt-1 font-medium">{item.titulo}</p>
                      {item.legenda && <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{item.legenda}</p>}
                    </div>
                    <select
                      value={item.status}
                      onChange={e => handleUpdateCalendarStatus(item.id, e.target.value)}
                      className="bg-primary-800 border border-primary-700 rounded-lg px-2 py-1.5 text-[11px] text-gray-300 focus:outline-none focus:border-primary-500 shrink-0"
                    >
                      {Object.entries(CALENDAR_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button
                      onClick={() => handleDeleteCalendarItem(item.id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-800 hover:bg-rose-500/15 border border-primary-700 hover:border-rose-500/40 text-gray-500 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  );
}
