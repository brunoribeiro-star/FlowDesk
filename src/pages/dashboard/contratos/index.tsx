"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HeaderProfile from "@/components/HeaderProfile";
import { supabase } from "@/lib/supabaseClient";
import {
  getContractTemplates,
  getContractTemplate,
  getContracts,
  addContract,
  deleteContractTemplate,
  deleteContract,
} from "@/lib/supabaseQueries/contracts";
import {
  Plus,
  ScrollText,
  FileText,
  Trash2,
  Edit3,
  FileDown,
  Clock,
  Search,
  Loader2,
  X,
  ArrowLeft,
  Eye,
  ChevronLeft,
} from "lucide-react";
import Toast, { ToastType } from "@/components/Toast";
import PageTour from "@/components/PageTour";
import type { Step } from "react-joyride";

const CONTRATOS_TOUR_STEPS: Step[] = [
  { target: "body", placement: "center", skipBeacon: true, title: "Bem-vindo aos Contratos!", content: "Aqui você cria modelos de contratos comerciais com variáveis dinâmicas. Preencha os dados e exporte um contrato personalizado em PDF." },
  { target: "#tour-add-btn", placement: "bottom", skipBeacon: true, title: "Criar modelo de contrato", content: "Clique aqui para criar seu primeiro modelo. Use variáveis como {{nome_cliente}}, {{valor}} e {{prazo}} para gerar contratos personalizados automaticamente." },
  { target: "body", placement: "center", skipBeacon: true, title: "Como funciona", content: "Você cria um modelo uma vez e depois gera quantos contratos quiser a partir dele. Preencha as variáveis para cada cliente e exporte em PDF com um clique." },
  { target: "body", placement: "center", skipBeacon: true, title: "Dica de proteção", content: "Envie o contrato assinado antes de iniciar qualquer projeto. Isso protege você e o cliente e evita mal-entendidos sobre escopo e pagamento." },
];

type Template = {
  id: string;
  titulo: string;
  variables: string[];
  created_at: string;
  updated_at: string;
};

type GeneratedContract = {
  id: string;
  titulo: string;
  content: string | null;
  created_at: string;
  template_id: string | null;
  contract_templates: { titulo: string } | null;
};

type Client = { id: string; nome: string; empresa: string | null; email: string | null; telefone: string | null };

type GenerateModal = {
  templateId: string;
  templateTitulo: string;
  content: string;
  fontFamily: string;
  varsData: Record<string, string>;
  titulo: string;
  clientId: string | null;
};

const DRAFT_KEY = "flowdesk_contract_draft";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function extractVariables(html: string): string[] {
  return [...new Set([...html.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1].trim()))];
}

function fillTemplate(html: string, data: Record<string, string>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] ?? `{{${key.trim()}}}`);
}

