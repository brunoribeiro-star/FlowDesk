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
  gap.style.cssText = "height:32px;background:#6b7280;";
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

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <div className="shrink-0 border-b border-primary-800 px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/contratos")}
            className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors mr-1"
          >
            <ArrowLeft size={15} />
          </button>

          <input
            type="text"
            placeholder={mode === "generate" ? "Nome do contrato..." : "Nome do modelo..."}
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            className="flex-1 bg-transparent text-[16px] font-semibold text-gray-100 placeholder-gray-600 focus:outline-none"
          />

          {detectedVars.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 flex-wrap max-w-sm">
              {detectedVars.slice(0, 4).map(v => (
                <span key={v} className="text-[10px] bg-primary-700 text-primary-300 border border-primary-600 px-2 py-0.5 rounded-full">
                  {`{{${v}}}`}
                </span>
              ))}
              {detectedVars.length > 4 && (
                <span className="text-[10px] text-gray-500">+{detectedVars.length - 4}</span>
              )}
            </div>
          )}

          {mode === 'edit' && autoSaveStatus !== 'idle' && (
            <span className={`text-[11px] shrink-0 ${autoSaveStatus === 'saving' ? 'text-gray-500' : 'text-primary-400'}`}>
              {autoSaveStatus === 'saving' ? 'Salvando...' : 'Salvo automaticamente'}
            </span>
          )}

          {mode !== "generate" && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-700 hover:bg-primary-600 border border-primary-600 rounded-xl text-[13px] text-gray-200 transition-colors shrink-0 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar modelo
            </button>
          )}

          <button
            type="button"
            onClick={openGenerateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors shrink-0"
          >
            <FileDown size={14} />
            Gerar contrato
          </button>
        </div>

        <div className="shrink-0 border-b border-primary-800 px-4 py-1.5 flex items-center gap-0.5 flex-wrap">

          <div className="flex items-center bg-primary-800 border border-primary-700 rounded-lg overflow-hidden mr-1 shrink-0">
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setFontFamily("times"); }}
              className={clsx(
                "px-2.5 py-1 text-[11px] font-medium transition-colors",
                fontFamily === "times" ? "bg-primary-600 text-gray-100" : "text-gray-400 hover:text-gray-200"
              )}
              title="Times New Roman (ABNT)"
            >
              TNR
            </button>
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setFontFamily("arial"); }}
              className={clsx(
                "px-2.5 py-1 text-[11px] font-medium transition-colors",
                fontFamily === "arial" ? "bg-primary-600 text-gray-100" : "text-gray-400 hover:text-gray-200"
              )}
              title="Arial (ABNT)"
            >
              Arial
            </button>
          </div>

          <select
            value={currentFontSize}
            onChange={e => applyFontSize(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            className="h-8 bg-primary-800 border border-primary-700 rounded-lg px-2 text-[12px] text-gray-200 focus:outline-none focus:border-primary-500 shrink-0 mr-1 cursor-pointer"
            title="Tamanho da fonte"
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}pt</option>
            ))}
          </select>

          <div className="w-px h-5 bg-primary-700 mx-1 shrink-0" />

          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Negrito">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Itálico">
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Sublinhado">
            <UnderlineIcon size={14} />
          </ToolbarBtn>

          <div className="w-px h-5 bg-primary-700 mx-1 shrink-0" />

          {([1, 2, 3] as const).map(level => (
            <ToolbarBtn
              key={level}
              onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
              active={editor?.isActive("heading", { level })}
              title={`Título H${level}`}
            >
              <span className="font-bold text-[11px]">H{level}</span>
            </ToolbarBtn>
          ))}

          <div className="w-px h-5 bg-primary-700 mx-1 shrink-0" />

          <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
            <AlignLeft size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Centralizar">
            <AlignCenter size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Alinhar à direita">
            <AlignRight size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("justify").run()} active={editor?.isActive({ textAlign: "justify" })} title="Justificar">
            <AlignJustify size={14} />
          </ToolbarBtn>

          <div className="w-px h-5 bg-primary-700 mx-1 shrink-0" />

          <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Lista com marcadores">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Lista numerada">
            <ListOrdered size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Linha divisória">
            <Minus size={14} />
          </ToolbarBtn>

          <div className="w-px h-5 bg-primary-700 mx-1 shrink-0" />

          <div className="relative" ref={varDropdownRef}>
            <button
              type="button"
              onClick={() => setShowVarDropdown(v => !v)}
              className="flex items-center gap-1 px-3 h-8 rounded-lg text-[12px] font-medium bg-primary-500/15 text-primary-300 border border-primary-600 hover:bg-primary-500/25 transition-colors shrink-0"
            >
              <Variable size={13} />
              Inserir variável
              <ChevronDown size={11} />
            </button>

            {showVarDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-primary-900 border border-primary-700 rounded-xl shadow-2xl w-[480px] max-h-[420px] overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="flex-1 overflow-y-auto bg-[#6b7280] py-8 flex justify-center items-start">
          <style>{`
            .contract-editor .ProseMirror {
              font-family: ${face};
              font-size: 12pt;
              line-height: 1.85;
              color: #111;
              min-height: 834px;
              outline: none;
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

          <div
            className="contract-editor bg-white"
            style={{
              width: "794px",
              padding: "72px 80px",
              marginBottom: "32px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
            }}
          >
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
          <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-primary-900 border-b border-primary-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
              <span className="text-[14px] font-semibold text-gray-100">Pré-visualização</span>
              <span className="text-[12px] text-gray-500">— o PDF gerado será idêntico a esta visualização</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerate("pdf")}
                disabled={!!generating}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-400 rounded-xl text-[13px] font-semibold text-primary-900 transition-colors disabled:opacity-60"
              >
                {generating === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => handleGenerate("docx")}
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
    </>
  );
}
