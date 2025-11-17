"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { addTask } from "@/lib/supabaseQueries/tasks";

import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";

interface Projeto {
  id: string;
  titulo: string;
}

type UrgenciaOption = "" | "Baixa" | "Normal" | "Urgente" | "Muito urgente";

export default function NovaTarefaPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);

  const [titulo, setTitulo] = useState("");
  const [subtarefas, setSubtarefas] = useState<string[]>([""]);
  const [projetoId, setProjetoId] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaOption>("");
  const [vencimento, setVencimento] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: "",
    autofocus: false,
    immediatelyRender: false,
  });

  useEffect(() => {
    async function carregarProjetos() {
      try {
        setLoadingProjetos(true);
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          router.push("/login");
          return;
        }

        const { data } = await supabase
          .from("projetos")
          .select("id, titulo")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setProjetos(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProjetos(false);
      }
    }

    carregarProjetos();
  }, [router]);

  function handleSubtarefaChange(index: number, value: string) {
    const copia = [...subtarefas];
    copia[index] = value;
    setSubtarefas(copia);

    if (index === subtarefas.length - 1 && value.trim() !== "") {
      setSubtarefas([...copia, ""]);
    }
  }

  function handleRemoverSubtarefa(index: number) {
    if (subtarefas.length === 1) {
      setSubtarefas([""]);
      return;
    }
    const nova = subtarefas.filter((_, i) => i !== index);
    setSubtarefas(nova.length ? nova : [""]);
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      alert("Informe o nome da tarefa.");
      return;
    }
    if (!projetoId) {
      alert("Selecione um projeto.");
      return;
    }

    try {
      setSalvando(true);

      const jsonContent = editor?.getJSON();
      const plainText = editor?.getText().trim() || "";

      const subtarefasValidas = subtarefas
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      await addTask({
        titulo,
        descricao: editor?.getJSON(),
        projeto_id: projetoId,
        due_date: vencimento || null,
      } as any);

      console.log("Conteúdo rich JSON da tarefa:", jsonContent);
      console.log("Subtarefas:", subtarefasValidas);
      console.log("Urgência:", urgencia);

      router.push("/dashboard/tarefas");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar tarefa.");
    } finally {
      setSalvando(false);
    }
  }

  function handleVoltar() {
    router.push("/dashboard/tarefas");
  }

  function openLinkModal() {
    if (!editor) return;
    const attrs = editor.getAttributes("link");
    const currentHref = attrs?.href || "";
    setLinkUrl(currentHref);
    setLinkModalOpen(true);
  }

  function handleConfirmLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    }
    setLinkModalOpen(false);
  }

  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleVoltar}
              className="w-9 h-9 rounded-full border border-primary-700 flex items-center justify-center text-gray-300 hover:bg-primary-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex flex-col">
              <span className="text-[26px] text-gray-100 font-semibold">
                Nova tarefa
              </span>
              <span className="text-[15px] text-gray-400">
                Defina os detalhes da tarefa e organize subtarefas, projeto e
                vencimento.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVoltar}
              className="px-5 py-2.5 rounded-lg border border-primary-700 text-gray-200 text-[15px] hover:bg-primary-800"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              className="px-6 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvando ? "Salvando..." : "Salvar tarefa"}
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-8 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] text-gray-300 mb-1">
                  Nome da tarefa
                </label>
                <input
                  placeholder="Ex: Finalizar protótipo da landing page"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100 placeholder-gray-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-gray-300">
                  Subtarefas <span className="text-gray-500">(opcional)</span>
                </span>

                <div className="flex flex-col gap-2">
                  {subtarefas.map((sub, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-primary-900 border border-primary-700 rounded-xl px-4 py-2.5"
                    >
                      <span className="text-gray-500 cursor-grab select-none">
                        ⋮⋮
                      </span>

                      <div className="w-4 h-4 rounded-full border border-gray-600" />

                      <input
                        value={sub}
                        onChange={(e) =>
                          handleSubtarefaChange(index, e.target.value)
                        }
                        placeholder={
                          index === 0
                            ? "Nome da subtarefa"
                            : "Outra subtarefa..."
                        }
                        className="flex-1 bg-transparent outline-none text-[14px] text-gray-100 placeholder-gray-500"
                      />

                      {subtarefas.length > 1 && sub.trim() !== "" && (
                        <button
                          type="button"
                          onClick={() => handleRemoverSubtarefa(index)}
                          className="text-gray-500 hover:text-red-400 text-[13px]"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[2fr,1.2fr,1.2fr] gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-300">Projeto</label>
                <div className="relative">
                  <select
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                  >
                    <option value="">
                      {loadingProjetos
                        ? "Carregando projetos..."
                        : "Selecionar"}
                    </option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.titulo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-300">Urgência</label>
                <div className="relative">
                  <select
                    value={urgencia}
                    onChange={(e) =>
                      setUrgencia(e.target.value as UrgenciaOption)
                    }
                    className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                  >
                    <option value="">Selecionar</option>
                    <option value="Baixa">Baixa</option>
                    <option value="Normal">Normal</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Muito urgente">Muito urgente</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-gray-300">Vencimento</label>
                <div className="relative">
                  <input
                    type="date"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100"
                  />
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M7 2a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V3a1 1 0 1 0-2 0v1H9V3a1 1 0 0 0-1-1Zm-2 8h14v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-gray-300">
                Descrição / notas
              </span>

              <div className="bg-primary-900 border border-primary-700 rounded-xl overflow-hidden">
                {editor && (
                  <EditorToolbar
                    editor={editor}
                    onOpenLinkModal={openLinkModal}
                    onRemoveLink={handleRemoveLink}
                  />
                )}

                <div className="border-t border-primary-700">
                  {editor && (
                    <EditorContent
                      editor={editor}
                      className="tiptap px-4 py-3 text-[15px] text-gray-100 custom-editor"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {linkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-md rounded-2xl bg-primary-800 border border-primary-600 shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6">
              <h2 className="text-[18px] text-gray-100 font-semibold mb-3">
                Inserir link
              </h2>
              <p className="text-[14px] text-gray-300 mb-4">
                Cole a URL que deseja vincular ao texto selecionado.
              </p>

              <input
                autoFocus
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-primary-900 border border-primary-700 rounded-lg px-4 py-2.5 text-[14px] text-gray-100 placeholder-gray-500 mb-5"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLink}
                  className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold text-[14px]"
                >
                  Aplicar link
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background-color: var(--primary-800);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: var(--primary-500);
            border-radius: 9999px;
            border: 2px solid var(--primary-800);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: var(--primary-400);
          }

          .tiptap {
            min-height: 160px;
            outline: none;
          }
          .tiptap p {
            margin-bottom: 0.4rem;
          }
          .tiptap h1 {
            font-size: 1.4rem;
            font-weight: 600;
            margin: 0.75rem 0 0.4rem;
          }
          .tiptap h2 {
            font-size: 1.2rem;
            font-weight: 600;
            margin: 0.7rem 0 0.35rem;
          }
          .tiptap h3 {
            font-size: 1.05rem;
            font-weight: 600;
            margin: 0.6rem 0 0.3rem;
          }
          .tiptap ul {
            list-style-type: disc;
            padding-left: 1.25rem;
            margin: 0.25rem 0;
          }
          .tiptap ol {
            list-style-type: decimal;
            padding-left: 1.25rem;
            margin: 0.25rem 0;
          }
          .tiptap blockquote {
            border-left: 3px solid rgba(148, 163, 184, 0.8);
            padding-left: 0.75rem;
            margin: 0.5rem 0;
            color: #e5e7eb;
            font-style: italic;
          }
          .tiptap a {
            color: #38bdf8;
            text-decoration: underline;
          }

          /* Remove seta nativa dos selects só nesta página */
          .flow-select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: none;
          }
        `}</style>
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EditorToolbar({
  editor,
  onOpenLinkModal,
  onRemoveLink,
}: {
  editor: Editor;
  onOpenLinkModal: () => void;
  onRemoveLink: () => void;
}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      forceUpdate((v) => v + 1);
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("update", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("update", update);
    };
  }, [editor]);

  if (!editor) return null;

  const isActiveClass = (fn: () => boolean) =>
    fn()
      ? "bg-primary-700 text-primary-100"
      : "text-gray-300";

  const buttonBase =
    "px-2.5 py-1.5 text-[13px] rounded-md border border-transparent hover:bg-primary-800 flex items-center justify-center gap-1";

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "p";

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary-900/80">
      <select
        className="bg-primary-800 border border-primary-700 rounded-md px-3 pr-7 py-1.5 text-[13px] text-gray-100 cursor-pointer"
        value={headingValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "h1") {
            editor.chain().focus().setHeading({ level: 1 }).run();
          } else if (value === "h2") {
            editor.chain().focus().setHeading({ level: 2 }).run();
          } else if (value === "h3") {
            editor.chain().focus().setHeading({ level: 3 }).run();
          } else {
            editor.chain().focus().setParagraph().run();
          }
        }}
      >
        <option value="p">Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("bold"))}`}
      >
        <span className="font-semibold">B</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("italic")
        )}`}
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("underline")
        )}`}
      >
        <span className="underline">U</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("strike")
        )}`}
      >
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("bulletList")
        )}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="7" r="1.4" />
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="6" cy="17" r="1.4" />
          <line x1="10" y1="7" x2="18" y2="7" />
          <line x1="10" y1="12" x2="18" y2="12" />
          <line x1="10" y1="17" x2="18" y2="17" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("orderedList")
        )}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 6l1.2-2H4" />
          <path d="M5 11h1" />
          <path d="M4.5 16.5h2L4.5 19h2" />
          <line x1="10" y1="7" x2="18" y2="7" />
          <line x1="10" y1="12" x2="18" y2="12" />
          <line x1="10" y1="17" x2="18" y2="17" />
        </svg>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${buttonBase} ${isActiveClass(() =>
          editor.isActive("blockquote")
        )}`}
      >
        <span className="text-[12px]">“”</span>
      </button>

      <button
        type="button"
        onClick={onOpenLinkModal}
        className={`${buttonBase} ${
          editor.isActive("link")
            ? "bg-primary-700 text-primary-100"
            : "text-gray-300"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 12.75 13 8.25a2.5 2.5 0 1 1 3.54 3.54l-6.01 6.01a3.75 3.75 0 1 1-5.3-5.3l4.25-4.25" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onRemoveLink}
        className={buttonBase + " text-gray-400 hover:text-primary-100"}
      >
        <span className="text-[11px]">Remover</span>
      </button>
    </div>
  );
}
