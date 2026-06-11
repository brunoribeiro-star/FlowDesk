import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllBriefings, getPortalBriefingCampos } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

type BriefingEnvio = {
  id: string; status: string | null; enviado_em: string | null; respondido_em: string | null;
  prazo_resposta: string | null; projeto_id: string;
  projetos: { titulo: string } | null;
  briefings_templates: { id: string; titulo: string } | null;
  briefings_respostas: any[];
};
type Campo = { id: string; titulo_pergunta: string | null; descricao_pergunta: string | null; tipo: string; obrigatorio: boolean | null; opcoes: string[] | null; placeholder: string | null; ordem: number };

export default function PortalBriefingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [briefings, setBriefings] = useState<BriefingEnvio[]>([]);
  const [activeBriefing, setActiveBriefing] = useState<string | null>(null);
  const [briefingCampos, setBriefingCampos] = useState<Record<string, Campo[]>>({});
  const [briefingRespostas, setBriefingRespostas] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllBriefings(projectIds);
      setBriefings(data as unknown as BriefingEnvio[]);
      setLoading(false);
    })();
  }, []);

  async function openBriefing(envioId: string, templateId: string) {
    if (activeBriefing === envioId) { setActiveBriefing(null); return; }
    setActiveBriefing(envioId);
    if (!briefingCampos[templateId]) {
      const { data } = await getPortalBriefingCampos(templateId);
      setBriefingCampos((prev) => ({ ...prev, [templateId]: data }));
    }
  }

  async function handleSubmit(envio: BriefingEnvio) {
    const templateId = envio.briefings_templates?.id ?? "";
    const campos = briefingCampos[templateId] ?? [];
    const respostas = campos.map((c) => {
      const val = briefingRespostas[c.id];
      const resposta = Array.isArray(val) ? val.join(", ") : (val ?? "");
      return { pergunta: c.titulo_pergunta ?? "", resposta };
    });

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); return; }

    const res = await fetch("/api/briefings/submit-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ envio_id: envio.id, respostas }),
    });

    setSubmitting(false);

    if (res.ok) {
      setBriefings((prev) => prev.map((b) => b.id === envio.id ? { ...b, status: "respondido", respondido_em: new Date().toISOString() } : b));
      setActiveBriefing(null);
      setBriefingRespostas({});
    }
  }

  const pending = briefings.filter((b) => b.status !== "respondido" && !b.respondido_em);
  const responded = briefings.filter((b) => b.status === "respondido" || !!b.respondido_em);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
        <ClientSidebar defaultOpen={false} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-primary-700 px-6 py-4 flex-shrink-0">
            <div className="h-5 w-40 rounded bg-primary-800 animate-pulse" />
            <div className="h-3 w-56 rounded bg-primary-800 animate-pulse mt-2" />
          </div>
          <div className="flex-1 p-6 flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-primary-800 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
      <ClientSidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex-shrink-0 border-b border-primary-700 px-6 py-4 flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/portal/dashboard")}
              className="text-[13px] text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
            >
              ← Voltar
            </button>
            <div className="w-px h-4 bg-primary-700" />
            <div>
              <div className="text-[16px] font-semibold text-gray-100 leading-tight">Briefings</div>
              <div className="text-[12px] text-gray-500">Formulários para você responder</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-400 hidden sm:block">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-8">
            {briefings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-800 border border-primary-700 flex items-center justify-center">
                  <ClipboardList size={22} className="text-primary-400" />
                </div>
                <div>
                  <div className="text-[14px] font-medium text-gray-300">Nenhum briefing recebido</div>
                  <div className="text-[12px] text-gray-500 mt-1">Briefings enviados para você aparecerão aqui.</div>
                </div>
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Para responder</span>
                      <span className="min-w-[20px] h-5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold flex items-center justify-center px-1.5">
                        {pending.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {pending.map((b) => (
                        <BriefingItem
                          key={b.id}
                          briefing={b}
                          activeBriefing={activeBriefing}
                          briefingCampos={briefingCampos}
                          briefingRespostas={briefingRespostas}
                          submitting={submitting}
                          openBriefing={openBriefing}
                          setBriefingRespostas={setBriefingRespostas}
                          handleSubmit={handleSubmit}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {responded.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Respondidos</span>
                      <span className="min-w-[20px] h-5 rounded-full bg-third-500/15 text-third-400 text-[10px] font-bold flex items-center justify-center px-1.5">
                        {responded.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {responded.map((b) => (
                        <BriefingItem
                          key={b.id}
                          briefing={b}
                          activeBriefing={activeBriefing}
                          briefingCampos={briefingCampos}
                          briefingRespostas={briefingRespostas}
                          submitting={submitting}
                          openBriefing={openBriefing}
                          setBriefingRespostas={setBriefingRespostas}
                          handleSubmit={handleSubmit}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-500); border-radius: 9999px; border: 2px solid var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-400); }
        html, body { background-color: #06191F; overflow: hidden; }
      `}</style>
    </div>
  );
}

function BriefingItem({ briefing: b, activeBriefing, briefingCampos, briefingRespostas, submitting, openBriefing, setBriefingRespostas, handleSubmit }: any) {
  const template = b.briefings_templates;
  const campos = briefingCampos[template?.id] ?? [];
  const isOpen = activeBriefing === b.id;
  const isResponded = b.status === "respondido" || !!b.respondido_em;

  const answeredCount = campos.filter((c: any) => {
    const val = briefingRespostas[c.id];
    return Array.isArray(val) ? val.length > 0 : !!(val as string)?.trim();
  }).length;

  return (
    <div className={`bg-primary-800 border rounded-xl overflow-hidden transition-colors ${
      isOpen ? "border-primary-600" : "border-primary-700 hover:border-primary-600"
    }`}>
      <button
        onClick={() => openBriefing(b.id, template?.id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-primary-700/20 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isResponded ? "bg-third-500/10 text-third-400" : "bg-amber-500/10 text-amber-400"
        }`}>
          <ClipboardList size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-gray-200 truncate">
            {template?.titulo ?? "Briefing"}
          </div>
          <div className="text-[12px] text-gray-500 truncate mt-0.5">
            {(b.projetos as any)?.titulo ?? "Projeto"}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {isResponded
            ? <span className="text-[11px] text-third-400 bg-third-400/10 px-2 py-0.5 rounded-full border border-third-400/20">Respondido</span>
            : <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">Pendente</span>
          }
          {isOpen
            ? <ChevronUp size={14} className="text-gray-500" />
            : <ChevronDown size={14} className="text-gray-500" />
          }
        </div>
      </button>

      {isOpen && isResponded && (
        <div className="border-t border-primary-700 px-5 py-4 bg-primary-900/40 flex items-center gap-2.5">
          <CheckCircle size={14} className="text-third-400 flex-shrink-0" />
          <span className="text-[13px] text-gray-400">
            Respondido em{" "}
            {b.respondido_em
              ? new Date(b.respondido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
              : "—"}
          </span>
        </div>
      )}

      {isOpen && !isResponded && (
        <div className="border-t border-primary-700">
\          <div className="flex items-center justify-between px-5 py-2.5 bg-primary-900/50 border-b border-primary-700/50">
            <span className="text-[12px] text-gray-500">
              {campos.length === 0 ? "Carregando..." : `${campos.length} pergunta${campos.length !== 1 ? "s" : ""}`}
            </span>
            {campos.length > 0 && (
              <span className={`text-[12px] font-medium ${answeredCount === campos.length ? "text-third-400" : "text-primary-400"}`}>
                {answeredCount}/{campos.length} respondidas
              </span>
            )}
          </div>

          {campos.length === 0 ? (
            <div className="flex items-center gap-2.5 px-5 py-5">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-[13px] text-gray-500">Carregando perguntas...</span>
            </div>
          ) : (
            <div className="px-5 py-5 flex flex-col gap-5">
              {campos.map((c: any, idx: number) => {
                const val = briefingRespostas[c.id];
                return (
                  <div key={c.id} className="flex flex-col gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-700 text-[10px] font-bold text-primary-300 flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[13px] font-medium text-gray-200 leading-snug">
                          {c.titulo_pergunta}
                          {c.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {c.descricao_pergunta && (
                          <p className="text-[12px] text-gray-500">{c.descricao_pergunta}</p>
                        )}
                      </div>
                    </div>

                    <div className="ml-7">
                      {c.tipo === "long_text" && (
                        <textarea
                          rows={3}
                          placeholder={c.placeholder ?? "Sua resposta..."}
                          value={(val as string) ?? ""}
                          onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                          className="w-full bg-primary-900 border border-primary-700 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      )}

                      {c.tipo === "short_text" && (
                        <input
                          type="text"
                          placeholder={c.placeholder ?? "Sua resposta..."}
                          value={(val as string) ?? ""}
                          onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                          className="w-full bg-primary-900 border border-primary-700 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      )}

                      {c.tipo === "multiple_choice" && Array.isArray(c.opcoes) && (
                        <div className="flex flex-col gap-2">
                          {c.opcoes.map((opcao: string) => (
                            <label key={opcao} className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                val === opcao ? "border-primary-500 bg-primary-500" : "border-primary-600 group-hover:border-primary-400"
                              }`}>
                                {val === opcao && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <input
                                type="radio"
                                name={`campo-${c.id}`}
                                value={opcao}
                                checked={val === opcao}
                                onChange={() => setBriefingRespostas((p: any) => ({ ...p, [c.id]: opcao }))}
                                className="sr-only"
                              />
                              <span className="text-[13px] text-gray-300 group-hover:text-gray-100 transition-colors">{opcao}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {c.tipo === "checkboxes" && Array.isArray(c.opcoes) && (
                        <div className="flex flex-col gap-2">
                          {c.opcoes.map((opcao: string) => {
                            const checked = Array.isArray(val) && val.includes(opcao);
                            return (
                              <label key={opcao} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  checked ? "border-primary-500 bg-primary-500" : "border-primary-600 group-hover:border-primary-400"
                                }`}>
                                  {checked && (
                                    <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                      <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(ev) => {
                                    const prev = Array.isArray(val) ? val : [];
                                    const next = ev.target.checked ? [...prev, opcao] : prev.filter((o) => o !== opcao);
                                    setBriefingRespostas((p: any) => ({ ...p, [c.id]: next }));
                                  }}
                                  className="sr-only"
                                />
                                <span className="text-[13px] text-gray-300 group-hover:text-gray-100 transition-colors">{opcao}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {!["short_text", "long_text", "multiple_choice", "checkboxes"].includes(c.tipo) && (
                        <input
                          type="text"
                          placeholder={c.placeholder ?? "Sua resposta..."}
                          value={(val as string) ?? ""}
                          onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                          className="w-full bg-primary-900 border border-primary-700 rounded-lg px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-primary-700/50 mt-1">
                <button
                  disabled={submitting}
                  onClick={() => handleSubmit(b)}
                  className="w-full bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-lg py-3 text-[14px] transition-colors disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Enviar respostas"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
