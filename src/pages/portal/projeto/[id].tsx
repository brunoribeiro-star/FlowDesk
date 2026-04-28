import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import {
  getPortalProject, getPortalTasks, getPortalFiles, getPortalLinks,
  getPortalBriefings, getPortalBriefingCampos, getPortalEntregaveis,
  getPortalPayments, updateEntregavelStatus, submitBriefingResposta,
} from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import ImageAnnotatorModal from "@/components/ImageAnnotatorModal";
import {
  CheckCircle2, Clock, FileText, Link2, Package, ClipboardList,
  CreditCard, ChevronDown, ChevronUp, ExternalLink, Pencil,
} from "lucide-react";

type TabId = "visao_geral" | "entregaveis" | "briefings" | "pagamentos" | "etapas";

type Projeto = {
  id: string; titulo: string; descricao: string | null; status: string;
  prazo_entrega: string | null; data_inicio: string | null; progresso: number | null; cover_url: string | null;
};
type Subtask = { id: string; titulo: string; concluida: boolean | null };
type Task = { id: string; titulo: string; status: string | null; concluida: boolean | null; due_date: string | null; subtasks?: Subtask[] };
type Arquivo = { id: string; nome: string; url: string; status: string | null; created_at: string };
type LinkProjeto = { id: string; titulo: string | null; url: string; created_at: string };
type EntregavelArquivo = { url: string; tipo: string; nome: string };
type Entregavel = {
  id: string; titulo: string; descricao: string | null;
  url: string | null; arquivo_url: string | null; arquivo_tipo: string | null;
  arquivos: EntregavelArquivo[] | null;
  status: string; feedback_cliente: string | null; feedback_imagem_url: string | null;
  reviewed_at: string | null; created_at: string;
};
type BriefingEnvio = { id: string; status: string | null; enviado_em: string | null; respondido_em: string | null; prazo_resposta: string | null; briefings_templates: any; briefings_respostas: any[] };
type Pagamento = { id: string; valor: number; status: string; data_prevista: string | null; forma_pagamento: string; parcela: number | null; total_parcelas: number | null };
type Campo = { id: string; titulo_pergunta: string | null; descricao_pergunta: string | null; tipo: string; obrigatorio: boolean | null; opcoes: string[] | null; placeholder: string | null; ordem: number };

type PageState = "loading" | "ready" | "denied" | "error";

