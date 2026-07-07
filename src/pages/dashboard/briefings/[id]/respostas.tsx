"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import HeaderProfile from "@/components/HeaderProfile";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Calendar, User, Building2, CheckCircle, Clock, MessageSquare } from "lucide-react";

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
          id, status, prazo_resposta, respondido_em, created_at,
          template:template_id (id, titulo, descricao),
          projeto:projeto_id (id, titulo, clientes:cliente_id (nome, empresa))
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

      <>

        <div className="flex flex-col flex-1 min-w-0 px-4 sm:px-6 lg:pl-0 lg:pr-6 py-4 sm:py-6 gap-4 sm:gap-6 overflow-hidden">
          <header className="flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/dashboard/briefings")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-primary-700 text-gray-400 hover:text-gray-200 hover:bg-primary-800 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="text-[18px] sm:text-[20px] font-semibold text-gray-100 leading-tight truncate">
                  {loading ? "Carregando..." : (envio?.template?.titulo || "Respostas do briefing")}
                </div>
                <div className="text-[13px] text-gray-500 mt-0.5">Respostas do cliente</div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <HeaderProfile />
            </div>
          </header>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : erro ? (
            <div className="flex-1 flex items-center justify-center">
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
            <div className="flex-1 min-h-0 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 border-b border-primary-700 flex items-center gap-3 sm:gap-5 flex-wrap flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-full ${
                  respondido
                    ? "bg-third-500/15 text-third-300 border border-third-500/20"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                }`}>
                  {respondido ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {respondido ? "Respondido" : "Aguardando resposta"}
                </span>

                {envio?.projeto && (
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
                    <Building2 size={13} className="text-primary-400 flex-shrink-0" />
                    <span>{envio.projeto.titulo}</span>
                  </div>
                )}

                {envio?.projeto?.clientes?.nome && (
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
                    <User size={13} className="text-primary-400 flex-shrink-0" />
                    <span>{envio.projeto.clientes.nome}</span>
                    {envio.projeto.clientes.empresa && (
                      <span className="text-gray-600">· {envio.projeto.clientes.empresa}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                  <Calendar size={13} className="text-primary-400 flex-shrink-0" />
                  <span>Enviado em {formatarData(envio?.created_at)}</span>
                </div>

                {envio?.prazo_resposta && (
                  <div className="flex items-center gap-1.5 text-[13px] text-amber-400">
                    <Clock size={13} className="flex-shrink-0" />
                    <span>Prazo: {formatarData(envio.prazo_resposta)}</span>
                  </div>
                )}

                {envio?.respondido_em && (
                  <div className="flex items-center gap-1.5 text-[13px] text-third-400">
                    <CheckCircle size={13} className="flex-shrink-0" />
                    <span>Respondido em {formatarData(envio.respondido_em)}</span>
                  </div>
                )}

                <div className="ml-auto text-[12px] text-gray-600">
                  {respostas.length} {respostas.length === 1 ? "resposta" : "respostas"}
                </div>
              </div>

              {respostas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary-800 border border-primary-700 flex items-center justify-center">
                    <MessageSquare size={26} className="text-primary-400" />
                  </div>
                  <div>
                    <div className="text-[15px] font-medium text-gray-300">Nenhuma resposta ainda</div>
                    <div className="text-[13px] text-gray-500 mt-1">O cliente ainda não respondeu este briefing.</div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto respostas-scroll divide-y divide-primary-800">
                  {respostas.map((r, i) => (
                    <div key={r.id} className="px-4 sm:px-6 py-5 hover:bg-primary-800/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-800 border border-primary-700 text-[11px] font-bold text-primary-300 flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-gray-400 mb-2 leading-snug">{r.pergunta}</div>
                          {r.resposta ? (
                            <p className="text-[14px] text-gray-100 leading-relaxed whitespace-pre-wrap">
                              {r.resposta}
                            </p>
                          ) : (
                            <span className="text-[13px] text-gray-600 italic">Sem resposta</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </>

      <style jsx global>{`
        .respostas-scroll::-webkit-scrollbar { width: 6px; }
        .respostas-scroll::-webkit-scrollbar-track { background: transparent; }
        .respostas-scroll::-webkit-scrollbar-thumb { background: #1e3a45; border-radius: 999px; }
        .respostas-scroll::-webkit-scrollbar-thumb:hover { background: #2a4f5e; }
        .respostas-scroll { scrollbar-width: thin; scrollbar-color: #1e3a45 transparent; }
      `}</style>
    </>
  );
}