function buildPreviewHtml(content: string, fontFamily: string = "times"): string {
  const face = fontFamily === "arial" ? "'Arial', Helvetica, sans-serif" : "'Times New Roman', Times, serif";
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #111; }
  body { font-family: ${face}; font-size: 12pt; line-height: 1.85; padding: 72px 80px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 28px; text-transform: uppercase; letter-spacing: 0.04em; }
  h2 { font-size: 13pt; font-weight: 700; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
  h3 { font-size: 12pt; font-weight: 700; margin: 18px 0 6px; }
  p { margin-bottom: 12px; text-align: justify; }
  ul, ol { margin: 8px 0 12px 24px; } li { margin-bottom: 4px; }
  strong { font-weight: 700; } em { font-style: italic; } u { text-decoration: underline; }
  hr { border: none; border-top: 1px solid #aaa; margin: 28px 0; }
</style></head><body>${content}</body></html>`;
}

export default function ContratosPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [contracts, setContracts] = useState<GeneratedContract[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);

  const [searchTemplates, setSearchTemplates] = useState("");
  const [searchContracts, setSearchContracts] = useState("");
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);
  const [deletingContract, setDeletingContract] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [generateModal, setGenerateModal] = useState<GenerateModal | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [viewingContract, setViewingContract] = useState<GeneratedContract | null>(null);
  const [viewGenerating, setViewGenerating] = useState<"pdf" | "docx" | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [templatesRes, contractsRes, clientsRes] = await Promise.all([
        getContractTemplates(user.id),
        getContracts(user.id),
        supabase.from("clientes").select("id, nome, empresa, email, telefone").eq("user_id", user.id).order("nome"),
      ]);

      setTemplates((templatesRes.data ?? []) as Template[]);
      setContracts((contractsRes.data ?? []) as unknown as GeneratedContract[]);
      setClients((clientsRes.data ?? []) as Client[]);
      setLoadingTemplates(false);
      setLoadingContracts(false);
    })();
  }, []);

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Excluir este modelo de contrato?")) return;
    setDeletingTemplate(id);
    const { error } = await deleteContractTemplate(id);
    if (error) showToast("Erro ao excluir modelo.", "error");
    else {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast("Modelo excluído.", "success");
    }
    setDeletingTemplate(null);
  }

  async function handleDeleteContract(id: string) {
    if (!confirm("Excluir este contrato gerado?")) return;
    setDeletingContract(id);
    const { error } = await deleteContract(id);
    if (error) showToast("Erro ao excluir contrato.", "error");
    else {
      setContracts(prev => prev.filter(c => c.id !== id));
      showToast("Contrato excluído.", "success");
    }
    setDeletingContract(null);
  }

  async function openGenerateModal(t: Template, e: React.MouseEvent) {
    e.stopPropagation();
    setLoadingModal(true);
    const { data } = await getContractTemplate(t.id);
    setLoadingModal(false);
    if (!data) { showToast("Erro ao carregar modelo.", "error"); return; }
    const vars = extractVariables(data.content ?? "");
    const varsData: Record<string, string> = {};
    vars.forEach(v => { varsData[v] = ""; });
    setGenerateModal({
      templateId: t.id,
      templateTitulo: t.titulo,
      content: data.content ?? "",
      fontFamily: (data as any).font_family ?? "times",
      varsData,
      titulo: `Contrato — ${t.titulo}`,
      clientId: null,
    });
  }

  function applyClientFill(clientId: string) {
    if (!generateModal) return;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const fill: Record<string, string> = {
      nome_cliente: client.nome ?? "",
      nome: client.nome ?? "",
      empresa: client.empresa ?? "",
      email: client.email ?? "",
      email_cliente: client.email ?? "",
      telefone: client.telefone ?? "",
    };
    setGenerateModal(prev => {
      if (!prev) return prev;
      const next = { ...prev.varsData };
      Object.entries(fill).forEach(([k, v]) => { if (k in next) next[k] = v; });
      return { ...prev, varsData: next, clientId };
    });
  }

  async function handleGenerate(format: "pdf" | "docx") {
    if (!generateModal || !generateModal.titulo.trim()) {
      showToast("Dê um título ao contrato.", "error");
      return;
    }
    setGenerating(format);

    const { data: { user } } = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";

    const filledHtml = fillTemplate(generateModal.content, generateModal.varsData);

    await addContract({
      user_id: user!.id,
      template_id: generateModal.templateId,
      cliente_id: generateModal.clientId,
      titulo: generateModal.titulo.trim(),
      variables_data: generateModal.varsData,
      content: filledHtml,
    });

    const endpoint = format === "pdf" ? "/api/contracts/pdf" : "/api/contracts/docx";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: filledHtml, titulo: generateModal.titulo, fontFamily: generateModal.fontFamily }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${generateModal.titulo.toLowerCase().replace(/\s+/g, "-")}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} gerado com sucesso!`, "success");

      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data } = await getContracts(u.id);
        setContracts((data ?? []) as unknown as GeneratedContract[]);
      }
      setGenerateModal(null);
    } catch {
      showToast(`Erro ao gerar ${format.toUpperCase()}.`, "error");
    }
    setGenerating(null);
  }

  async function handleViewDownload(format: "pdf" | "docx", contract: GeneratedContract) {
    if (!contract.content) { showToast("Conteúdo do contrato não disponível.", "error"); return; }
    setViewGenerating(format);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";
    const endpoint = format === "pdf" ? "/api/contracts/pdf" : "/api/contracts/docx";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: contract.content, titulo: contract.titulo, fontFamily: "times" }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${contract.titulo.toLowerCase().replace(/\s+/g, "-")}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} baixado com sucesso!`, "success");
    } catch {
      showToast(`Erro ao baixar ${format.toUpperCase()}.`, "error");
    }
    setViewGenerating(null);
  }

  const filteredTemplates = templates.filter(t =>
    t.titulo.toLowerCase().includes(searchTemplates.toLowerCase())
  );

  const filteredContracts = contracts.filter(c =>
    c.titulo.toLowerCase().includes(searchContracts.toLowerCase())
  );

  return (
    <>
      <PageTour name="contratos" steps={CONTRATOS_TOUR_STEPS} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="cti-page">
        <div className="cti-glow cti-glow-a" />
        <div className="cti-glow cti-glow-b" />

        <div className="cti-scroll">

        <header className="cti-top">
          <div className="cti-top-l">
            <button
              type="button"
              className="cti-back"
              onClick={() => router.push("/dashboard")}
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="cti-page-title">Contratos</h1>
              <p className="cti-page-sub">Gerencie modelos e contratos gerados</p>
            </div>
          </div>
          <div className="cti-top-r">
            <button
              id="tour-add-btn"
              type="button"
              className="cti-primary-btn"
              onClick={() => router.push("/dashboard/contratos/novo")}
            >
              <Plus size={19} />
              Novo modelo
            </button>
            <HeaderProfile />
          </div>
        </header>

        <div className="cti-body">

          <section className="cti-block">
            <div className="cti-section-head">
              <h2 className="cti-section-title">Modelos de contrato</h2>
              {templates.length > 3 && (
                <div className="cti-search">
                  <Search size={14} className="cti-search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar modelos..."
                    value={searchTemplates}
                    onChange={e => setSearchTemplates(e.target.value)}
                    className="cti-search-input"
                  />
                </div>
              )}
            </div>

            {loadingTemplates ? (
              <div className="cti-loading">
                <div className="cti-spinner" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="cti-empty">
                <ScrollText size={36} className="cti-empty-icon" />
                <p className="cti-empty-title">Nenhum modelo criado ainda</p>
                <p className="cti-empty-sub">
                  Crie um modelo com variáveis dinâmicas como{" "}
                  <code className="cti-code">{"{{nome_cliente}}"}</code> e gere contratos personalizados.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/contratos/novo")}
                  className="cti-primary-btn"
                  style={{ marginTop: "8px" }}
                >
                  <Plus size={15} />
                  Criar primeiro modelo
                </button>
              </div>
            ) : (
              <div className="cti-model-grid">
                {filteredTemplates.map(t => (
                  <article
                    key={t.id}
                    className="cti-model"
                    onClick={() => router.push(`/dashboard/contratos/${t.id}`)}
                  >
                    <div className="cti-model-head">
                      <span className="cti-model-icon">
                        <ScrollText size={24} />
                      </span>
                      <div className="cti-model-actions">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/contratos/${t.id}`); }}
                          className="cti-icon-btn"
                          title="Editar modelo"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                          disabled={deletingTemplate === t.id}
                          className="cti-icon-btn cti-icon-btn-danger"
                          title="Excluir modelo"
                        >
                          {deletingTemplate === t.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>

                    <h3 className="cti-model-name">{t.titulo}</h3>

                    {t.variables?.length > 0 && (
                      <div className="cti-model-vars">
                        {t.variables.slice(0, 3).map(v => (
                          <span key={v} className="cti-var">{`{{${v}}}`}</span>
                        ))}
                        {t.variables.length > 3 && (
                          <span className="cti-var-more">+{t.variables.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="cti-model-foot">
                      <span className="cti-model-date">
                        <Clock size={15} />
                        {formatDate(t.updated_at || t.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={e => openGenerateModal(t, e)}
                        disabled={loadingModal}
                        className="cti-gen-btn"
                        title="Gerar contrato a partir deste modelo"
                      >
                        {loadingModal
                          ? <Loader2 size={15} className="animate-spin" />
                          : <FileDown size={17} />}
                        Gerar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="cti-block">
            <div className="cti-section-head">
              <h2 className="cti-section-title">Contratos gerados</h2>
              {contracts.length > 4 && (
                <div className="cti-search">
                  <Search size={14} className="cti-search-icon" />
                  <input
                    type="text"
                    placeholder="Buscar contratos..."
                    value={searchContracts}
                    onChange={e => setSearchContracts(e.target.value)}
                    className="cti-search-input"
                  />
                </div>
              )}
            </div>

            {loadingContracts ? (
              <div className="cti-loading">
                <div className="cti-spinner" />
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="cti-empty cti-empty-sm">
                <FileText size={30} className="cti-empty-icon" />
                <p className="cti-empty-title">Nenhum contrato gerado ainda</p>
                <p className="cti-empty-sub">
                  Abra um modelo e clique em "Gerar" para criar e baixar um contrato preenchido.
                </p>
              </div>
            ) : (
              <div className="cti-table">
                <div className="cti-th">
                  <span>Título</span>
                  <span>Modelo</span>
                  <span>Gerado em</span>
                </div>
                {filteredContracts.map(c => (
                  <div key={c.id} className="cti-row">
                    <div className="cti-row-title">
                      <span className="cti-row-icon">
                        <FileDown size={18} />
                      </span>
                      <span className="cti-row-title-txt">{c.titulo}</span>
                    </div>
                    <span className="cti-row-model">
                      {c.contract_templates?.titulo ?? "—"}
                    </span>
                    <div className="cti-row-last">
                      <span className="cti-row-date">{formatDate(c.created_at)}</span>
                      <div className="cti-row-actions">
                        <button
                          type="button"
                          onClick={() => setViewingContract(c)}
                          className="cti-icon-btn"
                          title="Ver contrato"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteContract(c.id)}
                          disabled={deletingContract === c.id}
                          className="cti-icon-btn cti-icon-btn-danger"
                          title="Excluir"
                        >
                          {deletingContract === c.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
        </div>
      </div>

      {viewingContract && (
        <div className="cti-overlay">
          <div className="cti-overlay-header">
            <button type="button" onClick={() => setViewingContract(null)} className="cti-overlay-back">
              <ArrowLeft size={18} />
              Voltar
            </button>
            <span className="cti-overlay-title">{viewingContract.titulo}</span>
            <div className="cti-overlay-actions">
              <button
                type="button"
                onClick={() => handleViewDownload("pdf", viewingContract)}
                disabled={!!viewGenerating}
                className="cti-overlay-primary"
              >
                {viewGenerating === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => handleViewDownload("docx", viewingContract)}
                disabled={!!viewGenerating}
                className="cti-overlay-ghost"
              >
                {viewGenerating === "docx" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Baixar DOCX
              </button>
            </div>
          </div>
          <div className="cti-overlay-canvas">
            <iframe
              srcDoc={buildPreviewHtml(viewingContract.content ?? "", "times")}
              title="Visualização do contrato"
              style={{ width: "794px", minHeight: "1122px", border: "none", background: "#fff", borderRadius: "4px", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)", flexShrink: 0 }}
            />
          </div>
        </div>
      )}

      {previewHtml && generateModal && (
        <div className="cti-overlay">
          <div className="cti-overlay-header">
            <button type="button" onClick={() => setPreviewHtml(null)} className="cti-overlay-back">
              <ArrowLeft size={18} />
              Voltar
            </button>
            <span className="cti-overlay-title">Pré-visualização</span>
            <span className="cti-overlay-sub">— o arquivo gerado será idêntico a esta visualização</span>
            <div className="cti-overlay-actions">
              <button
                type="button"
                onClick={() => {
                  const filled = fillTemplate(generateModal.content, generateModal.varsData);
                  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
                    content: filled,
                    titulo: generateModal.titulo,
                    fontFamily: generateModal.fontFamily,
                    templateIdRef: generateModal.templateId,
                    clientId: generateModal.clientId,
                    varsData: generateModal.varsData,
                  }));
                  router.push("/dashboard/contratos/gerar");
                }}
                className="cti-overlay-ghost"
              >
                Editar contrato
              </button>
              <button
                type="button"
                onClick={() => { setPreviewHtml(null); handleGenerate("pdf"); }}
                disabled={!!generating}
                className="cti-overlay-primary"
              >
                {generating === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => { setPreviewHtml(null); handleGenerate("docx"); }}
                disabled={!!generating}
                className="cti-overlay-ghost"
              >
                {generating === "docx" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Baixar DOCX
              </button>
            </div>
          </div>
          <div className="cti-overlay-canvas">
            <iframe
              srcDoc={previewHtml}
              title="Pré-visualização do contrato"
              style={{ width: "794px", minHeight: "1122px", border: "none", background: "#fff", borderRadius: "4px", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)", flexShrink: 0 }}
            />
          </div>
        </div>
      )}

      {generateModal && (
        <div className="cti-gm-backdrop" onClick={() => !generating && setGenerateModal(null)}>
          <div className="cti-gm-box" onClick={e => e.stopPropagation()}>

            <div className="cti-gm-header">
              <div>
                <h2 className="cti-gm-title">Gerar contrato</h2>
                <div className="cti-gm-subtitle">
                  Modelo:
                  <span className="cti-gm-model-tag">{generateModal.templateTitulo}</span>
                </div>
              </div>
              <button type="button" onClick={() => setGenerateModal(null)} className="cti-gm-close">
                <X size={17} />
              </button>
            </div>

            <div className="cti-gm-body">
              <div className="cti-gm-field">
                <label className="cti-gm-label">Título do contrato</label>
                <input
                  type="text"
                  value={generateModal.titulo}
                  onChange={e => setGenerateModal(prev => prev ? { ...prev, titulo: e.target.value } : prev)}
                  className="cti-gm-input"
                />
              </div>

              {clients.length > 0 && (
                <div className="cti-gm-field">
                  <label className="cti-gm-label">
                    Preencher a partir de um cliente
                    <span className="cti-gm-label-opt">(opcional)</span>
                  </label>
                  <select
                    value={generateModal.clientId ?? ""}
                    onChange={e => e.target.value ? applyClientFill(e.target.value) : setGenerateModal(prev => prev ? { ...prev, clientId: null } : prev)}
                    className="cti-gm-select"
                  >
                    <option value="">Selecionar cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}{c.empresa ? ` — ${c.empresa}` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              {Object.keys(generateModal.varsData).length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="cti-gm-divider">
                    <span className="cti-gm-divider-line" />
                    <span className="cti-gm-divider-text">Variáveis do contrato</span>
                    <span className="cti-gm-divider-line" />
                  </div>
                  {Object.entries(generateModal.varsData).map(([key, value]) => (
                    <div key={key} className="cti-gm-field">
                      <label className="cti-gm-var-label">{`{{${key}}}`}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setGenerateModal(prev => prev ? {
                          ...prev,
                          varsData: { ...prev.varsData, [key]: e.target.value },
                        } : prev)}
                        placeholder={`Valor de ${key}...`}
                        className="cti-gm-input"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cti-gm-empty">
                  <p className="text-[13px] text-gray-400">Nenhuma variável neste modelo.</p>
                  <p className="text-[12px] text-gray-500 mt-1">O contrato será gerado com o conteúdo fixo do modelo.</p>
                </div>
              )}
            </div>

            <div className="cti-gm-footer">
              <button
                type="button"
                onClick={() => {
                  if (!generateModal) return;
                  const filled = fillTemplate(generateModal.content, generateModal.varsData);
                  setPreviewHtml(buildPreviewHtml(filled, generateModal.fontFamily));
                }}
                className="cti-gm-preview-btn"
              >
                Pré-visualizar
              </button>
              <div className="cti-gm-row-btns">
                <button
                  type="button"
                  onClick={() => handleGenerate("pdf")}
                  disabled={!!generating}
                  className="cti-gm-pdf-btn"
                >
                  {generating === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate("docx")}
                  disabled={!!generating}
                  className="cti-gm-docx-btn"
                >
                  {generating === "docx" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  Baixar DOCX
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Page wrapper ── */
        .cti-page {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: radial-gradient(120% 80% at 50% -10%, var(--primary-800) 0%, var(--primary-900) 55%, var(--primary-900) 100%);
          -webkit-font-smoothing: antialiased;
        }

        /* ── Scroll container (inside page, clips glows correctly) ── */
        .cti-scroll {
          position: relative;
          z-index: 2;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 30px;
          padding: 30px 44px 40px;
        }
        .cti-scroll::-webkit-scrollbar { width: 8px; }
        .cti-scroll::-webkit-scrollbar-track { background: transparent; }
        .cti-scroll::-webkit-scrollbar-thumb {
          background: var(--primary-600);
          border-radius: 8px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }

        /* ── Glows ── */
        .cti-glow {
          position: absolute; border-radius: 50%; filter: blur(100px);
          pointer-events: none; z-index: 0;
        }
        .cti-glow-a {
          width: 520px; height: 520px; right: -180px; top: -180px;
          background: radial-gradient(circle, rgba(30,182,232,0.12), transparent 70%);
        }
        .cti-glow-b {
          width: 460px; height: 460px; right: -160px; bottom: -200px;
          background: radial-gradient(circle, rgba(16,66,83,0.5), transparent 70%);
        }

        /* ── Header ── */
        .cti-top {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
        }
        .cti-top-l { display: flex; align-items: flex-start; gap: 18px; }
        .cti-back {
          display: grid; place-items: center;
          width: 50px; height: 50px; border-radius: 14px; flex: none; margin-top: 4px;
          border: 1px solid var(--gray-700); background: var(--primary-800);
          color: var(--gray-200); cursor: pointer; transition: .2s;
        }
        .cti-back:hover { border-color: var(--primary-500); color: var(--primary-300); }
        .cti-page-title { margin: 0; font-size: 38px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
        .cti-page-sub { margin: 8px 0 0; font-size: 16.5px; color: var(--gray-400); }
        .cti-top-r { display: flex; align-items: center; gap: 14px; }

        /* ── Primary button ── */
        .cti-primary-btn {
          display: flex; align-items: center; gap: 9px;
          height: 50px; padding: 0 24px;
          font-family: inherit; font-size: 16px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border: 0; border-radius: 14px;
          white-space: nowrap;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8); transition: .2s;
        }
        .cti-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -10px rgba(30,182,232,0.9);
        }

        /* ── Body ── */
        .cti-body {
          display: flex; flex-direction: column; gap: 34px;
        }
        .cti-block { display: flex; flex-direction: column; }
        .cti-section-head {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          margin-bottom: 18px;
        }
        .cti-section-title {
          margin: 0; font-size: 23px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }

        /* ── Search ── */
        .cti-search { position: relative; }
        .cti-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: var(--gray-500); pointer-events: none;
        }
        .cti-search-input {
          background: var(--primary-800); border: 1px solid var(--gray-700);
          border-radius: 10px; padding: 8px 14px 8px 34px;
          font-size: 13px; color: var(--gray-100); outline: none;
          width: 220px; font-family: inherit; transition: .2s;
        }
        .cti-search-input::placeholder { color: var(--gray-500); }
        .cti-search-input:focus { border-color: var(--primary-500); }

        /* ── Loading ── */
        .cti-loading {
          display: flex; align-items: center; justify-content: center; padding: 64px 0;
        }
        .cti-spinner {
          width: 24px; height: 24px;
          border: 2px solid var(--primary-500); border-top-color: transparent;
          border-radius: 50%;
          animation: cti-spin .7s linear infinite;
        }
        @keyframes cti-spin { to { transform: rotate(360deg); } }

        /* ── Empty state ── */
        .cti-empty {
          border: 1px solid var(--gray-700); border-radius: 20px; padding: 52px 32px;
          display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
          background: linear-gradient(180deg, var(--primary-800), var(--primary-900));
        }
        .cti-empty-sm { padding: 40px 32px; }
        .cti-empty-icon { color: var(--primary-700); }
        .cti-empty-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--gray-300); }
        .cti-empty-sub { margin: 0; font-size: 13px; color: var(--gray-500); max-width: 420px; }
        .cti-code {
          font-size: 11px; color: var(--primary-400); background: var(--primary-700);
          padding: 2px 7px; border-radius: 5px;
        }

        /* ── Template card grid ── */
        .cti-model-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 400px));
          gap: 22px;
        }
        .cti-model {
          display: flex; flex-direction: column; padding: 26px;
          border-radius: 20px; border: 1px solid var(--gray-700); cursor: pointer; transition: .2s;
          background: linear-gradient(180deg, var(--primary-800), var(--primary-900));
        }
        .cti-model:hover {
          border-color: var(--primary-600);
          transform: translateY(-3px);
          box-shadow: 0 22px 48px -26px rgba(0,0,0,0.5);
        }

        /* ── Card head ── */
        .cti-model-head {
          display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px;
        }
        .cti-model-icon {
          display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;
          color: var(--primary-300);
          background: rgba(30,182,232,0.10); border: 1px solid rgba(30,182,232,0.28);
        }
        .cti-model-actions {
          display: flex; align-items: center; gap: 4px;
          opacity: 0; transition: opacity .2s;
        }
        .cti-model:hover .cti-model-actions { opacity: 1; }

        /* ── Card body ── */
        .cti-model-name {
          margin: 0 0 16px; font-size: 20px; font-weight: 700;
          color: var(--gray-100); letter-spacing: -0.01em;
        }
        .cti-model-vars { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .cti-var {
          font-size: 12px; color: var(--primary-300); padding: 5px 11px; border-radius: 9px;
          white-space: nowrap;
          background: rgba(30,182,232,0.08); border: 1px solid rgba(30,182,232,0.22);
        }
        .cti-var-more { font-size: 13px; color: var(--gray-500); font-weight: 600; }

        /* ── Card footer ── */
        .cti-model-foot {
          display: flex; align-items: center; justify-content: space-between; gap: 14px;
          margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--gray-700);
        }
        .cti-model-date {
          display: flex; align-items: center; gap: 8px;
          font-size: 14px; color: var(--gray-500);
        }

        /* ── Icon buttons ── */
        .cti-icon-btn {
          display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px;
          border: 0; background: none; color: var(--gray-500); cursor: pointer; transition: .2s;
        }
        .cti-icon-btn:hover { background: var(--primary-700); color: var(--gray-100); }
        .cti-icon-btn-danger:hover {
          background: rgba(239,83,80,0.10); color: var(--error-medium);
        }
        .cti-icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Gerar button ── */
        .cti-gen-btn {
          display: flex; align-items: center; gap: 8px;
          height: 46px; padding: 0 20px;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border: 0; border-radius: 12px;
          white-space: nowrap;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 8px 20px -10px rgba(30,182,232,0.8); transition: .2s;
        }
        .cti-gen-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px -8px rgba(30,182,232,0.9);
        }
        .cti-gen-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Generated contracts table ── */
        .cti-table {
          display: flex; flex-direction: column;
          border: 1px solid var(--gray-700); border-radius: 18px; overflow: hidden;
          background: linear-gradient(180deg, var(--primary-800), var(--primary-900));
        }
        .cti-th {
          display: grid;
          grid-template-columns: 2.4fr 1.4fr 1fr;
          align-items: center; gap: 20px;
          padding: 18px 26px; border-bottom: 1px solid var(--gray-700);
        }
        .cti-th span {
          font-size: 12.5px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--gray-400);
        }
        .cti-row {
          display: grid;
          grid-template-columns: 2.4fr 1.4fr 1fr;
          align-items: center; gap: 20px;
          padding: 18px 26px;
          border-bottom: 1px solid var(--gray-700);
          transition: background .2s; cursor: default;
        }
        .cti-row:last-child { border-bottom: 0; }
        .cti-row:hover { background: rgba(148,169,173,0.04); }
        .cti-row:hover .cti-row-actions { opacity: 1; }

        .cti-row-title {
          display: flex; align-items: center; gap: 14px;
          font-size: 16px; font-weight: 600; color: var(--gray-100); min-width: 0;
        }
        .cti-row-title-txt {
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cti-row-icon {
          flex: none; display: grid; place-items: center;
          width: 40px; height: 40px; border-radius: 11px;
          color: var(--primary-300);
          background: rgba(30,182,232,0.08); border: 1px solid rgba(30,182,232,0.20);
        }
        .cti-row-model {
          font-size: 15px; color: var(--gray-400);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cti-row-last {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
        }
        .cti-row-date {
          font-size: 14.5px; color: var(--gray-500); white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .cti-row-actions {
          display: flex; align-items: center; gap: 2px;
          opacity: 0; transition: opacity .2s;
        }

        /* ── Generate Modal ── */
        .cti-gm-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 0 16px;
        }
        .cti-gm-box {
          background: var(--primary-900); border: 1px solid var(--gray-700);
          border-radius: 20px; width: 100%; max-width: 520px; max-height: 85vh;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 60px -10px rgba(0,0,0,0.6);
        }
        .cti-gm-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 26px 18px; border-bottom: 1px solid var(--gray-700); flex-shrink: 0;
        }
        .cti-gm-title { font-size: 20px; font-weight: 700; color: var(--gray-100); margin-bottom: 6px; }
        .cti-gm-subtitle { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gray-400); }
        .cti-gm-model-tag {
          font-size: 12px; color: var(--primary-300); padding: 3px 10px; border-radius: 8px;
          background: rgba(30,182,232,0.08); border: 1px solid rgba(30,182,232,0.22);
        }
        .cti-gm-close {
          display: grid; place-items: center; width: 36px; height: 36px; flex-shrink: 0;
          border-radius: 10px; border: 1px solid var(--gray-700); background: none;
          color: var(--gray-400); cursor: pointer; transition: .2s;
        }
        .cti-gm-close:hover { border-color: var(--primary-600); color: var(--gray-100); }
        .cti-gm-body {
          flex: 1; overflow-y: auto; padding: 22px 26px; display: flex; flex-direction: column; gap: 16px;
        }
        .cti-gm-field { display: flex; flex-direction: column; gap: 6px; }
        .cti-gm-label { font-size: 12px; font-weight: 600; color: var(--gray-400); }
        .cti-gm-label-opt { color: var(--gray-600); font-weight: 400; margin-left: 4px; }
        .cti-gm-input {
          background: var(--primary-800); border: 1px solid var(--gray-700);
          border-radius: 12px; padding: 10px 16px; font-size: 13px; font-family: inherit;
          color: var(--gray-100); outline: none; transition: .2s; width: 100%;
        }
        .cti-gm-input:focus { border-color: var(--primary-500); }
        .cti-gm-input::placeholder { color: var(--gray-600); }
        .cti-gm-select {
          background: var(--primary-800); border: 1px solid var(--gray-700);
          border-radius: 12px; padding: 10px 16px; font-size: 13px; font-family: inherit;
          color: var(--gray-100); outline: none; transition: .2s; width: 100%; appearance: none;
        }
        .cti-gm-select:focus { border-color: var(--primary-500); }
        .cti-gm-divider { display: flex; align-items: center; gap: 12px; }
        .cti-gm-divider-line { flex: 1; height: 1px; background: var(--gray-700); }
        .cti-gm-divider-text { font-size: 11px; color: var(--gray-500); font-weight: 600; white-space: nowrap; }
        .cti-gm-var-label {
          font-size: 11.5px; font-weight: 600; color: var(--primary-300); font-family: monospace;
        }
        .cti-gm-empty {
          background: var(--primary-800); border: 1px solid var(--gray-700);
          border-radius: 14px; padding: 20px; text-align: center;
        }
        .cti-gm-footer {
          padding: 18px 26px; border-top: 1px solid var(--gray-700);
          display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;
        }
        .cti-gm-preview-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 44px; font-family: inherit; font-size: 14px; font-weight: 600;
          color: var(--gray-200); cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-700); background: var(--primary-800); transition: .2s;
        }
        .cti-gm-preview-btn:hover { border-color: var(--primary-600); }
        .cti-gm-row-btns { display: flex; gap: 10px; }
        .cti-gm-pdf-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 50px; font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border-radius: 14px; border: none;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8); transition: .2s;
        }
        .cti-gm-pdf-btn:hover { opacity: .9; }
        .cti-gm-pdf-btn:disabled { opacity: .6; cursor: default; }
        .cti-gm-docx-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          height: 50px; font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--gray-100); cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-700); background: var(--primary-800); transition: .2s;
        }
        .cti-gm-docx-btn:hover { border-color: var(--primary-600); }
        .cti-gm-docx-btn:disabled { opacity: .6; cursor: default; }

        /* ── View / Preview overlays ── */
        .cti-overlay {
          position: fixed; inset: 0; z-index: 60;
          display: flex; flex-direction: column;
          background: var(--primary-900);
        }
        .cti-overlay-header {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 30px; flex-shrink: 0;
          border-bottom: 1px solid var(--gray-700);
          background: var(--primary-900);
        }
        .cti-overlay-back {
          display: flex; align-items: center; gap: 10px;
          height: 50px; padding: 0 16px 0 12px; flex-shrink: 0;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--gray-200); cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-700); background: var(--primary-800); transition: .2s;
        }
        .cti-overlay-back:hover { border-color: var(--primary-500); color: var(--primary-300); }
        .cti-overlay-title {
          font-size: 18px; font-weight: 700; color: var(--gray-100);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cti-overlay-sub {
          font-size: 13px; color: var(--gray-500); white-space: nowrap; flex-shrink: 0;
        }
        .cti-overlay-actions {
          margin-left: auto; display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .cti-overlay-primary {
          display: flex; align-items: center; gap: 9px;
          height: 50px; padding: 0 24px;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border-radius: 14px; border: none;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8); transition: .2s;
        }
        .cti-overlay-primary:hover { opacity: .9; }
        .cti-overlay-primary:disabled { opacity: .6; cursor: default; }
        .cti-overlay-ghost {
          display: flex; align-items: center; gap: 9px;
          height: 50px; padding: 0 22px;
          font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--gray-100); cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-700); background: var(--primary-800); transition: .2s;
        }
        .cti-overlay-ghost:hover { border-color: var(--primary-600); }
        .cti-overlay-ghost:disabled { opacity: .6; cursor: default; }
        .cti-overlay-canvas {
          flex: 1; overflow-y: auto; padding: 44px 40px 60px;
          display: flex; justify-content: center; align-items: flex-start;
          background: linear-gradient(180deg, #5b6876, #4a5560);
        }
      `}</style>
    </>
  );
}