export default function PortalProjetoPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [activeTab, setActiveTab] = useState<TabId>("visao_geral");
  const [user, setUser] = useState<any>(null);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [links, setLinks] = useState<LinkProjeto[]>([]);
  const [entregaveis, setEntregaveis] = useState<Entregavel[]>([]);
  const [briefings, setBriefings] = useState<BriefingEnvio[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  const [activeBriefing, setActiveBriefing] = useState<string | null>(null);
  const [briefingCampos, setBriefingCampos] = useState<Record<string, Campo[]>>({});
  const [briefingRespostas, setBriefingRespostas] = useState<Record<string, string>>({});
  const [submittingBriefing, setSubmittingBriefing] = useState(false);

  const [reviewingEntregavel, setReviewingEntregavel] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [entregavelFilter, setEntregavelFilter] = useState<"aguardando" | "para_alteracao" | "aprovado">("aguardando");

  const [annotatorUrl, setAnnotatorUrl] = useState<string | null>(null);
  const [annotatorEntregavelId, setAnnotatorEntregavelId] = useState<string | null>(null);
  const [annotatedBlob, setAnnotatedBlob] = useState<Blob | null>(null);
  const [annotatedPins, setAnnotatedPins] = useState<Array<{ xPct: number; yPct: number; text: string }>>([]);
  const [annotatedResults, setAnnotatedResults] = useState<Array<{ imageUrl: string; blob: Blob | null; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null>(null);

  const loadData = useCallback(async (projectId: string) => {
    const [projetoRes, tasksRes, arquivosRes, linksRes, entregaveisRes, briefingsRes, pagamentosRes] = await Promise.all([
      getPortalProject(projectId), getPortalTasks(projectId), getPortalFiles(projectId),
      getPortalLinks(projectId), getPortalEntregaveis(projectId), getPortalBriefings(projectId), getPortalPayments(projectId),
    ]);
    if (projetoRes.error || !projetoRes.data) { setPageState("error"); return; }
    setProjeto(projetoRes.data);
    setTasks(tasksRes.data);
    setArquivos(arquivosRes.data);
    setLinks(linksRes.data);
    setEntregaveis(entregaveisRes.data);
    setBriefings(briefingsRes.data);
    setPagamentos(pagamentosRes.data);
    setPageState("ready");
  }, []);

  useEffect(() => {
    if (!router.isReady || !id) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setPageState("denied"); return; }
      setUser(session.user);
      const { data: member } = await supabase
        .from("project_members").select("id").eq("project_id", id)
        .eq("user_id", session.user.id).eq("role", "cliente").maybeSingle();
      if (!member) { setPageState("denied"); return; }
      await loadData(id);
    })();
  }, [router.isReady, id, loadData]);

  useEffect(() => {
    if (!id || pageState !== "ready") return;
    const channel = supabase
      .channel(`portal-project-${id}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "tasks", filter: `projeto_id=eq.${id}` }, () => {
        getPortalTasks(id).then(({ data }) => { if (data) setTasks(data); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, pageState]);

  async function openBriefing(envioId: string, templateId: string) {
    if (activeBriefing === envioId) { setActiveBriefing(null); return; }
    setActiveBriefing(envioId);
    if (!briefingCampos[templateId]) {
      const { data } = await getPortalBriefingCampos(templateId);
      setBriefingCampos((prev) => ({ ...prev, [templateId]: data }));
    }
  }

  async function handleSubmitBriefing(envio: BriefingEnvio) {
    const templateId = envio.briefings_templates?.id;
    const campos = briefingCampos[templateId] ?? [];
    const respostas = campos.map((c) => ({ pergunta: c.titulo_pergunta ?? "", resposta: briefingRespostas[c.id] ?? "" }));
    setSubmittingBriefing(true);
    const { error } = await submitBriefingResposta(envio.id, id, respostas);
    setSubmittingBriefing(false);
    if (!error) {
      setBriefings((prev) => prev.map((b) => b.id === envio.id ? { ...b, status: "respondido", respondido_em: new Date().toISOString() } : b));
      setActiveBriefing(null);
      setBriefingRespostas({});
    }
  }

  async function handleReview(entregavelId: string, status: "aprovado" | "para_alteracao") {
    setSubmittingReview(true);

    let imageUrl: string | null = null;
    let feedbackImagens: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null = null;
    const ent = entregaveis.find(e => e.id === entregavelId);
    const projectId = (ent as any)?.project_id ?? id;

    if (annotatedResults && annotatedResults.length > 0 && user) {
      const uploaded: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> = [];
      for (const result of annotatedResults) {
        if (!result.blob) continue;
        const path = `${user.id}/${projectId}/feedback-anotacoes/${entregavelId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
        const { error: upErr } = await supabase.storage.from("projetos").upload(path, result.blob, { contentType: "image/png" });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("projetos").getPublicUrl(path);
          uploaded.push({ url: urlData.publicUrl, pins: result.pins });
        }
      }
      if (uploaded.length > 0) {
        imageUrl = uploaded[0].url;
        feedbackImagens = uploaded.length > 1 ? uploaded : null;
      }
    } else if (annotatedBlob && user) {
      const path = `${user.id}/${projectId}/feedback-anotacoes/${entregavelId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("projetos").upload(path, annotatedBlob, { contentType: "image/png" });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("projetos").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await updateEntregavelStatus(entregavelId, status, feedbackText, imageUrl, annotatedPins.length ? annotatedPins : null, feedbackImagens);
    setSubmittingReview(false);
    if (!error) {
      setEntregaveis((prev) => prev.map((e) => e.id === entregavelId
        ? { ...e, status, feedback_cliente: feedbackText, feedback_imagem_url: imageUrl, reviewed_at: new Date().toISOString() } : e
      ));
      setReviewingEntregavel(null);
      setFeedbackText("");
      setAnnotatedBlob(null);
      setAnnotatedPins([]);
      setAnnotatedResults(null);
    }
  }

  const concluidas = tasks.filter((t) => t.status === "concluida" || t.concluida).length;
  const progresso = tasks.length > 0 ? Math.round((concluidas / tasks.length) * 100) : (projeto?.progresso ?? 0);
  const pendingApprovals = entregaveis.filter((e) => e.status === "aguardando_aprovacao").length;
  const pendingBriefings = briefings.filter((b) => b.status !== "respondido" && !b.respondido_em).length;
  const pendingPayments = pagamentos.filter((p) => p.status === "pendente").length;

  if (pageState === "loading") {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageState === "denied" || pageState === "error" || !projeto) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            {pageState === "denied" ? "Você não tem acesso a este projeto." : "Erro ao carregar projeto."}
          </p>
          <button onClick={() => router.push("/portal/dashboard")} className="text-primary-400 hover:text-primary-300 text-[14px]">
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 pr-6 py-8 w-full overflow-hidden">
        <div className="flex items-center justify-between gap-4 flex-shrink-0">
          <button
            onClick={() => router.push("/portal/dashboard")}
            className="inline-flex items-center gap-2 bg-primary-800 border border-primary-700 text-gray-100 rounded-xl px-4 py-2 text-[15px] hover:bg-primary-700 transition-colors"
          >
            ← Voltar
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-gray-400">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </div>

        <div className="mt-6 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <div className="w-full max-w-[980px] mx-auto">

            <div className="bg-primary-800 border border-primary-700 rounded-3xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[24px] font-bold text-primary-100 leading-tight">{projeto.titulo}</h1>
                  <div className="mt-2">
                    <StatusBadge status={projeto.status} />
                  </div>
                </div>
                <div className="w-full md:w-[320px] flex-shrink-0">
                  <div className="w-full h-2.5 bg-primary-900/60 border border-primary-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-400 transition-[width] duration-300" style={{ width: `${progresso}%` }} />
                  </div>
                  <div className="mt-2 text-[13px] text-gray-300">{progresso}% concluído</div>
                </div>
              </div>

              {projeto.cover_url && (
                <img src={projeto.cover_url} alt="" className="mt-4 w-full h-32 object-cover rounded-2xl opacity-75" />
              )}

              <div className="mt-6 bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-primary-700">
                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Status</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">{projeto.status}</div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Progresso</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">{progresso}%</div>
                    {tasks.length > 0 && <div className="text-[12px] text-gray-500 mt-0.5">{concluidas}/{tasks.length} tarefas</div>}
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Entrega</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">{projeto.prazo_entrega ? formatDate(projeto.prazo_entrega) : "—"}</div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-[12px] text-gray-400">Início</div>
                    <div className="mt-1 text-[16px] text-gray-100 font-medium">{projeto.data_inicio ? formatDate(projeto.data_inicio) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

          <section className="mt-6 bg-primary-800 border border-primary-700 rounded-3xl p-5 flex flex-col overflow-hidden min-h-[560px]">
            <div className="flex flex-wrap gap-2 border-b border-primary-700 pb-3 mb-4 flex-shrink-0">
              {([
                ["visao_geral", "Visão Geral"],
                ["entregaveis", pendingApprovals > 0 ? `Entregáveis (${pendingApprovals})` : "Entregáveis"],
                ["briefings", pendingBriefings > 0 ? `Briefings (${pendingBriefings})` : "Briefings"],
                ["pagamentos", pendingPayments > 0 ? `Pagamentos (${pendingPayments})` : "Pagamentos"],
                ["etapas", "Etapas"],
              ] as [TabId, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 rounded-full text-[14px] font-medium transition-colors ${
                    activeTab === key
                      ? "bg-primary-500 text-primary-900"
                      : "bg-primary-900 text-gray-200 border border-primary-700 hover:bg-primary-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">

              {activeTab === "visao_geral" && (
                <div className="flex flex-col gap-4">
                  {extractText(projeto.descricao) && (
                    <div>
                      <h3 className="text-[16px] font-semibold text-primary-100 mb-2">Sobre o projeto</h3>
                      <p className="text-[14px] text-gray-300 leading-relaxed">{extractText(projeto.descricao)}</p>
                    </div>
                  )}

                  {arquivos.length > 0 && (
                    <div>
                      <h3 className="text-[15px] font-semibold text-primary-100 mb-2 flex items-center gap-2"><FileText size={15} className="text-gray-400" /> Arquivos</h3>
                      <div className="flex flex-col gap-1.5">
                        {arquivos.map((a) => (
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-primary-900/60 hover:bg-primary-700 border border-primary-700 rounded-xl px-3 py-2.5 transition-colors group"
                          >
                            <FileText size={13} className="text-gray-500 flex-shrink-0" />
                            <span className="text-[13px] text-gray-200 flex-1 truncate">{a.nome}</span>
                            <ExternalLink size={11} className="text-gray-600 group-hover:text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {links.length > 0 && (
                    <div>
                      <h3 className="text-[15px] font-semibold text-primary-100 mb-2 flex items-center gap-2"><Link2 size={15} className="text-gray-400" /> Links</h3>
                      <div className="flex flex-col gap-1.5">
                        {links.map((l) => (
                          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-primary-900/60 hover:bg-primary-700 border border-primary-700 rounded-xl px-3 py-2.5 transition-colors group"
                          >
                            <Link2 size={13} className="text-gray-500 flex-shrink-0" />
                            <span className="text-[13px] text-gray-200 flex-1 truncate">{l.titulo || l.url}</span>
                            <ExternalLink size={11} className="text-gray-600 group-hover:text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {arquivos.length === 0 && links.length === 0 && !extractText(projeto.descricao) && (
                    <p className="text-gray-400 text-[14px]">Nenhuma informação adicional disponível.</p>
                  )}
                </div>
              )}

              {activeTab === "entregaveis" && (() => {
                const eCounts = {
                  aguardando: entregaveis.filter(e => e.status === "aguardando_aprovacao").length,
                  para_alteracao: entregaveis.filter(e => e.status === "para_alteracao").length,
                  aprovado: entregaveis.filter(e => e.status === "aprovado").length,
                };
                const eFiltered = entregaveis.filter(e => {
                  if (entregavelFilter === "aguardando") return e.status === "aguardando_aprovacao";
                  if (entregavelFilter === "para_alteracao") return e.status === "para_alteracao";
                  return e.status === "aprovado";
                });
                return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[18px] font-semibold text-primary-100">Entregáveis</h3>
                    <span className="text-[12px] text-gray-500">{entregaveis.length} no total</span>
                  </div>

                  {entregaveis.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {([
                        ["aguardando", "Aguardando", eCounts.aguardando],
                        ["para_alteracao", "Para alterar", eCounts.para_alteracao],
                        ["aprovado", "Aprovados", eCounts.aprovado],
                      ] as const).map(([key, label, count]) => (
                        <button
                          key={key}
                          onClick={() => setEntregavelFilter(key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors border ${
                            entregavelFilter === key
                              ? key === "aguardando" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300"
                                : key === "aprovado" ? "bg-third-400/15 border-third-400 text-third-300"
                                : "bg-primary-600/40 border-primary-500 text-primary-200"
                              : "bg-transparent border-primary-700 text-gray-500 hover:text-gray-300 hover:border-primary-600"
                          }`}
                        >
                          {label}
                          {count > 0 && <span className="text-[10px] font-bold bg-primary-700/60 text-gray-400 rounded-full px-1.5 leading-5">{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {entregaveis.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <Package size={28} className="text-gray-600" />
                      <p className="text-gray-500 text-[13px]">Nenhum entregável enviado ainda.</p>
                    </div>
                  ) : eFiltered.length === 0 ? (
                    <p className="text-gray-500 text-[13px] text-center py-6">Nenhum entregável neste filtro.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {eFiltered.map((e) => {
                        const isReviewing = reviewingEntregavel === e.id;
                        const showAnnotated = isReviewing && !!annotatedBlob;
                        const entFiles = getEntregavelFiles(e);
                        const firstImageFile = entFiles.find(f => f.tipo.startsWith("image/"));
                        return (
                        <div key={e.id} className="bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden">
                          {showAnnotated && firstImageFile ? (
                            <AnnotatedOrOriginalImage
                              originalUrl={firstImageFile.url}
                              annotatedBlob={annotatedBlob}
                              onAnnotate={() => { setAnnotatorUrl(firstImageFile.url); setAnnotatorEntregavelId(e.id); }}
                              onReAnnotate={() => { setAnnotatedBlob(null); setAnnotatedPins([]); setAnnotatorUrl(firstImageFile.url); setAnnotatorEntregavelId(e.id); }}
                              isAnnotated={true}
                              canAnnotate={false}
                            />
                          ) : entFiles.length > 0 ? (
                            <EntregavelCarouselPortal
                              files={entFiles}
                              canAnnotate={e.status === "aguardando_aprovacao" && !!firstImageFile}
                              onAnnotate={(url) => { setAnnotatorUrl(url); setAnnotatorEntregavelId(e.id); }}
                            />
                          ) : null}

                          <div className="p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-primary-100 leading-snug">{e.titulo}</p>
                                {e.descricao && <p className="text-[12px] text-gray-500 mt-0.5">{e.descricao}</p>}
                              </div>
                              <EntregavelBadge status={e.status} />
                            </div>

                            {e.url && (
                              <a href={e.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[12px] text-primary-400 hover:text-primary-300 transition-colors"
                              >
                                <ExternalLink size={11} /> Ver entregável
                              </a>
                            )}

                            {e.status === "para_alteracao" && e.feedback_cliente && (
                              <div className="bg-primary-800 border border-primary-700 rounded-xl px-3 py-2.5 text-[12px] text-gray-400">
                                <span className="text-gray-300 font-medium">Seu feedback: </span>{e.feedback_cliente}
                              </div>
                            )}

                            {e.status === "aprovado" && entFiles.length > 0 && (
                              <div className="flex items-center gap-2 pt-1 border-t border-primary-700">
                                {entFiles.length === 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(entFiles[0].url, entFiles[0].nome)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Baixar arquivo
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => downloadFile(entFiles[0].url, entFiles[0].nome)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-800 border border-primary-700 text-gray-300 hover:bg-primary-700 text-[12px] transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                      Baixar atual
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadAllAsZip(entFiles, e.titulo)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                      Baixar todos ({entFiles.length})
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {e.status === "aguardando_aprovacao" && (
                              isReviewing ? (
                                <div className="flex flex-col gap-2.5 pt-1 border-t border-primary-700">
                                  <textarea
                                    placeholder="Descreva o que precisa ser alterado..."
                                    value={feedbackText}
                                    onChange={(ev) => setFeedbackText(ev.target.value)}
                                    className="w-full bg-primary-800 border border-primary-700 rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500 transition-colors"
                                    rows={3}
                                  />
                                  <div className="flex gap-2">
                                    <button disabled={submittingReview} onClick={() => handleReview(e.id, "aprovado")}
                                      className="flex-1 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl py-2.5 text-[13px] transition-colors disabled:opacity-50"
                                    >Aprovar</button>
                                    <button disabled={submittingReview || !feedbackText.trim()} onClick={() => handleReview(e.id, "para_alteracao")}
                                      className="flex-1 bg-primary-900 hover:bg-primary-800 text-gray-300 border border-primary-700 rounded-xl py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                                    >Pedir alteração</button>
                                  </div>
                                  <button onClick={() => { setReviewingEntregavel(null); setFeedbackText(""); setAnnotatedBlob(null); setAnnotatedPins([]); }}
                                    className="text-gray-600 hover:text-gray-400 text-[12px] transition-colors text-center"
                                  >Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={() => setReviewingEntregavel(e.id)}
                                  className="w-full bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl py-2.5 text-[13px] transition-colors"
                                >Revisar entregável</button>
                              )
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                );
              })()}

              {activeTab === "briefings" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[18px] font-semibold text-primary-100">Briefings</h3>
                  {briefings.length === 0 ? (
                    <p className="text-gray-400 text-[14px]">Nenhum briefing enviado.</p>
                  ) : briefings.map((b) => {
                    const template = b.briefings_templates;
                    const campos = briefingCampos[template?.id] ?? [];
                    const isOpen = activeBriefing === b.id;
                    const isResponded = b.status === "respondido" || !!b.respondido_em;
                    return (
                      <div key={b.id} className="bg-primary-900/60 border border-primary-700 rounded-2xl overflow-hidden">
                        <button
                          onClick={() => openBriefing(b.id, template?.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-700/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ClipboardList size={14} className="text-gray-500 flex-shrink-0" />
                            <span className="text-[14px] text-gray-200 font-medium text-left">{template?.titulo ?? "Briefing"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isResponded
                              ? <span className="text-[12px] text-third-400 bg-third-400/10 px-2 py-0.5 rounded-full">Respondido</span>
                              : <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Pendente</span>
                            }
                            {isOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                          </div>
                        </button>

                        {isOpen && !isResponded && (
                          <div className="px-4 pb-4 border-t border-primary-700">
                            {campos.length === 0 ? (
                              <p className="text-[13px] text-gray-500 mt-3">Carregando perguntas...</p>
                            ) : (
                              <div className="flex flex-col gap-4 mt-4">
                                {campos.map((c) => (
                                  <div key={c.id}>
                                    <label className="text-[13px] text-gray-300 font-medium block mb-1">
                                      {c.titulo_pergunta}
                                      {c.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                                    </label>
                                    {c.descricao_pergunta && <p className="text-[12px] text-gray-500 mb-1">{c.descricao_pergunta}</p>}
                                    {c.tipo === "textarea" ? (
                                      <textarea rows={3} placeholder={c.placeholder ?? ""} value={briefingRespostas[c.id] ?? ""}
                                        onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                                        className="w-full bg-primary-800 border border-primary-700 rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500"
                                      />
                                    ) : c.tipo === "select" && c.opcoes ? (
                                      <select value={briefingRespostas[c.id] ?? ""}
                                        onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                                        className="w-full bg-primary-800 border border-primary-700 rounded-xl px-3 py-2 text-[13px] text-gray-200 focus:outline-none focus:border-primary-500"
                                      >
                                        <option value="">Selecione...</option>
                                        {c.opcoes.map((op) => <option key={op} value={op}>{op}</option>)}
                                      </select>
                                    ) : (
                                      <input type="text" placeholder={c.placeholder ?? ""} value={briefingRespostas[c.id] ?? ""}
                                        onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                                        className="w-full bg-primary-800 border border-primary-700 rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500"
                                      />
                                    )}
                                  </div>
                                ))}
                                <button disabled={submittingBriefing} onClick={() => handleSubmitBriefing(b)}
                                  className="w-full bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-xl py-2.5 text-[14px] transition-colors disabled:opacity-50"
                                >
                                  {submittingBriefing ? "Enviando..." : "Enviar respostas"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isOpen && isResponded && (
                          <div className="px-4 pb-4 border-t border-primary-700">
                            <p className="text-[13px] text-gray-500 mt-3">
                              Respondido em {b.respondido_em ? formatDate(b.respondido_em) : "—"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "pagamentos" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[18px] font-semibold text-primary-100">Pagamentos</h3>
                  {pagamentos.length === 0 ? (
                    <p className="text-gray-400 text-[14px]">Nenhum pagamento cadastrado.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {pagamentos.map((p) => (
                        <li key={p.id} className={`flex items-center justify-between bg-primary-900/60 border rounded-2xl px-4 py-3.5 ${p.status === "pendente" ? "border-yellow-500/20" : "border-primary-700"}`}>
                          <div>
                            <p className="text-[15px] text-gray-200 font-semibold">
                              {formatCurrency(p.valor)}
                              {p.total_parcelas && p.total_parcelas > 1 && (
                                <span className="text-gray-500 font-normal text-[12px] ml-1.5">parcela {p.parcela}/{p.total_parcelas}</span>
                              )}
                            </p>
                            {p.data_prevista && <p className="text-[12px] text-gray-500 mt-0.5">Vencimento: {formatDate(p.data_prevista)}</p>}
                          </div>
                          {p.status === "pendente"
                            ? <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">Pendente</span>
                            : <span className="text-[12px] text-third-400 bg-third-400/10 px-2.5 py-1 rounded-full">Pago</span>
                          }
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === "etapas" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-[18px] font-semibold text-primary-100">Etapas do projeto</h3>
                  {tasks.length === 0 ? (
                    <p className="text-gray-400 text-[14px]">Nenhuma etapa cadastrada.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {tasks.map((t) => {
                        const done = t.status === "concluida" || !!t.concluida;
                        return (
                          <li key={t.id} className="bg-primary-900/60 border border-primary-700 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${done ? "bg-third-500/20 border-third-500" : "border-primary-600"}`}>
                                {done && <CheckCircle2 size={10} className="text-third-400" />}
                              </div>
                              <span className={`text-[14px] flex-1 ${done ? "text-gray-500 line-through" : "text-gray-200"}`}>{t.titulo}</span>
                              {t.due_date && !done && <span className="text-[12px] text-gray-600 flex-shrink-0">{formatDate(t.due_date)}</span>}
                            </div>
                            {t.subtasks && t.subtasks.length > 0 && (
                              <div className="mt-2 ml-7 flex flex-col gap-1.5">
                                {t.subtasks.map((s) => (
                                  <div key={s.id} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${s.concluida ? "bg-third-500/20 border-third-500" : "border-primary-600"}`} />
                                    <span className={`text-[12px] ${s.concluida ? "text-gray-600 line-through" : "text-gray-400"}`}>{s.titulo}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

            </div>
          </section>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-500); border-radius: 9999px; border: 2px solid var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-400); }
      `}</style>

      {annotatorUrl && (() => {
        const ent = annotatorEntregavelId ? entregaveis.find(e => e.id === annotatorEntregavelId) : null;
        const allImageUrls = ent ? getEntregavelFiles(ent).filter(f => f.tipo.startsWith("image/")).map(f => f.url) : [annotatorUrl];
        return (
        <ImageAnnotatorModal
          imageUrl={annotatorUrl}
          imageUrls={allImageUrls.length > 1 ? allImageUrls : undefined}
          onClose={() => { setAnnotatorUrl(null); setAnnotatorEntregavelId(null); }}
          onConfirm={(_text, blob, pins, allResults) => {
            if (annotatorEntregavelId) {
              setReviewingEntregavel(annotatorEntregavelId);
              if (blob) setAnnotatedBlob(blob);
              setAnnotatedPins(pins);
              setAnnotatedResults(allResults && allResults.length > 1 ? allResults : null);
            }
            setAnnotatorUrl(null);
            setAnnotatorEntregavelId(null);
          }}
        />
        );
      })()}
    </div>
  );
}

function AnnotatedOrOriginalImage({ originalUrl, annotatedBlob, onAnnotate, onReAnnotate, isAnnotated, canAnnotate }: {
  originalUrl: string;
  annotatedBlob: Blob | null;
  onAnnotate: () => void;
  onReAnnotate: () => void;
  isAnnotated: boolean;
  canAnnotate?: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!annotatedBlob) { setBlobUrl(null); return; }
    const u = URL.createObjectURL(annotatedBlob);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [annotatedBlob]);

  const src = blobUrl ?? originalUrl;

  return (
    <div className="relative w-full group overflow-hidden bg-primary-900">
      <img src={src} alt="Entregável" className="w-full aspect-video object-cover transition-opacity group-hover:opacity-90" />
      {isAnnotated ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <span className="absolute bottom-2 left-3 text-[11px] text-white bg-primary-500/80 rounded-md px-2 py-0.5 pointer-events-none">Anotado</span>
          <button
            type="button"
            onClick={onReAnnotate}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-[11px] rounded-lg px-2.5 py-1 transition-colors z-10"
          >
            Re-anotar
          </button>
        </>
      ) : canAnnotate ? (
        <button
          type="button"
          onClick={onAnnotate}
          className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[12px] font-medium rounded-lg px-3 py-1.5">
            <Pencil size={12} /> Anotar
          </span>
        </button>
      ) : null}
    </div>
  );
}

function getEntregavelFiles(ent: { arquivo_url?: string | null; arquivo_tipo?: string | null; arquivos?: Array<{ url: string; tipo: string; nome: string }> | null; titulo?: string }): Array<{ url: string; tipo: string; nome: string }> {
  if (ent.arquivos && ent.arquivos.length > 0) return ent.arquivos;
  if (ent.arquivo_url) return [{ url: ent.arquivo_url, tipo: ent.arquivo_tipo || "", nome: ent.titulo || "arquivo" }];
  return [];
}

async function downloadFile(url: string, nome: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

async function downloadAllAsZip(files: Array<{ url: string; nome: string }>, zipName: string) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  await Promise.all(files.map(async (f, i) => {
    try {
      const res = await fetch(f.url);
      const blob = await res.blob();
      const ext = f.nome.includes(".") ? "" : ".png";
      zip.file(`${String(i + 1).padStart(2, "0")}-${f.nome}${ext}`, blob);
    } catch {}
  }));
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${zipName}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function EntregavelCarouselPortal({ files, onAnnotate, canAnnotate }: {
  files: Array<{ url: string; tipo: string; nome: string }>;
  onAnnotate?: (url: string) => void;
  canAnnotate?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const total = files.length;

  function goTo(newIdx: number) {
    setVisible(false);
    setTimeout(() => { setIdx(newIdx); setVisible(true); }, 120);
  }

  const current = files[idx];
  if (!current) return null;
  const isImage = current.tipo.startsWith("image/");

  return (
    <div className="relative w-full overflow-hidden bg-primary-900 group">
      <div className={`transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}>
        {isImage ? (
          <div className="relative">
            <img src={current.url} alt={current.nome} className="w-full aspect-video object-cover" />
            {canAnnotate && onAnnotate && (
              <button
                type="button"
                onClick={() => onAnnotate(current.url)}
                className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[12px] font-medium rounded-lg px-3 py-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Anotar
                </span>
              </button>
            )}
          </div>
        ) : (
          <a href={current.url} target="_blank" rel="noreferrer" className="flex items-center justify-center aspect-video bg-primary-800 hover:bg-primary-700 transition-colors">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span className="text-[12px] truncate max-w-[80%]">{current.nome}</span>
            </div>
          </a>
        )}
      </div>
      {total > 1 && (
        <>
          <button type="button" onClick={() => goTo((idx - 1 + total) % total)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" onClick={() => goTo((idx + 1) % total)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {files.map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[11px] text-white bg-black/50 rounded-md px-2 py-0.5 z-10">{idx + 1}/{total}</span>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "em_andamento": "text-primary-400 bg-primary-400/10 border-primary-400",
    "Em andamento": "text-primary-400 bg-primary-400/10 border-primary-400",
    "concluído": "text-third-400 bg-third-400/10 border-third-400",
    "Concluído": "text-third-400 bg-third-400/10 border-third-400",
    "finalizado": "text-third-400 bg-third-400/10 border-third-400",
  };
  const cls = map[status] ?? "text-primary-400 bg-primary-400/10 border-primary-700";
  return <span className={`text-[12px] px-2.5 py-1 rounded-full border inline-flex ${cls}`}>{status}</span>;
}

function EntregavelBadge({ status }: { status: string }) {
  if (status === "aprovado") return <span className="text-[12px] text-third-400 bg-third-400/10 border border-third-400 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">Aprovado</span>;
  if (status === "para_alteracao") return <span className="text-[12px] text-primary-200 bg-primary-600/30 border border-primary-500 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">Para alteração</span>;
  if (status === "aguardando_aprovacao") return <span className="text-[12px] text-yellow-400 bg-yellow-400/10 border border-yellow-400 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">Aguardando</span>;
  return <span className="text-[12px] text-primary-400 bg-primary-400/10 border border-primary-700 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">Rascunho</span>;
}

function extractText(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    try { return extractText(JSON.parse(value)); } catch { return value; }
  }
  if (typeof value === "object") {
    if (value.type === "text" && value.text) return value.text;
    if (Array.isArray(value.content)) {
      const parts = value.content.map(extractText).filter(Boolean);
      return parts.length ? parts.join(" ") : null;
    }
  }
  return null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
