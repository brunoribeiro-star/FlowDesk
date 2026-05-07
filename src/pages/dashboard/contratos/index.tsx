"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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
} from "lucide-react";
import Toast, { ToastType } from "@/components/Toast";

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

      // Refresh contracts list
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
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={() => {}} />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8 overflow-y-auto">

        <header className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <h1 className="text-[28px] font-semibold text-gray-100">Contratos</h1>
              <p className="text-[14px] text-gray-400 mt-0.5">Gerencie modelos e contratos gerados</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/contratos/novo")}
              className="bg-primary-500 hover:bg-primary-400 text-primary-900 rounded-lg py-2.5 px-5 text-[14px] font-semibold transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
            >
              <Plus size={16} />
              Novo modelo
            </button>
            <HeaderProfile />
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold text-gray-100">Modelos de contrato</h2>
            {templates.length > 3 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar modelos..."
                  value={searchTemplates}
                  onChange={e => setSearchTemplates(e.target.value)}
                  className="bg-primary-800 border border-primary-700 rounded-lg pl-8 pr-4 py-2 text-[13px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors w-[220px]"
                />
              </div>
            )}
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
              <ScrollText size={36} className="text-primary-700" />
              <p className="text-[15px] font-medium text-gray-300">Nenhum modelo criado ainda</p>
              <p className="text-[13px] text-gray-500 max-w-sm">
                Crie um modelo com variáveis dinâmicas como <code className="text-primary-400 bg-primary-800 px-1.5 py-0.5 rounded text-[11px]">{"{{nome_cliente}}"}</code> e gere contratos personalizados.
              </p>
              <button
                onClick={() => router.push("/dashboard/contratos/novo")}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-lg text-[13px] transition-colors"
              >
                <Plus size={14} />
                Criar primeiro modelo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredTemplates.map(t => (
                <div
                  key={t.id}
                  className="bg-primary-900/40 border border-primary-700 rounded-2xl p-4 flex flex-col gap-3 hover:border-primary-500 transition-colors group cursor-pointer"
                  onClick={() => router.push(`/dashboard/contratos/${t.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary-800 flex items-center justify-center shrink-0">
                      <ScrollText size={16} className="text-primary-400" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/contratos/${t.id}`); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-700 text-gray-500 hover:text-gray-200 transition-colors"
                        title="Editar modelo"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                        disabled={deletingTemplate === t.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors"
                        title="Excluir modelo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-gray-100 leading-snug">{t.titulo}</p>
                    {t.variables?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.variables.slice(0, 3).map(v => (
                          <span key={v} className="text-[10px] bg-primary-800 text-primary-400 border border-primary-700 px-1.5 py-0.5 rounded font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                        {t.variables.length > 3 && (
                          <span className="text-[10px] text-gray-500">+{t.variables.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] text-gray-600 flex items-center gap-1 shrink-0">
                      <Clock size={10} />
                      {formatDate(t.updated_at || t.created_at)}
                    </span>
                    <button
                      onClick={e => openGenerateModal(t, e)}
                      disabled={loadingModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-400 text-primary-900 rounded-lg text-[12px] font-semibold transition-colors shrink-0 disabled:opacity-60"
                      title="Gerar contrato a partir deste modelo"
                    >
                      {loadingModal ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                      Gerar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[18px] font-semibold text-gray-100">Contratos gerados</h2>
            {contracts.length > 4 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar contratos..."
                  value={searchContracts}
                  onChange={e => setSearchContracts(e.target.value)}
                  className="bg-primary-800 border border-primary-700 rounded-lg pl-8 pr-4 py-2 text-[13px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors w-[220px]"
                />
              </div>
            )}
          </div>

          {loadingContracts ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="bg-primary-900/40 border border-primary-700 rounded-2xl p-10 flex flex-col items-center gap-2 text-center">
              <FileText size={30} className="text-primary-700" />
              <p className="text-[14px] text-gray-400">Nenhum contrato gerado ainda.</p>
              <p className="text-[13px] text-gray-500">Abra um modelo e clique em "Gerar contrato" para criar e baixar um contrato preenchido.</p>
            </div>
          ) : (
            <div className="bg-primary-900/40 border border-primary-700 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-primary-700 text-[12px] text-gray-500 uppercase tracking-wider font-medium flex items-center gap-4">
                <div className="flex-1">Título</div>
                <div className="w-[180px] hidden md:block">Modelo</div>
                <div className="w-[140px] hidden lg:block">Gerado em</div>
                <div className="w-[72px]" />
              </div>
              {filteredContracts.map(c => (
                <div
                  key={c.id}
                  className="px-5 py-3.5 border-b border-primary-800 last:border-0 flex items-center gap-4 hover:bg-primary-800/30 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-800 flex items-center justify-center shrink-0">
                    <FileDown size={13} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-100 truncate">{c.titulo}</p>
                  </div>
                  <div className="w-[180px] hidden md:block">
                    <p className="text-[12px] text-gray-500 truncate">
                      {c.contract_templates?.titulo ?? "—"}
                    </p>
                  </div>
                  <div className="w-[140px] hidden lg:block">
                    <p className="text-[12px] text-gray-500">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="w-[72px] flex items-center justify-end gap-1">
                    <button
                      onClick={() => setViewingContract(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary-700 text-gray-500 hover:text-gray-200 transition-all"
                      title="Ver contrato"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteContract(c.id)}
                      disabled={deletingContract === c.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {viewingContract && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-primary-900 border-b border-primary-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
              <span className="text-[14px] font-semibold text-gray-100 truncate max-w-[320px]">{viewingContract.titulo}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewDownload("pdf", viewingContract)}
                disabled={!!viewGenerating}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors disabled:opacity-60"
              >
                {viewGenerating === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => handleViewDownload("docx", viewingContract)}
                disabled={!!viewGenerating}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors disabled:opacity-60"
              >
                {viewGenerating === "docx" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar DOCX
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#6b7280] p-8">
            <iframe
              srcDoc={buildPreviewHtml(viewingContract.content ?? "", "times")}
              title="Visualização do contrato"
              className="mx-auto shadow-2xl bg-white block"
              style={{ width: "794px", minHeight: "1122px", border: "none" }}
            />
          </div>
        </div>
      )}

      {previewHtml && generateModal && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-primary-900 border-b border-primary-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
              <span className="text-[14px] font-semibold text-gray-100">Pré-visualização</span>
            </div>
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors"
              >
                Editar contrato
              </button>
              <button
                type="button"
                onClick={() => { setPreviewHtml(null); handleGenerate("pdf"); }}
                disabled={!!generating}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors disabled:opacity-60"
              >
                {generating === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => { setPreviewHtml(null); handleGenerate("docx"); }}
                disabled={!!generating}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors disabled:opacity-60"
              >
                {generating === "docx" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar DOCX
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#6b7280] p-8">
            <iframe
              srcDoc={previewHtml}
              title="Pré-visualização do contrato"
              className="mx-auto shadow-2xl bg-white block"
              style={{ width: "794px", minHeight: "1122px", border: "none" }}
            />
          </div>
        </div>
      )}

      {generateModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => !generating && setGenerateModal(null)}
        >
          <div
            className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800 shrink-0">
              <div>
                <h2 className="text-[16px] font-semibold text-gray-100">Gerar contrato</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">Modelo: {generateModal.templateTitulo}</p>
              </div>
              <button
                type="button"
                onClick={() => setGenerateModal(null)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-400">Título do contrato</label>
                <input
                  type="text"
                  value={generateModal.titulo}
                  onChange={e => setGenerateModal(prev => prev ? { ...prev, titulo: e.target.value } : prev)}
                  className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {clients.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-gray-400">
                    Preencher a partir de um cliente <span className="text-gray-600">(opcional)</span>
                  </label>
                  <select
                    value={generateModal.clientId ?? ""}
                    onChange={e => e.target.value ? applyClientFill(e.target.value) : setGenerateModal(prev => prev ? { ...prev, clientId: null } : prev)}
                    className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 appearance-none transition-colors"
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
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary-800" />
                    <p className="text-[11px] text-gray-500 font-medium">Variáveis do contrato</p>
                    <div className="h-px flex-1 bg-primary-800" />
                  </div>
                  {Object.entries(generateModal.varsData).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-gray-500 font-mono">{`{{${key}}}`}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setGenerateModal(prev => prev ? {
                          ...prev,
                          varsData: { ...prev.varsData, [key]: e.target.value },
                        } : prev)}
                        placeholder={`Valor de ${key}...`}
                        className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-primary-800 border border-primary-700 rounded-xl p-4 text-center">
                  <p className="text-[13px] text-gray-400">Nenhuma variável neste modelo.</p>
                  <p className="text-[12px] text-gray-600 mt-1">O contrato será gerado com o conteúdo fixo do modelo.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-primary-800 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!generateModal) return;
                  const filled = fillTemplate(generateModal.content, generateModal.varsData);
                  setPreviewHtml(buildPreviewHtml(filled, generateModal.fontFamily));
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors"
              >
                Pré-visualizar
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerate("pdf")}
                  disabled={!!generating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors disabled:opacity-60"
                >
                  {generating === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate("docx")}
                  disabled={!!generating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors disabled:opacity-60"
                >
                  {generating === "docx" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                  Baixar DOCX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
