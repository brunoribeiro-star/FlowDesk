"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote,
} from "lucide-react";

interface Projeto {
  id: string;
  titulo: string;
}

const IconChevLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
);
const IconSave = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/><path d="M5 12h14"/>
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 5 5 9-10"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const IconCal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>
  </svg>
);
const IconChevDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const Btn = ({ onClick, active, disabled, title, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={"tk-tb" + (active ? " is-on" : "") + (disabled ? " disabled" : "")}
    >
      {children}
    </button>
  );
  const Div = () => <span className="tk-tb-div" />;

  return (
    <div className="tk-ed-bar">
      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} disabled={!editor.can().chain().focus().toggleBold().run()} title="Negrito">
        <Bold size={16} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} disabled={!editor.can().chain().focus().toggleItalic().run()} title="Itálico">
        <Italic size={16} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
        <UnderlineIcon size={16} />
      </Btn>
      <Div />
      <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à esquerda">
        <AlignLeft size={16} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
        <AlignCenter size={16} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à direita">
        <AlignRight size={16} />
      </Btn>
      <Div />
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
        <List size={16} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
        <ListOrdered size={16} />
      </Btn>
      <Div />
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
        <Quote size={16} />
      </Btn>
    </div>
  );
};

export default function NovaTarefaPage() {
  const router = useRouter();

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);
  const [saving, setSaving] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [subtasks, setSubtasks] = useState<{ id: string; titulo: string }[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none min-h-[200px] tk-ed-content",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    async function loadProjetos() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoadingProjetos(false); return; }
      const { data } = await supabase.from("projetos").select("id, titulo").eq("user_id", auth.user.id).order("created_at", { ascending: false });
      if (data) setProjetos(data as Projeto[]);
      setLoadingProjetos(false);
    }
    loadProjetos();
  }, []);

  useEffect(() => {
    if (!urgencia) return;
    const today = new Date();
    const addDays = (days: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() + days);
      return d.toISOString().split("T")[0];
    };
    const map: Record<string, number> = { "Muito urgente": 1, "Urgente": 2, "Normal": 5, "Baixa": 14 };
    const days = map[urgencia];
    if (days) setVencimento(addDays(days));
  }, [urgencia]);

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), titulo: newSubtask.trim() }]);
    setNewSubtask("");
    setTimeout(() => subtaskInputRef.current?.focus(), 0);
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    if (!titulo.trim()) { alert("Digite o título da tarefa"); return; }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); return; }

    const descricaoJson = editor?.getJSON();

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert({ user_id: auth.user.id, titulo, projeto_id: projetoId || null, due_date: vencimento || null, status: "para_fazer", descricao: descricaoJson })
      .select().single();

    if (taskError) { alert("Erro ao criar tarefa"); setSaving(false); return; }

    if (subtasks.length > 0 && taskData) {
      await supabase.from("subtasks").insert(
        subtasks.map((s) => ({ user_id: auth.user.id, task_id: taskData.id, titulo: s.titulo, concluida: false }))
      );
    }

    router.push("/dashboard/tarefas");
  };

  return (
    <>
      <div className="tk-new-page">
        <header className="tk-new-top">
          <button type="button" onClick={() => router.back()} className="tk-back-btn">
            <IconChevLeft /> Voltar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="tk-btn-primary">
            {saving ? (
              <span className="tk-spinner" />
            ) : (
              <IconSave />
            )}
            Salvar
          </button>
        </header>

        <div className="tk-new-scroll custom-scroll">
          <div className="tk-new-body">

            <div className="tk-new-name">
              <span className="tk-chk-lg" />
              <input
                type="text"
                className="tk-name-input"
                placeholder="Nome da tarefa"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                autoFocus
              />
            </div>

            {subtasks.length > 0 && (
              <div className="tk-subs-list">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="tk-sub-row">
                    <span className="tk-chk sq">
                      <IconCheck />
                    </span>
                    <span className="tk-sub-label">{sub.titulo}</span>
                    <button type="button" onClick={() => removeSubtask(sub.id)} className="tk-sub-remove" title="Remover">
                      <IconX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="tk-add-sub-row">
              <button type="button" className="tk-add-sub-btn" onClick={() => subtaskInputRef.current?.focus()}>
                <span className="tk-add-ico"><IconPlus /></span>
                <span>Adicionar subtarefa</span>
                <em className="tk-add-hint">(Enter ou clicar +)</em>
              </button>
              <input
                ref={subtaskInputRef}
                type="text"
                className="tk-sub-input"
                placeholder="Nome da subtarefa…"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
              />
              {newSubtask.trim() && (
                <button type="button" onClick={addSubtask} className="tk-sub-add-confirm">
                  <IconPlus />
                </button>
              )}
            </div>

            <div className="tk-new-grid">
              <label className="tk-field">
                <span className="tk-field-label">Projeto</span>
                <div className="tk-select-wrap">
                  <select
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    className="tk-select-input"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Selecionar</option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>{p.titulo}</option>
                    ))}
                  </select>
                  <span className="tk-select-chev"><IconChevDown /></span>
                </div>
              </label>

              <label className="tk-field">
                <span className="tk-field-label">Urgência <i className="tk-req">*</i></span>
                <div className="tk-select-wrap">
                  <select
                    value={urgencia}
                    onChange={(e) => setUrgencia(e.target.value)}
                    className="tk-select-input"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Selecionar</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Muito urgente">Muito urgente</option>
                  </select>
                  <span className="tk-select-chev"><IconChevDown /></span>
                </div>
              </label>

              <label className="tk-field">
                <span className="tk-field-label">Vencimento</span>
                <DatePicker
                  value={vencimento}
                  onChange={(v) => setVencimento(v)}
                  placeholder="dd/mm/aaaa"
                  buttonClassName="tk-date-btn"
                />
              </label>

              <label className="tk-field">
                <span className="tk-field-label">Tecnologias</span>
                <div className="tk-select-wrap">
                  <select className="tk-select-input" style={{ colorScheme: "dark" }} defaultValue="">
                    <option value="">Selecionar</option>
                    <option value="React">React</option>
                    <option value="Node.js">Node.js</option>
                    <option value="TypeScript">TypeScript</option>
                  </select>
                  <span className="tk-select-chev"><IconChevDown /></span>
                </div>
              </label>
            </div>

            <div className="tk-editor">
              <MenuBar editor={editor} />
              <EditorContent editor={editor} />
            </div>

          </div>
        </div>
      </div>

      <style jsx global>{`
        /* ===== PAGE ===== */
        .tk-new-page {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        /* ===== HEADER ===== */
        .tk-new-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 40px;
          border-bottom: 1px solid var(--gray-800);
          flex-shrink: 0;
        }
        .tk-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 44px;
          padding: 0 18px 0 14px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: var(--gray-300);
          cursor: pointer;
          border-radius: 999px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          transition: .2s;
        }
        .tk-back-btn:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .tk-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 50px;
          padding: 0 24px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 12px 28px -12px var(--primary-500);
          transition: .2s;
        }
        .tk-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 34px -10px var(--primary-500);
        }
        .tk-btn-primary:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .tk-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--primary-900);
          border-top-color: transparent;
          border-radius: 50%;
          animation: tk-spin .7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes tk-spin { to { transform: rotate(360deg); } }

        /* ===== SCROLL BODY ===== */
        .tk-new-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .tk-new-body {
          width: 100%;
          max-width: 1040px;
          margin: 0 auto;
          padding: 40px 40px 64px;
          display: flex;
          flex-direction: column;
        }

        /* ===== TASK NAME ===== */
        .tk-new-name {
          display: flex;
          align-items: center;
          gap: 18px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--gray-800);
        }
        .tk-chk-lg {
          display: block;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1.5px solid var(--gray-600);
        }
        .tk-name-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--gray-100);
          font-family: inherit;
          font-size: 34px;
          font-weight: 700;
          letter-spacing: -0.02em;
          padding: 0;
        }
        .tk-name-input::placeholder { color: var(--gray-600); }

        /* ===== SUBTASKS ===== */
        .tk-subs-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 12px 0 0 48px;
        }
        .tk-sub-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 0;
        }
        .tk-chk {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1.5px solid var(--gray-600);
          color: var(--gray-600);
        }
        .tk-chk.sq {
          border-radius: 6px;
        }
        .tk-sub-label {
          flex: 1;
          font-size: 15px;
          color: var(--gray-200);
        }
        .tk-sub-remove {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: none;
          background: none;
          color: var(--gray-600);
          cursor: pointer;
          transition: .15s;
          opacity: 0;
        }
        .tk-sub-row:hover .tk-sub-remove {
          opacity: 1;
        }
        .tk-sub-remove:hover {
          background: var(--primary-700);
          color: var(--error-medium);
        }

        /* ===== ADD SUBTASK ===== */
        .tk-add-sub-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding-left: 48px;
        }
        .tk-add-sub-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          color: var(--gray-400);
          background: none;
          border: none;
          cursor: pointer;
          transition: .15s;
          padding: 0;
          flex-shrink: 0;
        }
        .tk-add-sub-btn:hover { color: var(--primary-300); }
        .tk-add-ico {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1.5px dashed var(--gray-600);
          color: var(--gray-400);
          transition: .15s;
        }
        .tk-add-sub-btn:hover .tk-add-ico {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .tk-add-hint {
          font-style: normal;
          font-size: 13px;
          color: var(--gray-600);
        }
        .tk-sub-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: 15px;
          color: var(--gray-200);
        }
        .tk-sub-input::placeholder { color: var(--gray-600); }
        .tk-sub-add-confirm {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: none;
          background: var(--primary-600);
          color: var(--gray-100);
          cursor: pointer;
          transition: .15s;
          flex-shrink: 0;
        }
        .tk-sub-add-confirm:hover { background: var(--primary-500); }

        /* ===== FIELDS GRID ===== */
        .tk-new-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px 32px;
          margin-top: 40px;
        }
        .tk-field {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .tk-field-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--gray-100);
        }
        .tk-req {
          color: var(--error-medium);
          font-style: normal;
          margin-left: 4px;
        }

        /* Selects */
        .tk-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .tk-select-input {
          width: 100%;
          height: 54px;
          padding: 0 44px 0 18px;
          appearance: none;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-300);
          font-family: inherit;
          font-size: 15.5px;
          cursor: pointer;
          transition: .2s;
          outline: none;
        }
        .tk-select-input:hover, .tk-select-input:focus {
          border-color: var(--primary-600);
        }
        .tk-select-chev {
          position: absolute;
          right: 14px;
          pointer-events: none;
          color: var(--gray-400);
          display: flex;
          align-items: center;
        }

        /* Date picker button */
        .tk-date-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          height: 54px;
          padding: 0 18px;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-300);
          font-family: inherit;
          font-size: 15.5px;
          cursor: pointer;
          transition: .2s;
          text-align: left;
        }
        .tk-date-btn:hover {
          border-color: var(--primary-600);
        }

        /* ===== EDITOR ===== */
        .tk-editor {
          margin-top: 32px;
          border: 1px solid var(--gray-700);
          border-radius: 16px;
          overflow: hidden;
          background: var(--primary-800);
        }
        .tk-ed-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--gray-700);
          background: var(--primary-700);
          flex-wrap: wrap;
        }
        .tk-tb {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: none;
          background: none;
          color: var(--gray-300);
          cursor: pointer;
          transition: .15s;
        }
        .tk-tb:hover { background: var(--gray-700); color: var(--gray-100); }
        .tk-tb.is-on { background: var(--primary-600); color: var(--gray-100); }
        .tk-tb.disabled { opacity: .35; cursor: not-allowed; }
        .tk-tb-div {
          width: 1px;
          height: 22px;
          background: var(--gray-700);
          margin: 0 4px;
          flex-shrink: 0;
        }
        .tk-ed-content {
          padding: 20px 22px;
          font-size: 16px;
          color: var(--gray-200);
          min-height: 200px;
        }

        /* TipTap content styles */
        .tiptap-editor { line-height: 1.6; }
        .tiptap-editor strong { font-weight: 700; }
        .tiptap-editor em { font-style: italic; }
        .tiptap-editor u { text-decoration: underline; }
        .tiptap-editor ul { list-style: disc; padding-left: 1.25rem; }
        .tiptap-editor ol { list-style: decimal; padding-left: 1.25rem; }
        .tiptap-editor li { margin: 0.15rem 0; }
        .tiptap-editor blockquote {
          border-left: 3px solid var(--gray-600);
          padding-left: 0.9rem;
          color: var(--gray-300);
          margin: 0.75rem 0;
        }
        .tiptap-editor a { color: var(--primary-400); text-decoration: underline; text-underline-offset: 2px; }
        .tiptap-editor p { margin: 0.35rem 0; }
        .tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3 {
          margin: 0.6rem 0 0.35rem;
          line-height: 1.25;
          font-weight: 700;
        }
        .tiptap-editor.ProseMirror-focused { outline: none; }
        .tiptap-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--gray-600);
          pointer-events: none;
          float: left;
          height: 0;
        }

        /* Native select options */
        select option {
          background: var(--primary-800);
          color: var(--gray-100);
        }
      `}</style>
    </>
  );
}
