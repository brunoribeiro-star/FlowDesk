"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/Skeleton";
import { formatarDataCurta, tempoRelativo } from "@/lib/utils";
import { Send, X } from "lucide-react";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const PAGAMENTOS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo aos Pagamentos!", content: "Aqui você acompanha todos os pagamentos dos seus projetos em um só lugar — pendentes, recebidos e parcelas futuras." },
  { target: "body", placement: "center", skipBeacon: true, title: "Como adicionar pagamentos", content: "Os pagamentos são adicionados diretamente dentro de cada projeto. Vá em Projetos → abra um projeto → aba Pagamentos para registrar o que você vai cobrar." },
  { target: "body", placement: "center", skipBeacon: true, title: "Notificação de cobrança", content: "Você pode enviar uma notificação de cobrança diretamente ao cliente por e-mail, incluindo a chave PIX para facilitar o pagamento." },
  { target: "body", placement: "center", skipBeacon: true, title: "Pagamento de colaboradores", content: "Se você trabalha em equipe, também é possível gerenciar o repasse aos colaboradores com split financeiro (% ou valor fixo) dentro de cada projeto." },
];


type Projeto = {
  id: string;
  titulo: string;
  cliente_id: string | null;
  clientes?: {
    id: string;
    nome: string | null;
    empresa: string | null;
    foto_url?: string | null;
  } | null;
};

type Pagamento = {
  id: string;
  user_id: string;
  projeto_id: string | null;
  valor: number | null;
  status: string | null;
  data_pagamento: string | null;
  data_prevista?: string | null;
  pix_chave?: string | null;
  notificado_em?: string | null;
  created_at: string;
};

type FiltroStatus = "" | "pendentes" | "pagos";


function classificarPagamento(p: Pagamento): "pago" | "pendente" | "atrasado" {
  const raw = String(p.status || "").toLowerCase();
  const isPago =
    raw === "pago" ||
    raw === "concluido" ||
    raw === "recebido" ||
    raw === "ok";

  if (isPago) return "pago";

  const venc = p.data_prevista;
  if (!venc) return "pendente";

  const hoje = new Date();
  const d = new Date(venc + "T00:00:00");
  if (isNaN(d.getTime())) return "pendente";

  if (d.getTime() < new Date(hoje.toISOString().slice(0, 10) + "T00:00:00").getTime())
    return "atrasado";

  return "pendente";
}

