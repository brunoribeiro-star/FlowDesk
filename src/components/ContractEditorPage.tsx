"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { Mark, mergeAttributes, Extension } from "@tiptap/core";
import { Plugin as PMPlugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  addContractTemplate,
  updateContractTemplate,
  getContractTemplate,
  addContract,
} from "@/lib/supabaseQueries/contracts";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, List, ListOrdered, Minus, ChevronDown,
  Save, FileDown, X, Loader2, ArrowLeft, Variable, Eye,
} from "lucide-react";
import clsx from "clsx";
import Toast, { ToastType } from "@/components/Toast";


const VAR_SUGGESTIONS = [
  { group: "Cliente", vars: [
    { label: "Nome do cliente", value: "nome_cliente" },
    { label: "Empresa", value: "empresa" },
    { label: "CNPJ", value: "cnpj" },
    { label: "CPF", value: "cpf" },
    { label: "E-mail", value: "email_cliente" },
    { label: "Telefone", value: "telefone" },
    { label: "Endereço", value: "endereco" },
    { label: "Cidade", value: "cidade" },
    { label: "Estado", value: "estado" },
    { label: "CEP", value: "cep" },
  ]},
  { group: "Serviço", vars: [
    { label: "Descrição do serviço", value: "descricao_servico" },
    { label: "Valor do serviço", value: "valor_servico" },
    { label: "Forma de pagamento", value: "forma_pagamento" },
    { label: "Prazo de entrega", value: "prazo_entrega" },
  ]},
  { group: "Contrato", vars: [
    { label: "Número do contrato", value: "numero_contrato" },
    { label: "Data do contrato", value: "data_contrato" },
    { label: "Data de início", value: "data_inicio" },
    { label: "Data de término", value: "data_termino" },
  ]},
  { group: "Prestador", vars: [
    { label: "Nome do prestador", value: "nome_prestador" },
    { label: "CNPJ do prestador", value: "cnpj_prestador" },
    { label: "Endereço do prestador", value: "endereco_prestador" },
  ]},
];

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24"];
type FontFamily = "times" | "arial";

const FontSizeExtension = Mark.create<any>({
  name: "fontSize",
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el: any) => (el as HTMLElement).style?.fontSize?.replace("pt", "") || null,
        renderHTML: (attrs: any) => attrs.size ? { style: `font-size: ${attrs.size}pt` } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (el: any) => (el as HTMLElement).style?.fontSize ? {} : false }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: any }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }: { commands: any }) =>
        commands.setMark(this.name, { size }),
      unsetFontSize: () => ({ commands }: { commands: any }) =>
        commands.unsetMark(this.name),
    } as any;
  },
});

const PAGE_CONTENT_H = 978;
const PAGE_SEP_H     = 176;
const paginationKey  = new PluginKey<DecorationSet>("pagination");

function makePageSepEl(): HTMLElement {
  const outer = document.createElement("div");
  outer.setAttribute("data-page-sep", "1");
  outer.style.cssText = [
    "position:relative",
    `height:${PAGE_SEP_H}px`,
    "pointer-events:none",
    "user-select:none",
    "margin-left:-80px",
    "width:calc(100% + 160px)",
    "display:block",
  ].join(";");
  const bm = document.createElement("div");
  bm.style.cssText = "height:72px;background:#fff;";
  const gap = document.createElement("div");
  gap.style.cssText = "height:32px;background:#5b6876;";
  const tm = document.createElement("div");
  tm.style.cssText = "height:72px;background:#fff;";
  outer.append(bm, gap, tm);
  return outer;
}

function computeDecos(view: any): DecorationSet {
  const widgets: Decoration[] = [];
  let pageH = 0;

  view.state.doc.forEach((node: any, offset: number) => {
    const domEl: any = view.nodeDOM(offset);
    if (!(domEl instanceof Element)) return;
    const h = (domEl as Element).getBoundingClientRect().height;
    if (h === 0) return;

    if (pageH > 0 && pageH + h > PAGE_CONTENT_H) {
      widgets.push(Decoration.widget(offset, makePageSepEl, { side: -1, key: `pb-${offset}` }));
      pageH = h;
    } else {
      pageH += h;
    }
  });

  return DecorationSet.create(view.state.doc, widgets);
}

