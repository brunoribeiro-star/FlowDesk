"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";
import HeaderProfile from "@/components/HeaderProfile";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ClipboardList, Calendar, User, Building2, CheckCircle, Clock, MessageSquare } from "lucide-react";

type Resposta = {
  id: string;
  pergunta: string;
  resposta: string | null;
  created_at: string;
};

type Envio = {
  id: string;
  status: string | null;
  prazo_resposta: string | null;
  respondido_em: string | null;
  created_at: string;
  template: { id: string; titulo: string; descricao: string | null } | null;
  projeto: {
    id: string;
    titulo: string;
    clientes: { nome: string; empresa: string | null } | null;
  } | null;
};

function formatarData(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function RespostasBriefingPage() {
  const router = useRouter();
  const { id } = router.query;

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [respostas, setRespostas] = useState<Resposta[]>([]);

  useEffect(() => {
    if (!id || typeof id !== "string" || !user) return;

    async function carregar() {
      setLoading(true);
      setErro(null);

      const { data: envioData, error: envioErr } = await supabase
        .from("briefings_envios")
        .select(`
          id,
          status,
          prazo_resposta,
          respondido_em,
          created_at,
          template:template_id (
            id,
            titulo,
            descricao
          ),
          projeto:projeto_id (
            id,
            titulo,
            clientes:cliente_id (
              nome,
              empresa
            )
          )
        `)
        .eq("id", id)
        .eq("user_id", user!.id)
        .single();

      if (envioErr || !envioData) {
        setErro("Envio não encontrado ou sem permissão.");
        setLoading(false);
        return;
      }

      setEnvio(envioData as unknown as Envio);

      const { data: respostasData, error: respostasErr } = await supabase
        .from("briefings_respostas")
        .select("id, pergunta, resposta, created_at")
        .eq("envio_id", id)
        .order("created_at", { ascending: true });

      if (respostasErr) {
        setErro("Erro ao carregar respostas.");
        setLoading(false);
        return;
      }

      setRespostas((respostasData || []) as Resposta[]);
      setLoading(false);
    }

    carregar();
  }, [id, user]);

  const respondido = envio?.status === "respondido" || !!envio?.respondido_em;

  return (
    <>
      <Head>
        <title>
          {envio ? `Respostas — ${envio.template?.titulo || "Briefing"}` : "Respostas do Briefing"}
        </title>
      </Head>

      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <Sidebar defaultOpen={false} onOpenChange={() => {}} />

        <div className="flex flex-col flex-1 gap-6 pr-6 py-8 overflow-hidden">
          <header className="w-full flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/briefings")}
                className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-primary-400" />
                <span className="text-[16px] font-semibold text-gray-100">
                  {envio?.template?.titulo || "Respostas do briefing"}
                </span>
              </div>
            </div>
            <HeaderProfile />
          </header>

          <div className="flex-1 overflow-y-auto briefings-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : erro ? (
              <div className="flex items-center justify-center py-24">
                <div className="text-center flex flex-col items-center gap-3">
                  <span className="text-rose-400 text-[15px]">{erro}</span>
                  <button
                    onClick={() => router.push("/dashboard/briefings")}
                    className="text-[13px] text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Voltar para briefings
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-10">
                {/* Header card do envio */}
                <div className="bg-primary-800 border border-primary-700 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[18px] font-semibold text-gray-100">
                        {envio?.template?.titulo || "Briefing"}
                      </span>
                      {envio?.template?.descricao && (
                        <span className="text-[13px] text-gray-400 leading-relaxed">
                          {envio.template.descricao}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium flex-shrink-0 ${
                      respondido
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {respondido ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {respondido ? "Respondido" : "Pendente"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-primary-700">
                    {envio?.projeto && (
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-primary-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Projeto</span>
                          <span className="text-[13px] text-gray-200">{envio.projeto.titulo}</span>
                        </div>
                      </div>
                    )}
                    {envio?.projeto?.clientes?.nome && (
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-primary-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Cliente</span>
                          <span className="text-[13px] text-gray-200">{envio.projeto.clientes.nome}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-primary-400 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[11px] text-gray-500 uppercase tracking-wide">Enviado em</span>
                        <span className="text-[13px] text-gray-200">{formatarData(envio?.created_at)}</span>
                      </div>
                    </div>
                    {envio?.prazo_resposta && (
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-amber-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Prazo</span>
                          <span className="text-[13px] text-amber-300">{formatarData(envio.prazo_resposta)}</span>
                        </div>
                      </div>
                    )}
                    {envio?.respondido_em && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-[11px] text-gray-500 uppercase tracking-wide">Respondido em</span>
                          <span className="text-[13px] text-emerald-300">{formatarData(envio.respondido_em)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lista de respostas */}
                {respostas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary-800 border border-primary-700 flex items-center justify-center">
                      <MessageSquare size={22} className="text-primary-400" />
                    </div>
                    <span className="text-[15px] font-medium text-gray-300">Nenhuma resposta ainda</span>
                    <span className="text-[13px] text-gray-500">O cliente ainda não respondeu este briefing.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <span className="text-[13px] text-gray-500 font-medium uppercase tracking-wide">
                      {respostas.length} resposta{respostas.length > 1 ? "s" : ""}
                    </span>
                    {respostas.map((r, i) => (
                      <div
                        key={r.id}
                        className="bg-primary-800 border border-primary-700 rounded-xl p-5 flex flex-col gap-2"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-700 text-[11px] font-bold text-primary-300 flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-[14px] font-medium text-gray-200">{r.pergunta}</span>
                        </div>
                        <div className="ml-7">
                          {r.resposta ? (
                            <p className="text-[14px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {r.resposta}
                            </p>
                          ) : (
                            <span className="text-[13px] text-gray-600 italic">Sem resposta</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .briefings-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .briefings-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .briefings-scroll::-webkit-scrollbar-thumb {
          background: var(--primary-700);
          border-radius: 999px;
        }
        .briefings-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--primary-600);
        }
        .briefings-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--primary-700) transparent;
        }
      `}</style>
    </>
  );
}
