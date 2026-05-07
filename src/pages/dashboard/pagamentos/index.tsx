"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import HeaderProfile from "@/components/HeaderProfile";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/Skeleton";
import { formatarData, formatarDataCurta, tempoRelativo } from "@/lib/utils";
import { Send, X } from "lucide-react";


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

  return (
    <>

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
        <header className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="text-[14px]">Voltar</span>
            </button>

            <div className="flex flex-col">
              <h1 className="text-[28px] md:text-[32px] font-semibold text-gray-100">
                Pagamentos
              </h1>
              <p className="text-[15px] md:text-[16px] text-gray-300">
                Overview geral dos pagamentos dos seus projetos.
              </p>
            </div>
          </div>

          <HeaderProfile />
        </header>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
            <span>
              {total === 0
                ? "Nenhum pagamento cadastrado"
                : total === 1
                ? "1 pagamento cadastrado"
                : `${total} pagamentos cadastrados`}
            </span>
          </div>

          <div className="flex-1" />

          <div className="relative">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-2 pr-10 text-[13px] text-gray-100 appearance-none"
            >
              <option value="">Todos os status</option>
              <option value="pendentes">Pendentes</option>
              <option value="pagos">Pagos</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
              ▼
            </span>
          </div>
        </div>

        <section className="flex-1 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-3 border-b border-primary-700 text-[13px] text-gray-400 grid grid-cols-7 gap-4">
            <div>Cliente</div>
            <div>Projeto</div>
            <div>Status</div>
            <div>Valor</div>
            <div>Vencimento / Pagamento</div>
            <div>Criação</div>
            <div className="text-right">Ações</div>
          </div>

          <div className="flex-1 overflow-y-auto payments-scroll">
            {loading ? (
              <SkeletonList rows={6} cols={7} />
            ) : erro ? (
              <div className="py-16 text-center text-red-400 text-sm">{erro}</div>
            ) : pagamentosFiltrados.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                Nenhum pagamento encontrado.
              </div>
            ) : (
              <div className="divide-y divide-primary-800">
                {pagamentosFiltrados.map((p) => {
                  const status = statusVisual(p);
                  const cliente = clienteInfo(p.projeto_id);
                  const foto = cliente?.foto_url || "/cliente_placeholder.svg";
                  const tipo = classificarPagamento(p);
                  const dataRef =
                    tipo === "pago" ? p.data_pagamento : p.data_prevista;

                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-primary-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-primary-700 flex-shrink-0">
                          <Image
                            src={foto}
                            alt="Cliente"
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] text-gray-100">
                            {cliente?.nome || "Cliente"}
                          </span>
                          <span className="text-[12px] text-gray-400">
                            {cliente?.empresa || ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-100 text-[15px]">
                        {projetoNome(p.projeto_id)}
                      </div>

                      <div className="flex items-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center text-[14px] text-gray-100">
                        {p.valor
                          ? p.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </div>

                      <div className="flex items-center text-[13px] text-gray-100">
                        {tipo === "pago"
                          ? `Pago em ${formatarDataCurta(dataRef)}`
                          : dataRef
                          ? `Vence em ${formatarDataCurta(dataRef)}`
                          : "Vencimento não definido"}
                      </div>

                      <div className="flex items-center text-[13px] text-gray-400">
                        {tempoRelativo(p.created_at)}
                      </div>

                      <div className="flex items-center justify-end gap-3">
                        {tipo !== "pago" && (
                          <button
                            onClick={() => abrirCobrancaModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 border border-primary-500 text-[12px] text-primary-100"
                          >
                            <Send size={12} />
                            {p.notificado_em ? "Reenviar cobrança" : "Cobrar"}
                          </button>
                        )}

                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId((cur) => (cur === p.id ? null : p.id))
                            }
                            className="p-1.5 rounded-lg hover:bg-primary-700 text-gray-400"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>

                          {openMenuId === p.id && (
                            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-primary-800 border border-primary-700 shadow-xl z-20">
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (p.projeto_id)
                                    router.push(`/dashboard/projetos/${p.projeto_id}`);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[13px] text-gray-100 hover:bg-primary-700 rounded-t-xl"
                              >
                                Ver projeto
                              </button>

                              <button
                                onClick={() => excluirPagamento(p.id)}
                                className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-primary-700 rounded-b-xl"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {cobrancaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-primary-800 border border-primary-700 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-primary-700">
                <div>
                  <div className="text-[16px] font-semibold text-gray-100">Enviar cobrança</div>
                  <div className="text-[12px] text-gray-400 mt-0.5">
                    {cobrancaModal.valor
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cobrancaModal.valor)
                      : "—"} · {projetoNome(cobrancaModal.projeto_id)}
                  </div>
                </div>
                <button onClick={() => setCobrancaModal(null)} className="p-2 rounded-lg hover:bg-primary-700 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-[13px] text-gray-300 mb-1.5">Chave PIX (opcional)</label>
                  <input
                    type="text"
                    value={pixInput}
                    onChange={(e) => setPixInput(e.target.value)}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    className="w-full bg-primary-900 border border-primary-700 focus:border-primary-500 rounded-xl px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Se informada, a chave será exibida no portal do cliente e no e-mail.</p>
                </div>

                {cobrancaFeedback && (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] ${cobrancaFeedback.ok ? "bg-third-500/10 text-third-400 border border-third-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {cobrancaFeedback.msg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setCobrancaModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-primary-600 text-[14px] text-gray-300 hover:bg-primary-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviarCobranca}
                    disabled={enviandoCobranca}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-60 text-[14px] font-semibold text-primary-900 transition-colors"
                  >
                    <Send size={14} />
                    {enviandoCobranca ? "Enviando..." : "Enviar cobrança"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          .payments-scroll::-webkit-scrollbar {
            width: 10px;
          }
          .payments-scroll::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.9);
          }
          .payments-scroll::-webkit-scrollbar-thumb {
            background: var(--primary-500);
            border-radius: 999px;
            border: 2px solid rgba(15, 23, 42, 0.9);
          }
          .payments-scroll::-webkit-scrollbar-thumb:hover {
            background: var(--primary-400);
          }
          .payments-scroll {
            scrollbar-width: thin;
            scrollbar-color: var(--primary-500) rgba(15, 23, 42, 0.9);
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
    </>
  );
}