const PaginationExtension = Extension.create({
  name: "pagination",
  addProseMirrorPlugins() {
    return [
      new PMPlugin({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, decos) {
            const meta = tr.getMeta(paginationKey);
            if (meta instanceof DecorationSet) return meta;
            return decos.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state: any) {
            return paginationKey.getState(state) ?? DecorationSet.empty;
          },
        },
        view(view: any) {
          let timer: ReturnType<typeof setTimeout> | null = null;
          let busy = false;

          function paginate() {
            if (busy) return;
            busy = true;
            const decos = computeDecos(view);
            view.dispatch(view.state.tr.setMeta(paginationKey, decos));
            requestAnimationFrame(() => { busy = false; });
          }

          function schedule() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(paginate, 80);
          }

          return {
            update: schedule,
            destroy() { if (timer) clearTimeout(timer); },
          };
        },
      }),
    ];
  },
});

function extractVariables(html: string): string[] {
  const matches = [...html.matchAll(/\{\{([^}]+)\}\}/g)];
  return [...new Set(matches.map(m => m[1].trim()))];
}

function fillTemplate(html: string, data: Record<string, string>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key) => data[key.trim()] ?? `{{${key.trim()}}}`);
}

function fontFaceCSS(ff: FontFamily) {
  return ff === "arial" ? "'Arial', Helvetica, sans-serif" : "'Times New Roman', Times, serif";
}

