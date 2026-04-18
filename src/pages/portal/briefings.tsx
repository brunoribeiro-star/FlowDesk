import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllBriefings, getPortalBriefingCampos, submitBriefingResposta } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

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
  const [briefingRespostas, setBriefingRespostas] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllBriefings(projectIds);
      setBriefings(data as unknown as BriefingEnvio[]);
      setLoading(false);
    })();
  }, [router]);

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
    const respostas = campos.map((c) => ({ pergunta: c.titulo_pergunta ?? "", resposta: briefingRespostas[c.id] ?? "" }));
    setSubmitting(true);
    const { error } = await submitBriefingResposta(envio.id, envio.projeto_id, respostas);
    setSubmitting(false);
    if (!error) {
      setBriefings((prev) => prev.map((b) => b.id === envio.id ? { ...b, status: "respondido", respondido_em: new Date().toISOString() } : b));
      setActiveBriefing(null);
      setBriefingRespostas({});
    }
  }

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const pending = briefings.filter((b) => b.status !== "respondido" && !b.respondido_em);
  const responded = briefings.filter((b) => b.status === "respondido" || !!b.respondido_em);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <ClientSidebar defaultOpen={false} />
        <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-hidden">
          <div className="h-12 w-80 rounded-lg bg-primary-800 animate-pulse" />
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg bg-primary-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">
        <header className="w-full flex items-center gap-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-primary-600 flex-shrink-0">
              <Image src={avatarSrc} alt="Avatar" width={60} height={60} className="object-cover" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[22px] text-gray-200 font-medium">Briefings</div>
              <div className="text-[14px] text-gray-300">Formulários enviados para você responder.</div>
            </div>
          </div>
          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center justify-end gap-3 min-w-0">
            <span className="text-[14px] text-gray-400">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[860px] mx-auto flex flex-col gap-6 pb-6">

            {briefings.length === 0 ? (
              <div className="bg-primary-800 border border-primary-700 rounded-lg p-10 text-center text-gray-400 text-[14px]">
                Nenhum briefing recebido.
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Para responder</div>
                      <div className="text-[28px] text-gray-200 font-bold">{pending.length} briefing{pending.length > 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
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
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Respondidos</div>
                      <div className="text-[28px] text-gray-200 font-bold">{responded.length} briefing{responded.length > 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
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
      `}</style>
    </div>
  );
}

function BriefingItem({ briefing: b, activeBriefing, briefingCampos, briefingRespostas, submitting, openBriefing, setBriefingRespostas, handleSubmit }: any) {
  const template = b.briefings_templates;
  const campos = briefingCampos[template?.id] ?? [];
  const isOpen = activeBriefing === b.id;
  const isResponded = b.status === "respondido" || !!b.respondido_em;

  return (
    <div className="overflow-hidden">
      <button
        onClick={() => openBriefing(b.id, template?.id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-primary-700/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardList size={14} className="text-gray-500 flex-shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-[14px] text-gray-200 font-medium truncate">{template?.titulo ?? "Briefing"}</p>
            <p className="text-[12px] text-gray-500">{(b.projetos as any)?.titulo ?? "Projeto"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isResponded
            ? <span className="text-[12px] text-third-400 bg-third-400/10 px-2 py-0.5 rounded-full">Respondido</span>
            : <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pendente</span>
          }
          {isOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {isOpen && !isResponded && (
        <div className="px-5 pb-4 border-t border-primary-700">
          {campos.length === 0 ? (
            <p className="text-[13px] text-gray-500 mt-3">Carregando perguntas...</p>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {campos.map((c: any) => (
                <div key={c.id}>
                  <label className="text-[13px] text-gray-300 font-medium block mb-1">
                    {c.titulo_pergunta}{c.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {c.descricao_pergunta && <p className="text-[12px] text-gray-500 mb-1">{c.descricao_pergunta}</p>}
                  {c.tipo === "textarea" ? (
                    <textarea rows={3} placeholder={c.placeholder ?? ""} value={briefingRespostas[c.id] ?? ""}
                      onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                      className="w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500"
                    />
                  ) : c.tipo === "select" && c.opcoes ? (
                    <select value={briefingRespostas[c.id] ?? ""}
                      onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                      className="w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {c.opcoes.map((op: string) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder={c.placeholder ?? ""} value={briefingRespostas[c.id] ?? ""}
                      onChange={(ev) => setBriefingRespostas((p: any) => ({ ...p, [c.id]: ev.target.value }))}
                      className="w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                    />
                  )}
                </div>
              ))}
              <button disabled={submitting} onClick={() => handleSubmit(b)}
                className="w-full bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-xl py-2.5 text-[14px] transition-colors disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Enviar respostas"}
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && isResponded && (
        <div className="px-5 pb-4 border-t border-primary-700">
          <p className="text-[13px] text-gray-500 mt-3">
            Respondido em {b.respondido_em ? new Date(b.respondido_em).toLocaleDateString("pt-BR") : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
