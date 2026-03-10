"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Calendar,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

interface Projeto {
  id: string;
  titulo: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const baseBtn =
    "p-1.5 rounded hover:bg-primary-700 text-gray-300 transition-colors";
  const activeBtn = "bg-primary-600 text-white";
  const divider = <div className="w-px h-6 bg-primary-700 mx-1" />;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-primary-700 bg-primary-800/30 rounded-t-lg">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`${baseBtn} ${editor.isActive("bold") ? activeBtn : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        title="Negrito"
      >
        <Bold size={16} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`${baseBtn} ${editor.isActive("italic") ? activeBtn : ""} disabled:opacity-40 disabled:cursor-not-allowed`}
        title="Itálico"
      >
        <Italic size={16} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${baseBtn} ${editor.isActive("underline") ? activeBtn : ""}`}
        title="Sublinhado"
      >
        <UnderlineIcon size={16} />
      </button>

      {divider}

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={`${baseBtn} ${editor.isActive({ textAlign: "left" }) ? activeBtn : ""}`}
        title="Alinhar à Esquerda"
      >
        <AlignLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={`${baseBtn} ${editor.isActive({ textAlign: "center" }) ? activeBtn : ""}`}
        title="Centralizar"
      >
        <AlignCenter size={16} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={`${baseBtn} ${editor.isActive({ textAlign: "right" }) ? activeBtn : ""}`}
        title="Alinhar à Direita"
      >
        <AlignRight size={16} />
      </button>

      {divider}

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${baseBtn} ${editor.isActive("bulletList") ? activeBtn : ""}`}
        title="Lista com Marcadores"
      >
        <List size={16} />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${baseBtn} ${editor.isActive("orderedList") ? activeBtn : ""}`}
        title="Lista Numerada"
      >
        <ListOrdered size={16} />
      </button>

      {divider}

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${baseBtn} ${editor.isActive("blockquote") ? activeBtn : ""}`}
        title="Citação"
      >
        <Quote size={16} />
      </button>
    </div>
  );
};

