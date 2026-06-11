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
  CheckCircle2, FileText, Link2, Package, ClipboardList,
  CreditCard, ChevronDown, ChevronUp, ExternalLink, Pencil, ArrowLeft, Copy,
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
type Pagamento = { id: string; valor: number; status: string; data_prevista: string | null; forma_pagamento: string; parcela: number | null; total_parcelas: number | null; pix_chave: string | null; notificado_em: string | null };
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
  const [briefingRespostas, setBriefingRespostas] = useState<Record<string, string | string[]>>({});
  const [submittingBriefing, setSubmittingBriefing] = useState(false);

  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState<string | null>(null);

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
    const respostas = campos.map((c) => {
      const val = briefingRespostas[c.id];
      const resposta = Array.isArray(val) ? val.join(", ") : (val ?? "");
      return { pergunta: c.titulo_pergunta ?? "", resposta };
    });
    setSubmittingBriefing(true);
    const { error } = await submitBriefingResposta(envio.id, id, respostas);
    setSubmittingBriefing(false);
    if (!error) {
      setBriefings((prev) => prev.map((b) => b.id === envio.id ? { ...b, status: "respondido", respondido_em: new Date().toISOString() } : b));
      setActiveBriefing(null);
      setBriefingRespostas({});
    }
  }

  async function marcarComoPago(pagamentoId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setMarkingPaidId(pagamentoId);
    try {
      const resp = await fetch("/api/payments/client-mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pagamento_id: pagamentoId }),
      });
      if (resp.ok) {
        setPagamentos((prev) => prev.map((p) => p.id === pagamentoId ? { ...p, status: "pago" } : p));
      }
    } finally {
      setMarkingPaidId(null);
    }
  }

  function copiarPix(chave: string, pagId: string) {
    navigator.clipboard.writeText(chave);
    setCopiedPix(pagId);
    setTimeout(() => setCopiedPix(null), 2000);
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

  function projetoStatusClass(s: string) {
    const v = String(s).toLowerCase();
    if (v === "concluído" || v === "concluido" || v === "finalizado") return "pcd-st pcd-st-success";
    return "pcd-st pcd-st-primary";
  }

  if (pageState === "loading") {
    return (
      <div style={{ height: "100vh", width: "100%", background: "var(--primary-900)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid var(--primary-500)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (pageState === "denied" || pageState === "error" || !projeto) {
    return (
      <div style={{ height: "100vh", width: "100%", background: "var(--primary-900)", color: "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--gray-400)", marginBottom: 16 }}>
            {pageState === "denied" ? "Você não tem acesso a este projeto." : "Erro ao carregar projeto."}
          </p>
          <button onClick={() => router.push("/portal/dashboard")} style={{ color: "var(--primary-400)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  function renderOverview() {
    const desc = extractText(projeto!.descricao);
    const hasContent = desc || arquivos.length > 0 || links.length > 0;
    return (
      <div className="pcd-panel">
        {!hasContent && (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><Package size={22} /></span>
            <p>Nenhuma informação adicional disponível.</p>
          </div>
        )}
        {desc && (
          <div className="pcd-overview-section">
            <h3 className="pcd-overview-section-title">Sobre o projeto</h3>
            <p className="pcd-overview-text">{desc}</p>
          </div>
        )}
        {arquivos.length > 0 && (
          <div className="pcd-overview-section">
            <h3 className="pcd-overview-section-title"><FileText size={15} /> Arquivos</h3>
            {arquivos.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="pcd-file-link">
                <span className="pcd-file-icon"><FileText size={18} /></span>
                <span className="pcd-file-name">{a.nome}</span>
                <ExternalLink size={14} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}
        {links.length > 0 && (
          <div className="pcd-overview-section">
            <h3 className="pcd-overview-section-title"><Link2 size={15} /> Links</h3>
            {links.map((l) => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="pcd-file-link">
                <span className="pcd-file-icon"><Link2 size={18} /></span>
                <span className="pcd-file-name">{l.titulo || l.url}</span>
                <ExternalLink size={14} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderEntregaveis() {
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
      <div className="pcd-panel">
        <div className="pcd-panel-head">
          <h3 className="pcd-panel-title">Entregáveis</h3>
          <span className="pcd-panel-meta">{entregaveis.length} no total</span>
        </div>

        {entregaveis.length > 0 && (
          <div className="pcd-deli-filters">
            {([
              ["aguardando", "Aguardando", eCounts.aguardando],
              ["para_alteracao", "Para alterar", eCounts.para_alteracao],
              ["aprovado", "Aprovados", eCounts.aprovado],
            ] as const).map(([key, label, count]) => (
              <button key={key} type="button"
                className={"pcd-deli-filter" + (entregavelFilter === key ? " is-on" : "")}
                onClick={() => setEntregavelFilter(key)}
              >
                {label}
                {count > 0 && <span className="pcd-deli-count">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {entregaveis.length === 0 ? (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><Package size={22} /></span>
            <p>Nenhum entregável enviado ainda.</p>
          </div>
        ) : eFiltered.length === 0 ? (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><Package size={22} /></span>
            <p>Nenhum entregável neste filtro.</p>
          </div>
        ) : (
          <div className="pcd-deli-grid">
            {eFiltered.map((e) => {
              const isReviewing = reviewingEntregavel === e.id;
              const showAnnotated = isReviewing && !!annotatedBlob;
              const entFiles = getEntregavelFiles(e);
              const firstImageFile = entFiles.find(f => f.tipo.startsWith("image/"));

              return (
                <article key={e.id} className="pcd-deli-card">
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
                  ) : (
                    <div className="pcd-deli-thumb-default">
                      <Package size={32} style={{ color: "color-mix(in srgb, var(--primary-100) 35%, transparent)" }} />
                    </div>
                  )}

                  <div className="pcd-deli-body">
                    <div className="pcd-deli-row">
                      <span className="pcd-deli-title">{e.titulo}</span>
                      <EntregavelBadge status={e.status} />
                    </div>
                    {e.descricao && <p className="pcd-deli-desc">{e.descricao}</p>}

                    {e.url && (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="pcd-deli-ext-link">
                        <ExternalLink size={12} /> Ver entregável
                      </a>
                    )}

                    {e.status === "para_alteracao" && e.feedback_cliente && (
                      <div className="pcd-deli-feedback">
                        <span style={{ color: "var(--gray-300)", fontWeight: 500 }}>Seu feedback: </span>
                        {e.feedback_cliente}
                      </div>
                    )}

                    {e.status === "aprovado" && entFiles.length > 0 && (
                      <div className="pcd-deli-btn-area">
                        {entFiles.length === 1 ? (
                          <button type="button" className="pcd-btn-primary full"
                            onClick={() => downloadFile(entFiles[0].url, entFiles[0].nome)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Baixar arquivo
                          </button>
                        ) : (
                          <div className="pcd-review-btns">
                            <button type="button" className="pcd-btn-ghost" style={{ flex: 1 }}
                              onClick={() => downloadFile(entFiles[0].url, entFiles[0].nome)}>
                              Baixar atual
                            </button>
                            <button type="button" className="pcd-btn-primary" style={{ flex: 1 }}
                              onClick={() => downloadAllAsZip(entFiles, e.titulo)}>
                              Baixar todos ({entFiles.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {e.status === "aguardando_aprovacao" && (
                      isReviewing ? (
                        <div className="pcd-deli-btn-area">
                          <textarea
                            placeholder="Descreva o que precisa ser alterado..."
                            value={feedbackText}
                            onChange={(ev) => setFeedbackText(ev.target.value)}
                            className="pcd-review-textarea"
                            rows={3}
                          />
                          <div className="pcd-review-btns">
                            <button type="button" disabled={submittingReview}
                              className="pcd-btn-primary" style={{ flex: 1 }}
                              onClick={() => handleReview(e.id, "aprovado")}>
                              Aprovar
                            </button>
                            <button type="button" disabled={submittingReview || !feedbackText.trim()}
                              className="pcd-btn-ghost" style={{ flex: 1 }}
                              onClick={() => handleReview(e.id, "para_alteracao")}>
                              Pedir alteração
                            </button>
                          </div>
                          <button type="button" className="pcd-cancel-link"
                            onClick={() => { setReviewingEntregavel(null); setFeedbackText(""); setAnnotatedBlob(null); setAnnotatedPins([]); }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="pcd-btn-primary full"
                          onClick={() => setReviewingEntregavel(e.id)}>
                          Revisar entregável
                        </button>
                      )
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderBriefings() {
    return (
      <div className="pcd-panel">
        <h3 className="pcd-panel-title" style={{ marginBottom: 22 }}>Briefings</h3>
        {briefings.length === 0 ? (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><ClipboardList size={22} /></span>
            <p>Nenhum briefing enviado.</p>
          </div>
        ) : briefings.map((b) => {
          const template = b.briefings_templates;
          const campos = briefingCampos[template?.id] ?? [];
          const isOpen = activeBriefing === b.id;
          const isResponded = b.status === "respondido" || !!b.respondido_em;
          return (
            <div key={b.id} className="pcd-brief">
              <button type="button" className="pcd-brief-head"
                onClick={() => openBriefing(b.id, template?.id)}>
                <span className="pcd-brief-title">
                  <span className="pcd-brief-title-icon"><ClipboardList size={19} /></span>
                  {template?.titulo ?? "Briefing"}
                </span>
                <span className="pcd-brief-right">
                  {isResponded
                    ? <span className="pcd-st pcd-st-success">Respondido</span>
                    : <span className="pcd-st pcd-st-alert">Pendente</span>
                  }
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {isOpen && !isResponded && (
                <div className="pcd-brief-body">
                  {campos.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--gray-500)", margin: 0 }}>Carregando perguntas...</p>
                  ) : campos.map((c) => {
                    const val = briefingRespostas[c.id];
                    return (
                      <div key={c.id} className="pcd-field">
                        <label className="pcd-field-label">
                          {c.titulo_pergunta}
                          {c.obrigatorio && <i className="pcd-field-req"> *</i>}
                        </label>
                        {c.descricao_pergunta && <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--gray-500)" }}>{c.descricao_pergunta}</p>}

                        {c.tipo === "long_text" && (
                          <textarea className="pcd-input pcd-textarea" rows={3}
                            placeholder={c.placeholder ?? "Sua resposta..."}
                            value={(val as string) ?? ""}
                            onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                          />
                        )}

                        {c.tipo === "short_text" && (
                          <input type="text" className="pcd-input"
                            placeholder={c.placeholder ?? "Sua resposta..."}
                            value={(val as string) ?? ""}
                            onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                          />
                        )}

                        {c.tipo === "multiple_choice" && Array.isArray(c.opcoes) && (
                          <div className="pcd-opts">
                            {c.opcoes.map((opcao) => (
                              <label key={opcao} className="pcd-opt pcd-opt-interactive">
                                <span className={`pcd-radio-btn${val === opcao ? " on" : ""}`}>
                                  {val === opcao && <span className="pcd-radio-dot" />}
                                </span>
                                <input type="radio" name={`campo-${c.id}`} value={opcao} checked={val === opcao}
                                  onChange={() => setBriefingRespostas((p) => ({ ...p, [c.id]: opcao }))}
                                  className="sr-only"
                                />
                                {opcao}
                              </label>
                            ))}
                          </div>
                        )}

                        {c.tipo === "checkboxes" && Array.isArray(c.opcoes) && (
                          <div className="pcd-opts">
                            {c.opcoes.map((opcao) => {
                              const checked = Array.isArray(val) && val.includes(opcao);
                              return (
                                <label key={opcao} className="pcd-opt pcd-opt-interactive">
                                  <span className={`pcd-checkbox-btn${checked ? " on" : ""}`}>
                                    {checked && (
                                      <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                        <path d="M1 4L4 7L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </span>
                                  <input type="checkbox" checked={checked}
                                    onChange={(ev) => {
                                      const prev = Array.isArray(val) ? val : [];
                                      const next = ev.target.checked ? [...prev, opcao] : prev.filter((o) => o !== opcao);
                                      setBriefingRespostas((p) => ({ ...p, [c.id]: next }));
                                    }}
                                    className="sr-only"
                                  />
                                  {opcao}
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {!["short_text", "long_text", "multiple_choice", "checkboxes"].includes(c.tipo) && (
                          <input type="text" className="pcd-input"
                            placeholder={c.placeholder ?? "Sua resposta..."}
                            value={(val as string) ?? ""}
                            onChange={(ev) => setBriefingRespostas((p) => ({ ...p, [c.id]: ev.target.value }))}
                          />
                        )}
                      </div>
                    );
                  })}
                  {campos.length > 0 && (
                    <div className="pcd-panel-foot">
                      <button type="button" disabled={submittingBriefing}
                        className="pcd-btn-primary"
                        onClick={() => handleSubmitBriefing(b)}>
                        {submittingBriefing ? "Enviando..." : "Enviar respostas"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isOpen && isResponded && (
                <div className="pcd-brief-body">
                  <p style={{ margin: 0, fontSize: 13, color: "var(--gray-500)" }}>
                    Respondido em {b.respondido_em ? formatDate(b.respondido_em) : "—"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderPagamentos() {
    return (
      <div className="pcd-panel">
        <h3 className="pcd-panel-title" style={{ marginBottom: 22 }}>Pagamentos</h3>
        {pagamentos.length === 0 ? (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><CreditCard size={22} /></span>
            <p>Nenhum pagamento cadastrado.</p>
          </div>
        ) : pagamentos.map((p) => {
          const isPending = p.status === "pendente";
          const isMarking = markingPaidId === p.id;
          return (
            <div key={p.id} className={"pcd-pay-item" + (isPending && p.notificado_em ? " notified" : "")}>
              {/* Header row */}
              <div className="pcd-pay-header">
                <span className="pcd-pay-icon"><CreditCard size={22} /></span>
                <div className="pcd-pay-txt">
                  <span className="pcd-pay-val">
                    {formatCurrency(p.valor)}
                    {p.total_parcelas && p.total_parcelas > 1 && (
                      <span style={{ fontSize: 13, fontWeight: 400, color: "var(--gray-500)", marginLeft: 8 }}>
                        parcela {p.parcela}/{p.total_parcelas}
                      </span>
                    )}
                  </span>
                  {p.data_prevista && <span className="pcd-pay-due">Vencimento: {formatDate(p.data_prevista)}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {isPending && p.notificado_em && (
                    <span className="pcd-pay-notif">Cobrança enviada</span>
                  )}
                  {isPending
                    ? <span className="pcd-st pcd-st-alert">Pendente</span>
                    : <span className="pcd-st pcd-st-success">Pago</span>
                  }
                </div>
              </div>

              {isPending && p.pix_chave && (
                <div className="pcd-pay-pix">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 11, color: "var(--gray-500)" }}>Chave PIX</p>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--primary-300)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.pix_chave}
                    </p>
                  </div>
                  <button type="button" className="pcd-pay-copy" onClick={() => copiarPix(p.pix_chave!, p.id)}>
                    {copiedPix === p.id ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    {copiedPix === p.id ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              )}

              {isPending && (
                <button type="button" disabled={isMarking} className="pcd-pay-confirm"
                  onClick={() => marcarComoPago(p.id)}>
                  <CheckCircle2 size={15} />
                  {isMarking ? "Confirmando..." : "Já efetuei o pagamento"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderEtapas() {
    return (
      <div className="pcd-panel">
        <div className="pcd-panel-head">
          <div>
            <h3 className="pcd-panel-title">Etapas do projeto</h3>
            {tasks.length > 0 && (
              <div className="pcd-steps-progress">
                <div className="pcd-steps-bar">
                  <span style={{ width: `${tasks.length > 0 ? (concluidas / tasks.length) * 100 : 0}%` }} />
                </div>
                <span>{concluidas}/{tasks.length} concluídas</span>
              </div>
            )}
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="pcd-empty">
            <span className="pcd-empty-icon"><Package size={22} /></span>
            <p>Nenhuma etapa cadastrada.</p>
          </div>
        ) : (
          <ul className="pcd-steps">
            {tasks.map((t) => {
              const done = t.status === "concluida" || !!t.concluida;
              return (
                <li key={t.id} className="pcd-step-group">
                  <div className={"pcd-step" + (done ? " is-done" : "")}>
                    <span className={"pcd-check" + (done ? " on" : "")}>
                      {done && <CheckCircle2 size={14} />}
                    </span>
                    <span className="pcd-step-title">{t.titulo}</span>
                    {t.due_date && !done && (
                      <span className="pcd-step-date">{formatDate(t.due_date)}</span>
                    )}
                  </div>
                  {t.subtasks && t.subtasks.length > 0 && (
                    <ul className="pcd-substeps">
                      {t.subtasks.map((s) => (
                        <li key={s.id} className="pcd-substep">
                          <span className={"pcd-check sm" + (s.concluida ? " on" : "")} />
                          <span className="pcd-substep-title">{s.titulo}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const TABS: { key: TabId; label: string }[] = [
    { key: "visao_geral", label: "Visão Geral" },
    { key: "entregaveis", label: pendingApprovals > 0 ? `Entregáveis (${pendingApprovals})` : "Entregáveis" },
    { key: "briefings", label: pendingBriefings > 0 ? `Briefings (${pendingBriefings})` : "Briefings" },
    { key: "pagamentos", label: pendingPayments > 0 ? `Pagamentos (${pendingPayments})` : "Pagamentos" },
    { key: "etapas", label: "Etapas" },
  ];

  return (
    <div className="pcd-root">
      <ClientSidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="pcd-main">
        <div className="pcd-glow pcd-glow-a" />
        <div className="pcd-glow pcd-glow-b" />

        <header className="pcd-topbar">
          <button type="button" className="pcd-back" onClick={() => router.push("/portal/dashboard")}>
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div className="pcd-topbar-right">
            <span className="pcd-email">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="pcd-scroll">
          <div className="pcd-inner">

            <section className="pcd-card pcd-hero">
              <div className="pcd-hero-head">
                <div className="pcd-hero-id">
                  <div className="pcd-cover">
                    {projeto.cover_url
                      ? <img src={projeto.cover_url} alt={projeto.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span>{projeto.titulo.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="pcd-hero-txt">
                    <div className="pcd-hero-titlerow">
                      <h1 className="pcd-name">{projeto.titulo}</h1>
                      <span className={projetoStatusClass(projeto.status)}>{projeto.status}</span>
                    </div>
                    <p className="pcd-hero-sub">Acompanhe o andamento do seu projeto e responda ao que for solicitado.</p>
                  </div>
                </div>
              </div>

              <div className="pcd-progress">
                <div className="pcd-progress-bar">
                  <span style={{ width: `${progresso > 0 ? Math.max(progresso, 2) : 0}%` }} />
                </div>
                <span className="pcd-progress-label">{progresso}% concluído</span>
              </div>

              <div className="pcd-meta">
                <div className="pcd-meta-cell">
                  <span className="pcd-meta-label">Status</span>
                  <span className="pcd-meta-value" style={{ fontSize: 16 }}>{projeto.status}</span>
                </div>
                <div className="pcd-meta-cell">
                  <span className="pcd-meta-label">Progresso</span>
                  <span className="pcd-meta-value">{progresso}%</span>
                  {tasks.length > 0 && <span className="pcd-meta-sub">{concluidas}/{tasks.length} tarefas</span>}
                </div>
                <div className="pcd-meta-cell">
                  <span className="pcd-meta-label">Entrega</span>
                  <span className="pcd-meta-value" style={{ fontSize: 16 }}>{projeto.prazo_entrega ? formatDate(projeto.prazo_entrega) : "—"}</span>
                </div>
                <div className="pcd-meta-cell">
                  <span className="pcd-meta-label">Início</span>
                  <span className="pcd-meta-value" style={{ fontSize: 16 }}>{projeto.data_inicio ? formatDate(projeto.data_inicio) : "—"}</span>
                </div>
              </div>
            </section>

            <section className="pcd-card pcd-tabs-card">
              <nav className="pcd-tabs">
                {TABS.map((t) => (
                  <button key={t.key} type="button"
                    className={"pcd-tab" + (activeTab === t.key ? " is-on" : "")}
                    onClick={() => setActiveTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </nav>

              {activeTab === "visao_geral" && renderOverview()}
              {activeTab === "entregaveis" && renderEntregaveis()}
              {activeTab === "briefings" && renderBriefings()}
              {activeTab === "pagamentos" && renderPagamentos()}
              {activeTab === "etapas" && renderEtapas()}
            </section>

          </div>
        </div>
      </div>

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

      <style jsx global>{`
        /* ====== Portal Cliente — Detalhes do Projeto ====== */

        .pcd-root {
          height: 100vh; width: 100%; display: flex; overflow: hidden;
          background: var(--primary-900); color: var(--gray-100);
          -webkit-font-smoothing: antialiased;
        }

        /* Main content (right of sidebar) */
        .pcd-main {
          position: relative; flex: 1; min-width: 0;
          display: flex; flex-direction: column;
          overflow: hidden;
        }

        /* Background glows */
        .pcd-glow { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; z-index: 0; }
        .pcd-glow-a {
          width: 560px; height: 560px; left: -200px; top: -180px;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary-500) 12%, transparent), transparent 70%);
        }
        .pcd-glow-b {
          width: 480px; height: 480px; right: -180px; top: 360px;
          background: radial-gradient(circle, rgba(16,66,83,0.5), transparent 70%);
        }

        /* Top bar */
        .pcd-topbar {
          position: relative; z-index: 2; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 26px 44px;
        }
        .pcd-back {
          display: flex; align-items: center; gap: 11px;
          font-family: inherit; font-size: 16px; font-weight: 500;
          color: var(--gray-100); cursor: pointer;
          padding: 12px 20px; border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 40%, transparent);
          transition: .2s;
        }
        .pcd-back:hover { border-color: var(--gray-500); }
        .pcd-topbar-right { display: flex; align-items: center; gap: 14px; }
        .pcd-email { font-size: 14px; color: var(--gray-400); }

        /* Scrollable area */
        .pcd-scroll {
          position: relative; z-index: 1; flex: 1; min-height: 0;
          overflow-y: auto; overflow-x: hidden;
        }
        .pcd-scroll::-webkit-scrollbar { width: 5px; }
        .pcd-scroll::-webkit-scrollbar-track { background: transparent; }
        .pcd-scroll::-webkit-scrollbar-thumb { background: var(--gray-700); border-radius: 9999px; }
        .pcd-scroll::-webkit-scrollbar-thumb:hover { background: var(--gray-600); }

        .pcd-inner {
          padding: 0 44px 44px;
          display: flex; flex-direction: column; gap: 22px;
        }

        /* Card */
        .pcd-card {
          border-radius: 22px;
          border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 45%, transparent),
            color-mix(in srgb, var(--primary-800) 26%, transparent)
          );
        }

        /* Hero */
        .pcd-hero { padding: 30px 34px; }
        .pcd-hero-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
        .pcd-hero-id { display: flex; align-items: center; gap: 22px; min-width: 0; flex: 1; }
        .pcd-cover {
          flex: none; width: 92px; height: 92px; border-radius: 20px;
          display: grid; place-items: center; overflow: hidden;
          background: radial-gradient(130% 130% at 28% 18%, var(--primary-700), var(--primary-900));
          border: 1px solid color-mix(in srgb, var(--gray-100) 6%, transparent);
        }
        .pcd-cover span { font-size: 40px; font-weight: 700; color: var(--primary-100); }
        .pcd-hero-txt { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .pcd-hero-titlerow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .pcd-name { margin: 0; font-size: 32px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
        .pcd-hero-sub { margin: 0; font-size: 14px; color: var(--gray-400); }

        /* Progress */
        .pcd-progress { display: flex; align-items: center; gap: 16px; margin: 26px 0 6px; }
        .pcd-progress-bar {
          flex: 1; height: 8px; border-radius: 999px; overflow: hidden;
          background: color-mix(in srgb, var(--gray-300) 12%, transparent);
        }
        .pcd-progress-bar span {
          display: block; height: 100%; min-width: 8px; border-radius: 999px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 0 12px -1px var(--primary-500);
        }
        .pcd-progress-label { font-size: 14px; font-weight: 600; color: var(--gray-300); flex: none; }

        /* Meta grid */
        .pcd-meta {
          margin-top: 22px; display: grid; grid-template-columns: repeat(4, 1fr);
          border: 1px solid var(--gray-700); border-radius: 16px; overflow: hidden;
          background: color-mix(in srgb, var(--primary-800) 30%, transparent);
        }
        .pcd-meta-cell {
          padding: 20px 24px; display: flex; flex-direction: column; gap: 9px;
          border-left: 1px solid var(--gray-700);
        }
        .pcd-meta-cell:first-child { border-left: 0; }
        .pcd-meta-label { font-size: 13px; color: var(--gray-400); }
        .pcd-meta-value { font-size: 20px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.01em; }
        .pcd-meta-sub { font-size: 12px; color: var(--gray-500); }

        /* Status pills */
        .pcd-st {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13.5px; font-weight: 600; padding: 7px 14px;
          border-radius: 999px; white-space: nowrap;
        }
        .pcd-st::before {
          content: ""; width: 7px; height: 7px; border-radius: 50%;
          background: currentColor; box-shadow: 0 0 8px currentColor; flex-shrink: 0;
        }
        .pcd-st-primary {
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 35%, transparent);
        }
        .pcd-st-alert  { color: var(--alert-medium);   background: rgba(255,167,38,0.10);  border: 1px solid rgba(255,167,38,0.35); }
        .pcd-st-error  { color: var(--error-medium);   background: rgba(239,83,80,0.10);   border: 1px solid rgba(239,83,80,0.35); }
        .pcd-st-success{ color: var(--success-medium); background: rgba(102,187,106,0.10); border: 1px solid rgba(102,187,106,0.35); }
        .pcd-st-neutral{
          color: var(--gray-300);
          background: color-mix(in srgb, var(--gray-300) 7%, transparent);
          border: 1px solid var(--gray-600);
        }

        /* Tabs card */
        .pcd-tabs-card { padding: 8px 30px 30px; }
        .pcd-tabs {
          display: flex; gap: 4px;
          border-bottom: 1px solid var(--gray-700);
          padding-top: 14px; flex-wrap: wrap;
        }
        .pcd-tab {
          position: relative; font-family: inherit; font-size: 15.5px; font-weight: 500;
          color: var(--gray-400); cursor: pointer; padding: 14px 18px;
          border: 0; background: none; transition: color .2s; white-space: nowrap;
        }
        .pcd-tab:hover { color: var(--gray-100); }
        .pcd-tab.is-on { color: var(--primary-300); }
        .pcd-tab.is-on::after {
          content: ""; position: absolute; left: 14px; right: 14px; bottom: -1px;
          height: 2.5px; border-radius: 3px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 0 12px -1px var(--primary-500);
        }

        /* Panel */
        .pcd-panel { padding-top: 26px; min-height: 360px; }
        .pcd-panel-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 20px; margin-bottom: 22px;
        }
        .pcd-panel-title { margin: 0; font-size: 21px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.01em; }
        .pcd-panel-meta { font-size: 13px; color: var(--gray-500); padding-top: 6px; }
        .pcd-panel-foot { display: flex; justify-content: flex-end; margin-top: 22px; }

        /* Buttons */
        .pcd-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 9px;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; padding: 13px 22px;
          border: 0; border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8);
          transition: .2s; white-space: nowrap;
        }
        .pcd-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -10px rgba(30,182,232,0.9); }
        .pcd-btn-primary:disabled { opacity: .5; cursor: default; transform: none; }
        .pcd-btn-primary.full { width: 100%; }

        .pcd-btn-ghost {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-family: inherit; font-size: 14px; font-weight: 500;
          color: var(--gray-200); cursor: pointer; padding: 11px 18px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 40%, transparent);
          border-radius: 12px; transition: .2s; white-space: nowrap;
        }
        .pcd-btn-ghost:hover { border-color: var(--gray-500); color: var(--gray-100); }
        .pcd-btn-ghost:disabled { opacity: .5; cursor: default; }

        .pcd-cancel-link {
          display: block; text-align: center; width: 100%;
          font-family: inherit; font-size: 13px; color: var(--gray-500);
          background: none; border: none; cursor: pointer; padding: 4px;
          transition: color .15s;
        }
        .pcd-cancel-link:hover { color: var(--gray-300); }

        /* Empty state */
        .pcd-empty {
          margin-top: 8px; padding: 44px 20px;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          border: 1px dashed var(--gray-700); border-radius: 16px;
        }
        .pcd-empty-icon {
          display: grid; place-items: center; width: 52px; height: 52px;
          border-radius: 14px; color: var(--gray-400);
          background: color-mix(in srgb, var(--gray-300) 6%, transparent);
          border: 1px solid var(--gray-700);
        }
        .pcd-empty p { margin: 0; font-size: 15px; color: var(--gray-500); }

        /* Overview */
        .pcd-overview-section { margin-bottom: 28px; }
        .pcd-overview-section-title {
          font-size: 15px; font-weight: 600; color: var(--primary-100);
          margin: 0 0 14px; display: flex; align-items: center; gap: 8px;
        }
        .pcd-overview-text { font-size: 15px; color: var(--gray-300); line-height: 1.65; margin: 0; }
        .pcd-file-link {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          border-radius: 14px; border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 24%, transparent)
          );
          text-decoration: none; transition: .2s; margin-bottom: 10px;
        }
        .pcd-file-link:hover { border-color: var(--primary-600); }
        .pcd-file-icon {
          flex: none; display: grid; place-items: center; width: 44px; height: 44px;
          border-radius: 12px; color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 25%, transparent);
        }
        .pcd-file-name {
          font-size: 15px; font-weight: 600; color: var(--gray-100);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
        }

        /* Deliverables */
        .pcd-deli-filters { display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap; }
        .pcd-deli-filter {
          display: inline-flex; align-items: center; gap: 9px;
          font-family: inherit; font-size: 14px; font-weight: 500;
          color: var(--gray-300); cursor: pointer; padding: 9px 16px; border-radius: 999px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 35%, transparent);
          transition: .2s;
        }
        .pcd-deli-filter:hover { border-color: var(--gray-500); color: var(--gray-100); }
        .pcd-deli-filter.is-on {
          color: var(--primary-300); border-color: var(--primary-500);
          background: color-mix(in srgb, var(--primary-500) 8%, transparent);
        }
        .pcd-deli-count {
          display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px;
          border-radius: 7px; font-size: 12px; font-weight: 600;
          background: color-mix(in srgb, var(--gray-300) 10%, transparent); color: var(--gray-300);
        }
        .pcd-deli-filter.is-on .pcd-deli-count {
          background: color-mix(in srgb, var(--primary-500) 15%, transparent); color: var(--primary-200);
        }

        .pcd-deli-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }

        .pcd-deli-card {
          border-radius: 18px; border: 1px solid var(--gray-700); overflow: hidden;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 45%, transparent),
            color-mix(in srgb, var(--primary-800) 26%, transparent)
          );
          transition: .2s;
        }
        .pcd-deli-card:hover { border-color: var(--primary-600); transform: translateY(-3px); box-shadow: 0 20px 44px -24px rgba(0,0,0,0.6); }

        .pcd-deli-thumb-default {
          width: 100%; height: 160px;
          display: grid; place-items: center;
          background: radial-gradient(130% 130% at 30% 20%, var(--primary-700), var(--primary-900));
        }

        .pcd-deli-body { display: flex; flex-direction: column; gap: 14px; padding: 18px 20px 20px; }
        .pcd-deli-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .pcd-deli-title { font-size: 16px; font-weight: 600; color: var(--gray-100); }
        .pcd-deli-desc { font-size: 13px; color: var(--gray-500); margin: 0; }
        .pcd-deli-ext-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--primary-400); text-decoration: none; transition: .15s;
        }
        .pcd-deli-ext-link:hover { color: var(--primary-300); }
        .pcd-deli-feedback {
          background: color-mix(in srgb, var(--primary-800) 60%, transparent);
          border: 1px solid var(--gray-700); border-radius: 12px;
          padding: 12px 14px; font-size: 13px; color: var(--gray-400);
        }
        .pcd-deli-btn-area {
          display: flex; flex-direction: column; gap: 10px;
          padding-top: 12px; border-top: 1px solid var(--gray-700);
        }
        .pcd-review-textarea {
          width: 100%; border-radius: 12px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 60%, transparent);
          padding: 12px 14px; font-family: inherit; font-size: 13px;
          color: var(--gray-200); resize: none; transition: .2s;
        }
        .pcd-review-textarea::placeholder { color: var(--gray-600); }
        .pcd-review-textarea:focus { outline: none; border-color: var(--primary-500); }
        .pcd-review-btns { display: flex; gap: 10px; }

        /* Briefings */
        .pcd-brief {
          border: 1px solid var(--gray-700); border-radius: 16px; overflow: hidden;
          background: color-mix(in srgb, var(--primary-800) 30%, transparent);
          margin-bottom: 12px;
        }
        .pcd-brief-head {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 20px 24px; cursor: pointer;
          background: none; border: 0; font-family: inherit;
          transition: background .15s;
        }
        .pcd-brief-head:hover { background: color-mix(in srgb, var(--primary-700) 30%, transparent); }
        .pcd-brief-title {
          display: inline-flex; align-items: center; gap: 12px;
          font-size: 16px; font-weight: 600; color: var(--gray-100);
        }
        .pcd-brief-title-icon { color: var(--primary-400); display: flex; }
        .pcd-brief-right { display: inline-flex; align-items: center; gap: 14px; color: var(--gray-400); }
        .pcd-brief-body {
          display: flex; flex-direction: column; gap: 22px;
          padding: 24px; border-top: 1px solid var(--gray-700);
        }
        .pcd-field { display: flex; flex-direction: column; gap: 10px; }
        .pcd-field-label { font-size: 15px; font-weight: 500; color: var(--gray-200); }
        .pcd-field-req { color: var(--error-medium); font-style: normal; }
        .pcd-input {
          height: 54px; padding: 0 16px; border-radius: 12px;
          border: 1px solid var(--gray-700); background: var(--primary-900);
          color: var(--gray-100); font-family: inherit; font-size: 15px;
          transition: .16s; outline: none; width: 100%;
        }
        .pcd-input:hover { border-color: var(--gray-600); }
        .pcd-input:focus { border-color: var(--primary-500); }
        .pcd-textarea { height: 96px; padding: 14px 16px; resize: none; }
        .pcd-select {
          height: 54px; padding: 0 16px; border-radius: 12px;
          border: 1px solid var(--gray-700); background: var(--primary-900);
          color: var(--gray-100); font-family: inherit; font-size: 15px;
          transition: .16s; outline: none; width: 100%; appearance: none;
        }
        .pcd-select:focus { border-color: var(--primary-500); }
        .pcd-opts { display: flex; flex-direction: column; gap: 10px; }
        .pcd-opt { display: flex; align-items: center; gap: 12px; font-size: 15px; color: var(--gray-200); }
        .pcd-opt-interactive { cursor: pointer; user-select: none; }
        .pcd-opt-interactive:hover { color: var(--gray-100); }
        .pcd-radio { width: 20px; height: 20px; flex: none; border-radius: 50%; border: 2px solid var(--gray-500); }
        .pcd-checkbox { width: 20px; height: 20px; flex: none; border-radius: 6px; border: 2px solid var(--gray-500); }
        .pcd-radio-btn {
          flex: none; display: grid; place-items: center;
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid var(--gray-500); transition: border-color .15s;
        }
        .pcd-radio-btn.on { border-color: var(--primary-500); background: color-mix(in srgb, var(--primary-500) 12%, transparent); }
        .pcd-radio-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary-400); }
        .pcd-checkbox-btn {
          flex: none; display: grid; place-items: center;
          width: 20px; height: 20px; border-radius: 6px;
          border: 2px solid var(--gray-500); transition: .15s; color: var(--primary-900);
        }
        .pcd-checkbox-btn.on { border-color: var(--primary-500); background: var(--primary-400); }

        /* Payments */
        .pcd-pay-item {
          display: flex; flex-direction: column; gap: 0;
          border-radius: 16px; border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 34%, transparent);
          margin-bottom: 12px; overflow: hidden;
        }
        .pcd-pay-header {
          display: flex; align-items: center; gap: 18px; padding: 22px 24px;
        }
        .pcd-pay-icon {
          display: grid; place-items: center; width: 50px; height: 50px; flex: none;
          border-radius: 13px; color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 24%, transparent);
        }
        .pcd-pay-txt { display: flex; flex-direction: column; gap: 5px; flex: 1; }
        .pcd-pay-val { font-size: 21px; font-weight: 700; color: var(--gray-100); }
        .pcd-pay-due { font-size: 14px; color: var(--gray-400); }
        .pcd-pay-notif {
          font-size: 12px; padding: 3px 10px; border-radius: 99px;
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 28%, transparent);
        }
        .pcd-pay-pix {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 24px; border-top: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-900) 40%, transparent);
        }
        .pcd-pay-copy {
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
          padding: 7px 14px; border-radius: 9px; font-size: 13px; font-weight: 500;
          color: var(--primary-300); cursor: pointer;
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 24%, transparent);
          transition: .16s;
        }
        .pcd-pay-copy:hover { background: color-mix(in srgb, var(--primary-500) 18%, transparent); }
        .pcd-pay-confirm {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 16px 24px; border-top: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-500) 8%, transparent);
          color: var(--primary-300); font-size: 15px; font-weight: 600; cursor: pointer;
          transition: .18s; border-radius: 0; border-left: none; border-right: none; border-bottom: none;
        }
        .pcd-pay-confirm:hover:not(:disabled) {
          background: color-mix(in srgb, var(--primary-500) 16%, transparent);
          color: var(--primary-200);
        }
        .pcd-pay-confirm:disabled { opacity: .55; cursor: not-allowed; }

        /* Steps */
        .pcd-steps-progress { display: flex; align-items: center; gap: 14px; margin-top: 12px; }
        .pcd-steps-bar {
          width: 200px; height: 7px; border-radius: 999px; overflow: hidden;
          background: color-mix(in srgb, var(--gray-300) 12%, transparent);
        }
        .pcd-steps-bar span {
          display: block; height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 0 12px -1px var(--primary-500);
        }
        .pcd-steps-progress > span { font-size: 14px; color: var(--gray-400); }

        .pcd-steps { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .pcd-step-group { display: flex; flex-direction: column; }
        .pcd-step {
          display: flex; align-items: center; gap: 16px; padding: 16px 18px;
          border-radius: 14px; border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 24%, transparent)
          );
          transition: .2s;
        }
        .pcd-step:hover { border-color: var(--primary-600); }
        .pcd-check {
          flex: none; display: grid; place-items: center; width: 30px; height: 30px;
          border-radius: 9px; border: 1.5px solid var(--gray-500);
          color: var(--primary-900); transition: .2s;
        }
        .pcd-check.sm { width: 24px; height: 24px; border-radius: 7px; }
        .pcd-check.on {
          border-color: var(--primary-500); background: var(--primary-400);
          box-shadow: 0 0 14px -3px var(--primary-500);
        }
        .pcd-step-title { flex: 1; font-size: 16px; font-weight: 600; color: var(--gray-100); }
        .pcd-step.is-done .pcd-step-title { color: var(--gray-500); text-decoration: line-through; }
        .pcd-step-date { flex: none; font-size: 13px; color: var(--gray-500); }

        .pcd-substeps {
          list-style: none; margin: 4px 0 4px; padding: 0 0 0 30px;
          display: flex; flex-direction: column;
        }
        .pcd-substep {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px; transition: background .15s;
        }
        .pcd-substep:hover { background: color-mix(in srgb, var(--gray-300) 4%, transparent); }
        .pcd-substep-title { font-size: 14.5px; color: var(--gray-300); }

        /* Responsive */
        @media (max-width: 900px) {
          .pcd-inner { padding: 0 20px 32px; }
          .pcd-topbar { padding: 20px 20px; }
          .pcd-meta { grid-template-columns: repeat(2, 1fr); }
          .pcd-meta-cell { border-left: 0; border-top: 1px solid var(--gray-700); }
          .pcd-meta-cell:nth-child(1), .pcd-meta-cell:nth-child(2) { border-top: 0; }
          .pcd-deli-grid { grid-template-columns: 1fr; }
          .pcd-name { font-size: 24px; }
        }
      `}</style>
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
          <button type="button" onClick={onReAnnotate}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-[11px] rounded-lg px-2.5 py-1 transition-colors z-10">
            Re-anotar
          </button>
        </>
      ) : canAnnotate ? (
        <button type="button" onClick={onAnnotate}
          className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <button type="button" onClick={() => onAnnotate(current.url)}
                className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[12px] font-medium rounded-lg px-3 py-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Anotar
                </span>
              </button>
            )}
          </div>
        ) : (
          <a href={current.url} target="_blank" rel="noreferrer"
            className="flex items-center justify-center aspect-video bg-primary-800 hover:bg-primary-700 transition-colors">
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
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" onClick={() => goTo((idx + 1) % total)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {files.map((_, i) => (
              <button key={i} type="button" onClick={() => goTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[11px] text-white bg-black/50 rounded-md px-2 py-0.5 z-10">{idx + 1}/{total}</span>
        </>
      )}
    </div>
  );
}

function EntregavelBadge({ status }: { status: string }) {
  if (status === "aprovado") return <span className="pcd-st pcd-st-success">Aprovado</span>;
  if (status === "para_alteracao") return <span className="pcd-st pcd-st-error">Para alteração</span>;
  if (status === "aguardando_aprovacao") return <span className="pcd-st pcd-st-alert">Aguardando</span>;
  return <span className="pcd-st pcd-st-neutral">Rascunho</span>;
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