function buildPreviewHtml(content: string, ff: FontFamily): string {
  const face = fontFaceCSS(ff);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #111; }
  body { font-family: ${face}; font-size: 12pt; line-height: 1.85; padding: 72px 80px; max-width: 820px; margin: 0 auto; }
  h1 { font-size: 18pt; font-weight: 700; text-align: center; margin: 0 0 28px; text-transform: uppercase; letter-spacing: 0.04em; }
  h2 { font-size: 13pt; font-weight: 700; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.03em; }
  h3 { font-size: 12pt; font-weight: 700; margin: 18px 0 6px; }
  p { margin-bottom: 12px; text-align: justify; }
  ul { list-style-type: disc; margin: 8px 0 12px 24px; padding: 0; }
  ol { list-style-type: decimal; margin: 8px 0 12px 24px; padding: 0; }
  li { display: list-item; margin-bottom: 4px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  hr { border: none; border-top: 1px solid #aaa; margin: 28px 0; }
</style>
</head>
<body>${content}</body>
</html>`;
}

type Client = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
};

function ToolbarBtn({ onClick, active, title, children }: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={clsx(
        "w-8 h-8 flex items-center justify-center rounded-lg text-[13px] transition-colors shrink-0",
        active ? "bg-primary-500/20 text-primary-300" : "text-gray-400 hover:text-gray-200 hover:bg-primary-700"
      )}
    >
      {children}
    </button>
  );
}

interface GenerateData {
  content: string;
  titulo: string;
  fontFamily: "times" | "arial";
  templateIdRef: string | null;
  clientId: string | null;
  varsData: Record<string, string>;
}

interface ContractEditorPageProps {
  mode: "new" | "edit" | "generate";
  templateId?: string;
  generateData?: GenerateData;
}

export default function ContractEditorPage({ mode, templateId, generateData }: ContractEditorPageProps) {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [fontFamily, setFontFamily] = useState<FontFamily>("times");

  const [showVarDropdown, setShowVarDropdown] = useState(false);
  const [customVar, setCustomVar] = useState("");
  const varDropdownRef = useRef<HTMLDivElement>(null);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const tituloRef = useRef(titulo);
  useEffect(() => { tituloRef.current = titulo; }, [titulo]);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genTitulo, setGenTitulo] = useState("");
  const [genClientId, setGenClientId] = useState<string | null>(null);
  const [genVarsData, setGenVarsData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSizeExtension,
      PaginationExtension,
    ],
    content: "",
    editable: true,
    autofocus: false,
    immediatelyRender: false,
  });

  const currentFontSize = useMemo(() => {
    if (!editor) return "12";
    return editor.getAttributes("fontSize")?.size ?? "12";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.state]);

  useEffect(() => {
    if (mode !== "edit" || !templateId || !editor) return;
    (async () => {
      setLoading(true);
      hasLoadedRef.current = false;
      const { data } = await getContractTemplate(templateId);
      if (data) {
        setTitulo(data.titulo);
        editor.commands.setContent(data.content ?? "");
        if (data.font_family) setFontFamily(data.font_family as FontFamily);
      }
      hasLoadedRef.current = true;
      setLoading(false);
    })();
  }, [mode, templateId, editor]);

  useEffect(() => {
    if (mode !== "generate" || !generateData || !editor) return;
    setTitulo(generateData.titulo);
    setFontFamily(generateData.fontFamily);
    editor.commands.setContent(generateData.content);
    setGenTitulo(generateData.titulo);
    setGenClientId(generateData.clientId);
    setGenVarsData(generateData.varsData ?? {});
    hasLoadedRef.current = true;
  }, [mode, generateData, editor]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("clientes").select("id, nome, empresa, email, telefone").eq("user_id", user.id).order("nome");
      setClients(data ?? []);
    })();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (varDropdownRef.current && !varDropdownRef.current.contains(e.target as Node)) {
        setShowVarDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!editor) return;
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr);
    });
  }, [fontFamily, editor]);


  useEffect(() => {
    if (!editor || mode !== 'edit' || !templateId) return;

    function handleChange() {
      if (!hasLoadedRef.current) return;
      setAutoSaveStatus('idle');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        setAutoSaveStatus('saving');
        const content = editor?.getHTML() ?? '';
        const variables = extractVariables(content);
        const { error } = await updateContractTemplate(templateId!, {
          titulo: tituloRef.current.trim() || 'Sem título',
          content,
          variables,
        });
        setAutoSaveStatus(error ? 'idle' : 'saved');
      }, 3000);
    }

    editor.on('update', handleChange);
    return () => {
      editor.off('update', handleChange);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editor, mode, templateId]);

  const detectedVars = useMemo(() => {
    if (!editor) return [];
    return extractVariables(editor.getHTML());
  }, [editor?.getHTML()]);

  function insertVar(name: string) {
    editor?.commands.insertContent(`{{${name}}}`);
    setShowVarDropdown(false);
    setCustomVar("");
  }

  function applyFontSize(size: string) {
    (editor as any)?.chain().focus().setFontSize(size).run();
  }

  async function handleSave() {
    if (!titulo.trim()) { showToast("Dê um título ao modelo.", "error"); return; }
    if (!editor) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const content = editor.getHTML();
    const variables = extractVariables(content);

    if (mode === "new") {
      const { data, error } = await addContractTemplate({ user_id: user.id, titulo: titulo.trim(), content, variables });
      if (error) { showToast("Erro ao salvar modelo.", "error"); }
      else { showToast("Modelo salvo!", "success"); router.replace(`/dashboard/contratos/${data.id}`); }
    } else {
      const { error } = await updateContractTemplate(templateId!, { titulo: titulo.trim(), content, variables });
      if (error) { showToast("Erro ao salvar modelo.", "error"); }
      else { showToast("Modelo atualizado!", "success"); }
    }
    setSaving(false);
  }

  function openGenerateModal() {
    if (!editor) return;
    const vars = extractVariables(editor.getHTML());
    const initialData: Record<string, string> = {};
    vars.forEach(v => { initialData[v] = ""; });
    setGenVarsData(initialData);
    setGenTitulo(titulo ? `Contrato — ${titulo}` : "Contrato");
    setGenClientId(null);
    setShowGenerateModal(true);
  }

  function applyClientFill(clientId: string) {
    setGenClientId(clientId);
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
    setGenVarsData(prev => {
      const next = { ...prev };
      Object.entries(fill).forEach(([k, v]) => { if (k in next) next[k] = v; });
      return next;
    });
  }

  function openPreview() {
    if (!editor) return;
    const rawHtml = editor.getHTML();
    const filledHtml = fillTemplate(rawHtml, genVarsData);
    setPreviewHtml(buildPreviewHtml(filledHtml, fontFamily));
    setShowPreview(true);
  }

  async function handleGenerate(format: "pdf" | "docx") {
    if (!editor || !genTitulo.trim()) { showToast("Dê um título ao contrato.", "error"); return; }
    setGenerating(format);

    const { data: { user } } = await supabase.auth.getUser();
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token ?? "";

    const rawHtml = editor.getHTML();
    const filledHtml = fillTemplate(rawHtml, genVarsData);

    await addContract({
      user_id: user!.id,
      template_id: mode === "edit" ? templateId! : mode === "generate" ? (generateData?.templateIdRef ?? null) : null,
      cliente_id: genClientId,
      titulo: genTitulo.trim(),
      variables_data: genVarsData,
      content: filledHtml,
    });

    const endpoint = format === "pdf" ? "/api/contracts/pdf" : "/api/contracts/docx";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: filledHtml, titulo: genTitulo, fontFamily }),
      });
      if (!res.ok) throw new Error("Falha na geração");
      const blob = await res.blob();
      const ext = format === "pdf" ? "pdf" : "docx";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${genTitulo.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} gerado com sucesso!`, "success");
      setShowGenerateModal(false);
      setShowPreview(false);
    } catch {
      showToast(`Erro ao gerar ${format.toUpperCase()}.`, "error");
    }
    setGenerating(null);
  }

  const face = fontFaceCSS(fontFamily);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>

      {toast && <Toast message={toast.message} type={toast.type} />}

      <style>{`
        .ced-header {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 30px;
          border-bottom: 1px solid var(--gray-700);
          background: var(--primary-900);
          flex-shrink: 0;
        }
        .ced-back-btn {
          display: grid; place-items: center;
          width: 44px; height: 44px; border-radius: 12px; flex: none;
          border: 1px solid var(--gray-700); background: var(--primary-800);
          color: var(--gray-200); cursor: pointer; transition: .2s;
        }
        .ced-back-btn:hover { border-color: var(--primary-500); color: var(--primary-300); }
        .ced-title-input {
          flex: 1; background: none; border: 0; outline: none;
          color: var(--gray-100); font-family: inherit; font-size: 20px; font-weight: 600;
          padding: 0 4px; min-width: 0;
        }
        .ced-title-input::placeholder { color: var(--gray-600); }
        .ced-autosave {
          display: flex; align-items: center; gap: 9px;
          font-size: 14px; color: var(--primary-300); white-space: nowrap; flex-shrink: 0;
        }
        .ced-autosave-saving { color: var(--gray-500); }
        .ced-autosave-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
          background: var(--primary-400); box-shadow: 0 0 10px 1px var(--primary-500);
        }
        .ced-var-tag {
          font-size: 10px; background: rgba(30,182,232,0.08); color: var(--primary-300);
          border: 1px solid rgba(30,182,232,0.22); padding: 3px 10px; border-radius: 9px;
        }
        .ced-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .ced-ghost-btn {
          display: flex; align-items: center; gap: 9px;
          height: 50px; padding: 0 22px; font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--gray-100); cursor: pointer; border-radius: 13px;
          border: 1px solid var(--gray-700); background: var(--primary-800); transition: .2s;
        }
        .ced-ghost-btn:hover { border-color: var(--primary-600); }
        .ced-ghost-btn:disabled { opacity: .6; cursor: default; }
        .ced-back-labeled {
          width: auto; padding: 0 16px 0 12px; gap: 10px;
          font-size: 15px; font-weight: 600;
        }
        .ced-view-title {
          font-size: 18px; font-weight: 700; color: var(--gray-100);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 480px;
        }
        .ced-primary-btn {
          display: flex; align-items: center; gap: 9px;
          height: 50px; padding: 0 24px; font-family: inherit; font-size: 15px; font-weight: 600;
          color: var(--primary-900); cursor: pointer; border-radius: 14px; border: none;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px rgba(30,182,232,0.8); transition: .2s;
        }
        .ced-primary-btn:hover { opacity: .9; }
        .ced-toolbar {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
          padding: 12px 30px; border-bottom: 1px solid var(--gray-700);
          background: var(--primary-900); flex-shrink: 0;
        }
        .ced-font-toggle {
          display: flex; padding: 4px; border-radius: 11px;
          background: var(--primary-800); border: 1px solid var(--gray-700); margin-right: 4px;
        }
        .ced-font-btn {
          font-family: inherit; font-size: 14px; font-weight: 600; color: var(--gray-400);
          cursor: pointer; padding: 7px 14px; border: 0; border-radius: 8px; background: none; transition: .15s;
        }
        .ced-font-btn.is-on { color: var(--gray-100); background: rgba(30,182,232,0.16); }
        .ced-font-size {
          height: 40px; padding: 0 12px; font-family: inherit; font-size: 14px;
          color: var(--gray-100); cursor: pointer; border-radius: 11px;
          border: 1px solid var(--gray-700); background: var(--primary-800);
          outline: none; transition: .15s; appearance: none; -webkit-appearance: none; margin-right: 4px;
        }
        .ced-font-size:focus { border-color: var(--primary-500); }
        .ced-toolbar-div { width: 1px; height: 26px; background: var(--gray-700); margin: 0 6px; flex-shrink: 0; }
        .ced-tb {
          display: grid; place-items: center; min-width: 40px; height: 40px; padding: 0 8px;
          border-radius: 10px; border: 0; background: none; color: var(--gray-300);
          cursor: pointer; font-size: 14px; font-weight: 700; transition: .15s; flex-shrink: 0;
        }
        .ced-tb:hover { background: rgba(148,169,173,0.1); color: var(--gray-100); }
        .ced-tb.is-active { background: rgba(30,182,232,0.16); color: var(--primary-300); }
        .ced-insertvar {
          display: flex; align-items: center; gap: 9px; height: 42px; padding: 0 18px;
          font-family: inherit; font-size: 14px; font-weight: 600; color: var(--primary-300);
          cursor: pointer; border-radius: 11px;
          border: 1px solid rgba(30,182,232,0.30); background: rgba(30,182,232,0.07);
          transition: .2s; flex-shrink: 0;
        }
        .ced-insertvar:hover { background: rgba(30,182,232,0.14); }
        .ced-canvas {
          flex: 1; overflow-y: auto; overflow-x: auto; padding: 44px 40px 60px;
          display: flex; justify-content: center; align-items: flex-start;
          background: linear-gradient(180deg, #5b6876, #4a5560);
        }
        .ced-doc {
          width: 794px; background: #fff; padding: 80px 76px; border-radius: 4px;
          box-shadow: 0 30px 80px -20px rgba(0,0,0,0.5); flex-shrink: 0;
        }

        /* ── Responsivo ── */
        @media (max-width: 1023px) {
          .ced-header { flex-wrap: wrap; padding: 12px 16px; gap: 10px; }
          .ced-actions { margin-left: 0; width: 100%; justify-content: flex-start; }
          .ced-title-input { font-size: 17px; }
          .ced-view-title { max-width: 100%; flex: 1; }
          .ced-toolbar { padding: 10px 16px; }
          .ced-canvas { padding: 24px 14px 40px; }
        }
        @media (max-width: 639px) {
          .ced-primary-btn, .ced-ghost-btn { flex: 1; padding: 0 14px; height: 44px; font-size: 13px; white-space: nowrap; }
          .ced-back-labeled { padding: 0 12px 0 10px; font-size: 13px; }
          .ced-autosave { font-size: 12px; }
        }
        .contract-editor .ProseMirror {
          font-family: ${face}; font-size: 12pt; line-height: 1.85; color: #111; min-height: 834px; outline: none;
        }
        .contract-editor .ProseMirror h1 { font-size: 18pt; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 24px; color: #000; }
        .contract-editor .ProseMirror h2 { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin: 24px 0 8px; color: #000; }
        .contract-editor .ProseMirror h3 { font-size: 12pt; font-weight: 700; margin: 18px 0 6px; color: #000; }
        .contract-editor .ProseMirror p { margin-bottom: 12px; }
        .contract-editor .ProseMirror ul { list-style-type: disc; padding-left: 24px; margin: 8px 0 12px 0; }
        .contract-editor .ProseMirror ol { list-style-type: decimal; padding-left: 24px; margin: 8px 0 12px 0; }
        .contract-editor .ProseMirror li { display: list-item; margin-bottom: 4px; }
        .contract-editor .ProseMirror hr { border: none; border-top: 1px solid #ccc; margin: 28px 0; }
        .contract-editor .ProseMirror p.is-editor-empty::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; font-style: italic; }
      `}</style>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <div className="ced-header">
          {mode === "generate" ? (
            <>
              <button
                type="button"
                onClick={() => router.push("/dashboard/contratos")}
                className="ced-back-btn ced-back-labeled"
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
              <span className="ced-view-title">{titulo}</span>
              <div className="ced-actions">
                <button
                  type="button"
                  onClick={() => handleGenerate("pdf")}
                  disabled={!!generating}
                  className="ced-primary-btn"
                >
                  {generating === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate("docx")}
                  disabled={!!generating}
                  className="ced-ghost-btn"
                >
                  {generating === "docx" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  Baixar DOCX
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/dashboard/contratos")}
                className="ced-back-btn"
              >
                <ArrowLeft size={18} />
              </button>

              <input
                type="text"
                placeholder="Nome do modelo..."
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="ced-title-input"
              />

              {mode === 'edit' && autoSaveStatus !== 'idle' && (
                <span className={`ced-autosave${autoSaveStatus === 'saving' ? ' ced-autosave-saving' : ''}`}>
                  {autoSaveStatus === 'saved' && <span className="ced-autosave-dot" />}
                  {autoSaveStatus === 'saving' ? 'Salvando...' : 'Salvo automaticamente'}
                </span>
              )}

              <div className="ced-actions">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="ced-ghost-btn"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar modelo
                </button>
                <button
                  type="button"
                  onClick={openGenerateModal}
                  className="ced-primary-btn"
                >
                  <FileDown size={16} />
                  Gerar contrato
                </button>
              </div>
            </>
          )}
        </div>

        {/* TOOLBAR — oculta no modo visualização */}
        {mode !== "generate" && <div className="ced-toolbar">

          <div className="ced-font-toggle">
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setFontFamily("times"); }}
              className={clsx("ced-font-btn", fontFamily === "times" && "is-on")}
              title="Times New Roman (ABNT)"
            >
              TNR
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setFontFamily("arial"); }}
              className={clsx("ced-font-btn", fontFamily === "arial" && "is-on")}
              title="Arial"
            >
              Arial
            </button>
          </div>

          <select
            value={currentFontSize}
            onChange={e => applyFontSize(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            className="ced-font-size"
            title="Tamanho da fonte"
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}pt</option>
            ))}
          </select>

          <span className="ced-toolbar-div" />

          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }} title="Negrito" className={clsx("ced-tb", editor?.isActive("bold") && "is-active")}>
            <Bold size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }} title="Itálico" className={clsx("ced-tb", editor?.isActive("italic") && "is-active")}>
            <Italic size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }} title="Sublinhado" className={clsx("ced-tb", editor?.isActive("underline") && "is-active")}>
            <UnderlineIcon size={18} />
          </button>

          <span className="ced-toolbar-div" />

          {([1, 2, 3] as const).map(level => (
            <button key={level} type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level }).run(); }} title={`Título H${level}`} className={clsx("ced-tb", editor?.isActive("heading", { level }) && "is-active")}>
              H{level}
            </button>
          ))}

          <span className="ced-toolbar-div" />

          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign("left").run(); }} title="Alinhar à esquerda" className={clsx("ced-tb", editor?.isActive({ textAlign: "left" }) && "is-active")}>
            <AlignLeft size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign("center").run(); }} title="Centralizar" className={clsx("ced-tb", editor?.isActive({ textAlign: "center" }) && "is-active")}>
            <AlignCenter size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign("right").run(); }} title="Alinhar à direita" className={clsx("ced-tb", editor?.isActive({ textAlign: "right" }) && "is-active")}>
            <AlignRight size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setTextAlign("justify").run(); }} title="Justificar" className={clsx("ced-tb", editor?.isActive({ textAlign: "justify" }) && "is-active")}>
            <AlignJustify size={18} />
          </button>

          <span className="ced-toolbar-div" />

          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }} title="Lista com marcadores" className={clsx("ced-tb", editor?.isActive("bulletList") && "is-active")}>
            <List size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }} title="Lista numerada" className={clsx("ced-tb", editor?.isActive("orderedList") && "is-active")}>
            <ListOrdered size={18} />
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); editor?.chain().focus().setHorizontalRule().run(); }} title="Linha divisória" className="ced-tb">
            <Minus size={18} />
          </button>

          <span className="ced-toolbar-div" />

          <div className="relative" ref={varDropdownRef}>
            <button
              type="button"
              onClick={() => setShowVarDropdown(v => !v)}
              className="ced-insertvar"
            >
              <Variable size={17} />
              Inserir variável
              <ChevronDown size={14} />
            </button>

            {showVarDropdown && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-primary-900 border border-primary-700 rounded-xl shadow-2xl w-[480px] max-w-[calc(100vw-2rem)] max-h-[420px] overflow-y-auto p-3">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  {VAR_SUGGESTIONS.map(group => (
                    <div key={group.group}>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">{group.group}</p>
                      <div className="flex flex-col gap-0.5">
                        {group.vars.map(v => (
                          <button
                            key={v.value}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); insertVar(v.value); }}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-primary-800 text-left transition-colors group"
                          >
                            <span className="text-[12px] text-gray-300">{v.label}</span>
                            <span className="text-[10px] text-primary-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{`{{${v.value}}}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-primary-800">
                  <p className="text-[11px] text-gray-500 mb-1.5 px-1">Variável personalizada</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="nome_da_variavel"
                      value={customVar}
                      onChange={e => setCustomVar(e.target.value.replace(/\s+/g, "_").toLowerCase())}
                      onKeyDown={e => { if (e.key === "Enter" && customVar) insertVar(customVar); }}
                      className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-1.5 text-[12px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 font-mono"
                    />
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); if (customVar) insertVar(customVar); }}
                      disabled={!customVar}
                      className="px-3 py-1.5 bg-primary-500 hover:bg-primary-400 rounded-lg text-[12px] font-semibold text-primary-900 disabled:opacity-40 transition-colors"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>}

        <div className="ced-canvas">
          <div className="contract-editor ced-doc">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => !generating && setShowGenerateModal(false)}>
          <div className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 border-b border-primary-800 shrink-0">
              <h2 className="text-[16px] font-semibold text-gray-100">Gerar contrato</h2>
              <button type="button" onClick={() => setShowGenerateModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-gray-400">Título do contrato</label>
                <input
                  type="text"
                  value={genTitulo}
                  onChange={e => setGenTitulo(e.target.value)}
                  className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {clients.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-gray-400">
                    Preencher a partir de um cliente <span className="text-gray-600">(opcional)</span>
                  </label>
                  <select
                    value={genClientId ?? ""}
                    onChange={e => e.target.value ? applyClientFill(e.target.value) : setGenClientId(null)}
                    className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2.5 text-[13px] text-gray-100 focus:outline-none focus:border-primary-500 appearance-none transition-colors"
                  >
                    <option value="">Selecionar cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}{c.empresa ? ` — ${c.empresa}` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              {Object.keys(genVarsData).length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-primary-800" />
                    <p className="text-[11px] text-gray-500 font-medium">Variáveis do contrato</p>
                    <div className="h-px flex-1 bg-primary-800" />
                  </div>
                  {Object.entries(genVarsData).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-medium text-gray-500 font-mono">{`{{${key}}}`}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setGenVarsData(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Valor de ${key}...`}
                        className="bg-primary-800 border border-primary-700 rounded-xl px-4 py-2 text-[13px] text-gray-100 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(genVarsData).length === 0 && (
                <div className="bg-primary-800 border border-primary-700 rounded-xl p-4 text-center">
                  <p className="text-[13px] text-gray-400">Nenhuma variável detectada neste modelo.</p>
                  <p className="text-[12px] text-gray-600 mt-1">Use "Inserir variável" no editor para adicionar campos dinâmicos.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-primary-800 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={openPreview}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors"
              >
                <Eye size={14} />
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

      {showPreview && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 py-3 bg-primary-900 border-b border-primary-700">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors flex-none"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
              <span className="text-[14px] font-semibold text-gray-100 flex-none">Pré-visualização</span>
              <span className="hidden sm:inline text-[12px] text-gray-500 truncate">— o PDF gerado será idêntico a esta visualização</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerate("pdf")}
                disabled={!!generating}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors disabled:opacity-60"
              >
                {generating === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => handleGenerate("docx")}
                disabled={!!generating}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 rounded-xl text-[13px] font-medium text-gray-200 transition-colors disabled:opacity-60"
              >
                {generating === "docx" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar DOCX
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[#6b7280] p-4 sm:p-8">
            <iframe
              srcDoc={previewHtml}
              title="Pré-visualização do contrato"
              className="mx-auto shadow-2xl bg-white block"
              style={{ width: "794px", minHeight: "1122px", border: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