export default function PagamentosPage() {
  const router = useRouter();

  const { user: authUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [cobrancaModal, setCobrancaModal] = useState<Pagamento | null>(null);
  const [pixInput, setPixInput] = useState("");
  const [enviandoCobranca, setEnviandoCobranca] = useState(false);
  const [cobrancaFeedback, setCobrancaFeedback] = useState<{ ok: boolean; msg: string } | null>(null);



  useEffect(() => {
    async function carregar() {
      if (!authUser) return;
      setLoading(true);

      const u = authUser;
      setUser(u);

      const [{ data: pagData }, { data: projData }] = await Promise.all([
        supabase
          .from("pagamentos")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("projetos")
          .select(`
            id,
            titulo,
            cliente_id,
            clientes:cliente_id (
              id,
              nome,
              empresa,
              foto_url
            )
          `)
          .eq("user_id", u.id)
          .order("created_at", { ascending: false }),
      ]);

      setPagamentos((pagData || []) as Pagamento[]);

      const normalizados = (projData || []).map((p: any) => ({
        ...p,
        clientes: Array.isArray(p.clientes) ? p.clientes[0] || null : p.clientes,
      })) as Projeto[];

      setProjetos(normalizados);

      setErro(null);
      setLoading(false);
    }

    carregar();
  }, [authUser]);



  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const displayName =
    user?.user_metadata?.nome || user?.email?.split("@")[0] || "Usuário";

  function clienteInfo(projetoId: string | null) {
    if (!projetoId) return null;
    return projetos.find((p) => p.id === projetoId)?.clientes || null;
  }

  function projetoNome(id: string | null) {
    if (!id) return "Projeto não definido";
    return projetos.find((p) => p.id === id)?.titulo || "Projeto não encontrado";
  }

  const pagamentosFiltrados = useMemo(() => {
    return pagamentos.filter((p) => {
      const tipo = classificarPagamento(p);
      if (filtroStatus === "pendentes") return tipo === "pendente" || tipo === "atrasado";
      if (filtroStatus === "pagos") return tipo === "pago";
      return true;
    });
  }, [pagamentos, filtroStatus]);

  function statusVisual(p: Pagamento) {
    const tipo = classificarPagamento(p);
    if (tipo === "pago")
      return { label: "Pago", bg: "bg-emerald-400", text: "text-primary-900" };
    if (tipo === "atrasado")
      return { label: "Atrasado", bg: "bg-rose-500", text: "text-primary-50" };
    return { label: "Pendente", bg: "bg-amber-400", text: "text-primary-900" };
  }

  function abrirCobrancaModal(p: Pagamento) {
    setCobrancaModal(p);
    setPixInput(p.pix_chave ?? "");
    setCobrancaFeedback(null);
  }

  async function enviarCobranca() {
    if (!cobrancaModal) return;
    setEnviandoCobranca(true);
    setCobrancaFeedback(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão inválida.");

      const resp = await fetch("/api/payments/notify-client", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pagamento_id: cobrancaModal.id, pix_chave: pixInput.trim() || null }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Erro ao enviar cobrança.");

      setPagamentos((prev) =>
        prev.map((p) =>
          p.id === cobrancaModal.id
            ? { ...p, pix_chave: pixInput.trim() || null, notificado_em: new Date().toISOString() }
            : p
        )
      );
      setCobrancaFeedback({ ok: true, msg: json.email_sent ? "Cobrança enviada ao cliente por e-mail!" : "Cobrança registrada (e-mail não enviado)." });
    } catch (err: any) {
      setCobrancaFeedback({ ok: false, msg: err.message });
    } finally {
      setEnviandoCobranca(false);
    }
  }

  async function excluirPagamento(id: string) {
    if (!confirm("Excluir este pagamento?")) return;
    await supabase.from("pagamentos").delete().eq("id", id);
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  }

  const total = pagamentos.length;

  const AVATAR_TINTS = [
    'radial-gradient(130% 130% at 30% 20%, #1b5e75, #0c2d39)',
    'radial-gradient(130% 130% at 30% 20%, #176a86, #0c2f3a)',
    'radial-gradient(130% 130% at 30% 20%, #134a5c, #0b2a33)',
    'radial-gradient(130% 130% at 30% 20%, #20586a, #0d3038)',
  ];

  return (
    <>
      <PageTour name="pagamentos" steps={PAGAMENTOS_TOUR_STEPS} />

      <div
        className="relative flex flex-col flex-1 gap-[22px] overflow-hidden"
        style={{ padding: '28px 40px 36px' }}
      >
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 520, height: 520, right: -180, top: -180, background: 'radial-gradient(circle, rgba(30,182,232,0.12), transparent 70%)', filter: 'blur(100px)' }} />
        <div className="pointer-events-none absolute rounded-full z-0" style={{ width: 460, height: 460, right: -160, bottom: -200, background: 'radial-gradient(circle, rgba(16,66,83,0.5), transparent 70%)', filter: 'blur(100px)' }} />

        <header
          className="relative z-10 flex items-center gap-5 pb-[22px] border-b"
          style={{ borderColor: 'var(--gray-700)' }}
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="grid place-items-center cursor-pointer transition-colors duration-200 flex-none"
            style={{ width: 46, height: 46, borderRadius: 13, border: '1px solid var(--gray-700)', background: 'var(--primary-800)', color: 'var(--gray-200)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-500)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-700)'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-200)'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
            </svg>
          </button>
          <span className="font-bold tracking-tight" style={{ fontSize: 26, color: 'var(--gray-100)' }}>Pagamentos</span>
          <div className="ml-auto">
            <HeaderProfile />
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-between">
          <span className="flex items-center gap-[11px]" style={{ fontSize: 16, color: 'var(--gray-400)' }}>
            <span
              className="rounded-full flex-none"
              style={{ width: 9, height: 9, display: 'inline-block', background: 'var(--primary-400)', boxShadow: '0 0 10px -1px var(--primary-500)' }}
            />
            <strong className="text-white font-bold">{total}</strong>&nbsp;pagamento{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </span>

          <div className="relative">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
              className="appearance-none cursor-pointer outline-none transition-colors duration-200"
              style={{ height: 48, padding: '0 44px 0 18px', borderRadius: 13, border: '1px solid var(--gray-700)', background: 'var(--primary-800)', color: 'var(--gray-200)', fontSize: 15, fontFamily: 'inherit' }}
            >
              <option value="">Todos os status</option>
              <option value="pendentes">Pendentes</option>
              <option value="pagos">Pagos</option>
            </select>
            <svg className="pointer-events-none absolute" style={{ right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-500)' }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>

        <div
          className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{ borderRadius: 22, border: '1px solid var(--gray-700)', background: 'linear-gradient(180deg, rgba(20,40,48,0.36), rgba(8,34,42,0.2))' }}
        >
          <div
            className="grid items-center flex-none"
            style={{ padding: '20px 30px', borderBottom: '1px solid var(--gray-700)', gap: 20, gridTemplateColumns: '1.7fr 1.7fr 1fr 1fr 1.3fr 0.9fr 1.4fr' }}
          >
            {['Cliente', 'Projeto', 'Status', 'Valor', 'Vencimento / Pagamento', 'Criação', 'Ações'].map((h, i) => (
              <span key={i} className={i === 6 ? 'text-right' : ''} style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-400)' }}>{h}</span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto payments-scroll flex flex-col">
            {loading ? (
              <SkeletonList rows={6} cols={7} />
            ) : erro ? (
              <div className="py-16 text-center text-sm" style={{ color: 'var(--error-medium)' }}>{erro}</div>
            ) : pagamentosFiltrados.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: 'var(--gray-500)' }}>Nenhum pagamento encontrado.</div>
            ) : (
              pagamentosFiltrados.map((p) => {
                const tipo = classificarPagamento(p);
                const cliente = clienteInfo(p.projeto_id);
                const foto = cliente?.foto_url || null;
                const dataRef = tipo === 'pago' ? p.data_pagamento : p.data_prevista;

                const nomeCliente = cliente?.nome || 'C';
                const iniciais = nomeCliente.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                const tintIdx = nomeCliente.charCodeAt(0) % 4;

                const statusBadge = tipo === 'pago'
                  ? { label: 'Pago',     color: 'var(--success-medium)', bg: 'rgba(102,187,106,0.10)', border: 'rgba(102,187,106,0.35)' }
                  : tipo === 'atrasado'
                  ? { label: 'Atrasado', color: 'var(--error-medium)',   bg: 'rgba(239,83,80,0.10)',   border: 'rgba(239,83,80,0.35)' }
                  : { label: 'Pendente', color: 'var(--alert-medium)',   bg: 'rgba(255,167,38,0.10)',  border: 'rgba(255,167,38,0.35)' };

                return (
                  <div
                    key={p.id}
                    className="grid items-center transition-colors duration-200"
                    style={{ padding: '16px 30px', borderBottom: '1px solid rgba(29,38,40,0.7)', gap: 20, gridTemplateColumns: '1.7fr 1.7fr 1fr 1fr 1.3fr 0.9fr 1.4fr' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(148,169,173,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div className="flex items-center min-w-0" style={{ gap: 14 }}>
                      <span
                        className="flex-none grid place-items-center rounded-full overflow-hidden"
                        style={{ width: 46, height: 46, border: '1px solid rgba(255,255,255,0.08)', fontSize: 15, fontWeight: 700, color: 'var(--primary-100)', background: foto ? undefined : AVATAR_TINTS[tintIdx], flexShrink: 0 }}
                      >
                        {foto
                          ? <Image src={foto} alt="Cliente" width={46} height={46} className="object-cover w-full h-full" />
                          : iniciais}
                      </span>
                      <div className="flex flex-col min-w-0" style={{ gap: 3 }}>
                        <span className="truncate font-semibold text-white" style={{ fontSize: 16 }}>{nomeCliente}</span>
                        <span className="flex items-center gap-[6px] truncate" style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h.01"/><path d="M15 7h.01"/><path d="M9 11h.01"/><path d="M15 11h.01"/><path d="M9 15h6"/>
                          </svg>
                          {cliente?.empresa || '—'}
                        </span>
                      </div>
                    </div>

                    <span className="truncate" style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--gray-100)', lineHeight: 1.35 }}>
                      {projetoNome(p.projeto_id)}
                    </span>

                    <div>
                      <span
                        className="inline-flex items-center gap-2 font-semibold"
                        style={{ fontSize: 14, padding: '6px 12px', borderRadius: 10, border: `1px solid ${statusBadge.border}`, background: statusBadge.bg, color: statusBadge.color }}
                      >
                        <span className="rounded-full flex-none" style={{ width: 7, height: 7, background: 'currentColor', display: 'inline-block' }} />
                        {statusBadge.label}
                      </span>
                    </div>

                    <span className="font-bold text-white" style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                      {p.valor ? p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                    </span>

                    <span style={{ fontSize: 14.5, fontVariantNumeric: 'tabular-nums', color: tipo === 'atrasado' ? 'var(--error-medium)' : 'var(--gray-300)' }}>
                      {tipo === 'pago'
                        ? `Pago em ${formatarDataCurta(dataRef)}`
                        : dataRef
                        ? `Vence em ${formatarDataCurta(dataRef)}`
                        : 'Vencimento não definido'}
                    </span>

                    <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>{tempoRelativo(p.created_at)}</span>

                    <div className="flex items-center justify-end gap-2">
                      {tipo !== 'pago' && (
                        <button
                          type="button"
                          onClick={() => abrirCobrancaModal(p)}
                          className="inline-flex items-center gap-2 cursor-pointer transition-all duration-200"
                          style={{ height: 38, padding: '0 16px', borderRadius: 11, border: '1px solid rgba(30,182,232,0.4)', background: 'rgba(30,182,232,0.07)', color: 'var(--primary-300)', fontSize: 14.5, fontWeight: 600 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(30,182,232,0.16)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-200)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(30,182,232,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-300)'; }}
                        >
                          <Send size={16} />
                          {p.notificado_em ? 'Reenviar' : 'Cobrar'}
                        </button>
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                          className="grid place-items-center cursor-pointer transition-colors duration-200"
                          style={{ width: 38, height: 38, borderRadius: 10, border: 0, background: 'none', color: 'var(--gray-400)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(148,169,173,0.10)'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-100)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-400)'; }}
                        >
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
                          </svg>
                        </button>

                        {openMenuId === p.id && (
                          <div
                            className="absolute right-0 mt-2 z-20 p-2 flex flex-col"
                            style={{ width: 180, borderRadius: 16, border: '1px solid var(--gray-700)', background: 'var(--primary-800)', boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8), 0 0 0 1px rgba(30,182,232,0.06)' }}
                          >
                            <button
                              type="button"
                              onClick={() => { setOpenMenuId(null); if (p.projeto_id) router.push(`/dashboard/projetos/${p.projeto_id}`); }}
                              className="w-full text-left px-4 py-3 rounded-[10px] text-[14px] text-gray-100 bg-transparent border-0 cursor-pointer transition-colors hover:bg-[rgba(30,182,232,0.10)]"
                            >
                              Ver projeto
                            </button>
                            <button
                              type="button"
                              onClick={() => { setOpenMenuId(null); excluirPagamento(p.id); }}
                              className="w-full text-left px-4 py-3 rounded-[10px] text-[14px] bg-transparent border-0 cursor-pointer transition-colors hover:bg-[rgba(239,83,80,0.10)]"
                              style={{ color: 'var(--error-medium)' }}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {cobrancaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(4,12,16,0.72)', backdropFilter: 'blur(4px)' }}>
            <div
              className="w-full max-w-md flex flex-col overflow-hidden"
              style={{ borderRadius: 24, border: '1px solid var(--gray-600)', background: 'linear-gradient(180deg, rgba(16,40,50,0.98), rgba(7,28,36,0.98))', boxShadow: '0 50px 110px -34px rgba(0,0,0,0.85), 0 0 0 1px rgba(30,182,232,0.10)' }}
            >
              <div className="flex items-center justify-between" style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--gray-700)' }}>
                <div>
                  <div className="font-semibold text-white" style={{ fontSize: 18 }}>Enviar cobrança</div>
                  <div className="mt-1" style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    {cobrancaModal.valor
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cobrancaModal.valor)
                      : '—'} · {projetoNome(cobrancaModal.projeto_id)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCobrancaModal(null)}
                  className="grid place-items-center cursor-pointer transition-colors duration-200"
                  style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--gray-700)', background: 'rgba(20,40,48,0.4)', color: 'var(--gray-400)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4" style={{ padding: '24px 28px 28px' }}>
                <div>
                  <label className="block mb-[6px]" style={{ fontSize: 13, color: 'var(--gray-300)' }}>Chave PIX (opcional)</label>
                  <input
                    type="text"
                    value={pixInput}
                    onChange={(e) => setPixInput(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="w-full outline-none transition-colors duration-200"
                    style={{ borderRadius: 13, border: '1px solid var(--gray-700)', background: 'rgba(6,25,31,0.6)', color: 'var(--gray-100)', fontSize: 14, padding: '14px 18px' }}
                    onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary-500)'; }}
                    onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-700)'; }}
                  />
                  <p className="mt-[6px] m-0" style={{ fontSize: 12, color: 'var(--gray-500)' }}>Se informada, a chave será exibida no portal do cliente e no e-mail.</p>
                </div>

                {cobrancaFeedback && (
                  <div
                    className="flex items-center gap-2 rounded-[11px] text-[13px]"
                    style={{
                      padding: '12px 16px',
                      background: cobrancaFeedback.ok ? 'rgba(102,187,106,0.08)' : 'rgba(239,83,80,0.08)',
                      border: `1px solid ${cobrancaFeedback.ok ? 'rgba(102,187,106,0.3)' : 'rgba(239,83,80,0.3)'}`,
                      color: cobrancaFeedback.ok ? 'var(--success-medium)' : 'var(--error-medium)',
                    }}
                  >
                    {cobrancaFeedback.msg}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setCobrancaModal(null)}
                    className="flex-1 cursor-pointer transition-colors duration-200"
                    style={{ height: 48, borderRadius: 13, border: '1px solid var(--gray-700)', background: 'none', color: 'var(--gray-300)', fontSize: 14, fontWeight: 500 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={enviarCobranca}
                    disabled={enviandoCobranca}
                    className="flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ height: 48, borderRadius: 13, border: 0, background: 'linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%)', color: 'var(--primary-900)', fontSize: 15, fontWeight: 700, boxShadow: '0 12px 28px -12px rgba(30,182,232,0.8)' }}
                  >
                    <Send size={16} />
                    {enviandoCobranca ? 'Enviando...' : 'Enviar cobrança'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          .payments-scroll::-webkit-scrollbar { width: 8px; }
          .payments-scroll::-webkit-scrollbar-thumb { background: var(--primary-600); border-radius: 8px; }
          .payments-scroll { scrollbar-width: thin; scrollbar-color: var(--primary-600) transparent; }
        `}</style>
      </div>
    </>
  );
}