export default function NovaTarefaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        class:
          "tiptap-editor focus:outline-none min-h-[150px] p-4 text-gray-200",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    async function loadProjetos() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoadingProjetos(false);
        return;
      }

      const { data } = await supabase
        .from("projetos")
        .select("id, titulo")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

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

    let newDate = "";
    switch (urgencia) {
      case "Muito urgente":
        newDate = addDays(1);
        break;
      case "Urgente":
        newDate = addDays(2);
        break;
      case "Normal":
        newDate = addDays(5);
        break;
      case "Baixa":
        newDate = addDays(14);
        break;
      default:
        newDate = "";
    }

    if (newDate) setVencimento(newDate);
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
    if (!titulo.trim()) {
      alert("Digite o título da tarefa");
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      setSaving(false);
      return;
    }

    const descricaoJson = editor?.getJSON();

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: auth.user.id,
        titulo,
        projeto_id: projetoId || null,
        due_date: vencimento || null,
        status: "para_fazer",
        descricao: descricaoJson,
      })
      .select()
      .single();

    if (taskError) {
      alert("Erro ao criar tarefa");
      setSaving(false);
      return;
    }

    if (subtasks.length > 0 && taskData) {
      const subtasksPayload = subtasks.map((s) => ({
        user_id: auth.user.id,
        task_id: taskData.id,
        titulo: s.titulo,
        concluida: false,
      }));

      await supabase.from("subtasks").insert(subtasksPayload);
    }

    router.push("/dashboard/tarefas");
  };

  const fieldBase =
    "w-full bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-primary-500";
  const selectBase =
    "w-full bg-transparent border border-primary-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-primary-500 appearance-none cursor-pointer";
  const caret = (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        <header className="flex items-center justify-between px-8 py-6 border-b border-primary-800 bg-primary-900 z-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 group text-gray-400 hover:text-white transition-colors"
          >
            <div className="p-2 rounded-full border border-primary-700 group-hover:bg-primary-800 transition-colors">
              <ArrowLeft size={18} />
            </div>
            <span className="text-sm font-medium">Voltar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-primary-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            <span>Salvar</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll">
          <div className="max-w-4xl mx-auto px-8 py-10 flex flex-col gap-10">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-4 text-gray-500">
                  <Circle size={24} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  placeholder="Nome da tarefa"
                  className="w-full bg-transparent text-3xl font-medium text-gray-100 placeholder:text-gray-600 focus:outline-none border-b border-transparent focus:border-primary-700 pb-2 transition-colors"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-3 pl-10">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    <span className="text-gray-300 text-sm flex-1">{sub.titulo}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtask(sub.id)}
                      className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <div className="text-gray-600 shrink-0">
                    <div className="w-5 h-5 rounded-full border border-gray-700 flex items-center justify-center">
                      <span className="text-xs">+</span>
                    </div>
                  </div>
                  <input
                    ref={subtaskInputRef}
                    type="text"
                    placeholder="Adicionar subtarefa (Enter ou clicar +)"
                    className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                  />
                  {newSubtask.trim() && (
                    <button
                      type="button"
                      onClick={addSubtask}
                      className="shrink-0 w-6 h-6 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors"
                      title="Adicionar subtarefa"
                    >
                      <span className="text-xs font-bold leading-none">+</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pl-10">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200">Projeto</label>
                <div className="relative">
                  <select
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    className={selectBase}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Selecionar</option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </select>
                  {caret}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200 flex items-center gap-1">
                  Urgência <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={urgencia}
                    onChange={(e) => setUrgencia(e.target.value)}
                    className={selectBase}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="">Selecionar</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Muito urgente">Muito urgente</option>
                  </select>
                  {caret}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200">Vencimento</label>
                <DatePicker
                  value={vencimento}
                  onChange={(v) => setVencimento(v)}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-200">Tecnologias</label>
                <div className="relative">
                  <select className={selectBase} style={{ colorScheme: "dark" }} defaultValue="">
                    <option value="">Selecionar</option>
                    <option value="React">React</option>
                    <option value="Node.js">Node.js</option>
                    <option value="TypeScript">TypeScript</option>
                  </select>
                  {caret}
                </div>
              </div>
            </div>

            <div className="space-y-8 pl-10">


              <div className="space-y-2">
                <div className="border border-primary-700 rounded-xl overflow-hidden bg-primary-800/20 focus-within:border-primary-500 transition-colors">
                  <MenuBar editor={editor} />
                  <EditorContent editor={editor} />
                  <div className="px-4 py-2 border-t border-primary-700/50 text-xs text-gray-500">
                    Escreva aqui...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          select,
          input,
          textarea {
            background-color: transparent !important;
            -webkit-text-fill-color: currentColor;
          }
          select option {
            background: rgb(15 23 42);
            color: rgb(226 232 240);
          }


          .tiptap-editor {
            line-height: 1.6;
          }
          .tiptap-editor strong {
            font-weight: 700;
          }
          .tiptap-editor em {
            font-style: italic;
          }
          .tiptap-editor u {
            text-decoration: underline;
          }
          .tiptap-editor ul {
            list-style: disc;
            padding-left: 1.25rem;
          }
          .tiptap-editor ol {
            list-style: decimal;
            padding-left: 1.25rem;
          }
          .tiptap-editor li {
            margin: 0.15rem 0;
          }
          .tiptap-editor blockquote {
            border-left: 3px solid rgba(148, 163, 184, 0.35);
            padding-left: 0.9rem;
            color: rgba(203, 213, 225, 0.9);
            margin: 0.75rem 0;
          }
          .tiptap-editor a {
            color: var(--primary-400);
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .tiptap-editor p {
            margin: 0.35rem 0;
          }
          .tiptap-editor h1,
          .tiptap-editor h2,
          .tiptap-editor h3 {
            margin: 0.6rem 0 0.35rem;
            line-height: 1.25;
            font-weight: 700;
          }
          .tiptap-editor.ProseMirror-focused {
            outline: none;
          }
        `}</style>
      </div>
    </div>
  );
}
