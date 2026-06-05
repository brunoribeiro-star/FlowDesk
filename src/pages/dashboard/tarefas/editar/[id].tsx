"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { updateTask } from "@/lib/supabaseQueries/tasks";
import { calcularUrgencia } from "@/lib/utils";
import DatePicker from "@/components/DatePicker";

import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { ArrowLeft, X } from "lucide-react";

interface Task {
  id: string;
  titulo: string;
  descricao: any;
  projeto_id: string | null;
  status: "para_fazer" | "concluida" | string;
  due_date: string | null;
  created_at: string;
}

interface Projeto {
  id: string;
  titulo: string;
}

interface Subtask {
  id?: string;
  titulo: string;
  concluida: boolean;
}

type UrgenciaOption = "" | "Baixa" | "Normal" | "Urgente" | "Muito urgente";

export default function EditarTarefaPage() {
  const { id } = useParams();
  const router = useRouter();
  const taskId = Array.isArray(id) ? id[0] : (id as string);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [task,     setTask]     = useState<Task | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);

  const [subtarefas,        setSubtarefas]        = useState<Subtask[]>([]);
  const [deletedSubtaskIds, setDeletedSubtaskIds] = useState<string[]>([]);
  const [urgencia,          setUrgencia]          = useState<UrgenciaOption>("");

  const [dirty,   setDirty]   = useState(false);
  const [userId,  setUserId]  = useState<string | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl,       setLinkUrl]       = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "<p></p>",
    autofocus: false,
    immediatelyRender: false,
    onUpdate: () => { setDirty(true); },
  });

  async function carregarDados() {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const [
        { data: taskDb, error: taskError },
        { data: projetosDb },
        { data: subtasksDb },
      ] = await Promise.all([
        supabase.from("tasks")
          .select("id, titulo, descricao, status, due_date, projeto_id, user_id, concluida, created_at")
          .eq("id", taskId).eq("user_id", user.id).single(),
        supabase.from("projetos").select("id, titulo")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("subtasks").select("id, titulo, concluida")
          .eq("task_id", taskId).eq("user_id", user.id)
          .order("created_at", { ascending: true }),
      ]);

      setLoadingProjetos(false);
      setProjetos(projetosDb || []);

      if (taskError || !taskDb) { setTask(null); setLoading(false); return; }

      setTask(taskDb as Task);

      const mapped: Subtask[] = (subtasksDb || []).map((st: any) => ({
        id: st.id, titulo: st.titulo, concluida: !!st.concluida,
      }));
      setSubtarefas([...mapped, { titulo: "", concluida: false }]);

      if (taskDb.due_date) {
        const u = calcularUrgencia(taskDb.due_date);
        if (u === "Baixa" || u === "Normal" || u === "Urgente" || u === "Muito urgente") {
          setUrgencia(u as UrgenciaOption);
        }
      }

      setDirty(false);
      setDeletedSubtaskIds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregarDados(); }, [taskId]);

  useEffect(() => {
    if (!task || !editor) return;
    const desc = task.descricao;
    try {
      if (desc && typeof desc === "object") {
        editor.commands.setContent(desc);
      } else if (typeof desc === "string" && desc.trim()) {
        try {
          const parsed = JSON.parse(desc);
          if (parsed?.type && parsed?.content) editor.commands.setContent(parsed);
          else editor.commands.setContent(`<p>${desc}</p>`);
        } catch { editor.commands.setContent(`<p>${desc}</p>`); }
      } else {
        editor.commands.setContent("<p></p>");
      }
    } catch { editor.commands.setContent("<p></p>"); }
    setDirty(false);
  }, [task, editor]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault(); e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleSubtarefaTituloChange(index: number, value: string) {
    setSubtarefas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], titulo: value };
      if (index === copia.length - 1 && value.trim() !== "") {
        copia.push({ titulo: "", concluida: false });
      }
      return copia;
    });
    setDirty(true);
  }

  function handleToggleSubtarefaConcluida(index: number) {
    setSubtarefas((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], concluida: !copia[index].concluida };
      return copia;
    });
    setDirty(true);
  }

  function handleRemoverSubtarefa(index: number) {
    setSubtarefas((prev) => {
      const copia = [...prev];
      const alvo = copia[index];
      if (alvo.id) {
        setDeletedSubtaskIds((prevIds) =>
          prevIds.includes(alvo.id!) ? prevIds : [...prevIds, alvo.id!]
        );
      }
      copia.splice(index, 1);
      if (copia.length === 0 || copia[copia.length - 1].titulo.trim() !== "") {
        copia.push({ titulo: "", concluida: false });
      }
      return copia;
    });
    setDirty(true);
  }

  function openLinkModal() {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link")?.href || "");
    setLinkModalOpen(true);
  }

  function handleConfirmLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    }
    setLinkModalOpen(false);
  }

  function handleRemoveLink() {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }

  async function handleSalvar() {
    if (!task || !editor || !userId) return;
    setSaving(true);
    try {
      const jsonContent = editor.getJSON();
      const isDone = task.status === "concluida";

      await updateTask(task.id, {
        titulo: task.titulo,
        descricao: jsonContent,
        projeto_id: task.projeto_id,
        due_date: task.due_date,
        status: task.status,
        concluida: isDone,
      } as any);

      const validSubs = subtarefas
        .map((s) => ({ ...s, titulo: s.titulo.trim() }))
        .filter((s) => s.titulo.length > 0);

      const toUpdate = validSubs.filter((s) => s.id);
      const toInsert = validSubs.filter((s) => !s.id);

      if (deletedSubtaskIds.length > 0) {
        await supabase.from("subtasks").delete()
          .in("id", deletedSubtaskIds).eq("user_id", userId);
      }
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((s) =>
            supabase.from("subtasks")
              .update({ titulo: s.titulo, concluida: s.concluida, updated_at: new Date().toISOString() })
              .eq("id", s.id).eq("user_id", userId)
          )
        );
      }
      if (toInsert.length > 0) {
        await Promise.all(
          toInsert.map((s) =>
            supabase.from("subtasks").insert({
              user_id: userId, task_id: task.id,
              titulo: s.titulo, concluida: s.concluida,
            })
          )
        );
      }

      setDirty(false);
      router.push(`/dashboard/tarefas/${task.id}`);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar alterações da tarefa.");
    } finally {
      setSaving(false);
    }
  }

  function handleVoltar() {
    if (dirty) {
      const confirmExit = confirm("Você tem alterações não salvas. Deseja sair assim mesmo?");
      if (!confirmExit) return;
    }
    router.push("/dashboard/tarefas");
  }

  if (loading || !editor || !task) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--primary-900)", color: "var(--gray-400)" }}>
        Carregando tarefa...
      </div>
    );
  }

  return (
    <>
      <div className="tk-new-page">

        <header className="tk-new-top">
          <button type="button" onClick={handleVoltar} className="tk-back-btn">
            <ArrowLeft size={17} />
            <span>Voltar</span>
          </button>

          <div className="flex flex-col">
            <span className="text-[22px] font-semibold" style={{ color: "var(--gray-100)", letterSpacing: "-0.01em" }}>
              Editar tarefa
            </span>
            <span className="text-[14px]" style={{ color: "var(--gray-500)" }}>
              Atualize os detalhes, subtarefas e descrição.
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            className="tk-btn-primary"
          >
            {saving ? (
              <>
                <span className="tk-spinner" />
                Salvando...
              </>
            ) : "Salvar alterações"}
          </button>
        </header>

        <main className="tk-new-body">

          <div className="flex items-start gap-4" style={{ marginBottom: 8 }}>
            <div className="tk-chk-lg" aria-hidden="true" />
            <input
              className="tk-name-input"
              placeholder="Nome da tarefa"
              value={task.titulo}
              onChange={(e) => { setTask({ ...task, titulo: e.target.value }); setDirty(true); }}
            />
          </div>

          <section style={{ marginBottom: 24 }}>
            <p className="tk-section-label">Subtarefas</p>
            <ul className="tk-subs-list">
              {subtarefas.map((sub, index) => {
                const isEmpty = sub.titulo.trim() === "";
                const isLast = index === subtarefas.length - 1;
                return (
                  <li key={sub.id || `new-${index}`} className="tk-sub-row">
                    <span className="tk-sub-grip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/>
                        <circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>
                        <circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>
                      </svg>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleSubtarefaConcluida(index)}
                      className={`tk-chk sq${sub.concluida ? " is-done" : ""}`}
                    >
                      {sub.concluida && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 12.5 4.5 4.5L19 7"/>
                        </svg>
                      )}
                    </button>
                    <input
                      className="tk-sub-input"
                      value={sub.titulo}
                      onChange={(e) => handleSubtarefaTituloChange(index, e.target.value)}
                      placeholder={isLast ? "Adicionar subtarefa..." : "Subtarefa"}
                      style={sub.concluida ? { textDecoration: "line-through", color: "var(--gray-500)" } : {}}
                    />
                    {!isEmpty && (
                      <button
                        type="button"
                        onClick={() => handleRemoverSubtarefa(index)}
                        className="tk-sub-remove"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="tk-new-grid" style={{ marginBottom: 28 }}>
            <div className="tk-field-col">
              <label className="tk-field-label">Projeto</label>
              <div className="tk-select-wrap">
                <select
                  className="tk-select-input flow-select"
                  value={task.projeto_id || ""}
                  onChange={(e) => { setTask({ ...task, projeto_id: e.target.value || null }); setDirty(true); }}
                >
                  <option value="">
                    {loadingProjetos ? "Carregando..." : "Selecionar projeto"}
                  </option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>{p.titulo}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            <div className="tk-field-col">
              <label className="tk-field-label">Urgência</label>
              <div className="tk-select-wrap">
                <select
                  className="tk-select-input flow-select"
                  value={urgencia}
                  onChange={(e) => setUrgencia(e.target.value as UrgenciaOption)}
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

            <div className="tk-field-col">
              <label className="tk-field-label">Vencimento</label>
              <DatePicker
                value={task.due_date || ""}
                onChange={(v) => { setTask({ ...task, due_date: v || null }); setDirty(true); }}
                placeholder="dd/mm/aaaa"
                buttonClassName="tk-date-btn"
              />
            </div>
          </div>

          <section>
            <p className="tk-section-label">Descrição / notas</p>
            <div className="tk-editor">
              <EditorMenuBar
                editor={editor}
                onOpenLinkModal={openLinkModal}
                onRemoveLink={handleRemoveLink}
              />
              <div className="tk-editor-content">
                <EditorContent editor={editor} className="tiptap" />
              </div>
            </div>
          </section>

        </main>
      </div>

      {linkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "var(--primary-800)",
              border: "1px solid var(--primary-600)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            }}>
            <h2 className="text-[18px] font-semibold mb-2" style={{ color: "var(--gray-100)" }}>
              Inserir link
            </h2>
            <p className="text-[14px] mb-4" style={{ color: "var(--gray-300)" }}>
              Cole a URL que deseja vincular ao texto selecionado.
            </p>
            <input
              autoFocus
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirmLink(); }}
              placeholder="https://..."
              className="w-full rounded-lg px-4 py-2.5 text-[14px] mb-5 outline-none"
              style={{
                background: "var(--primary-900)",
                border: "1px solid var(--primary-700)",
                color: "var(--gray-100)",
              }}
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[14px] transition-colors"
                style={{
                  background: "var(--primary-800)",
                  border: "1px solid var(--primary-600)",
                  color: "var(--gray-200)",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                className="tk-btn-primary"
                style={{ padding: "8px 18px", fontSize: 14 }}
              >
                Aplicar link
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* ── Page layout ── */
        .tk-new-page {
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
          background: var(--primary-900);
        }
        .tk-new-top {
          display: flex; align-items: center; gap: 20px;
          padding: 20px 36px 20px 32px;
          border-bottom: 1px solid var(--gray-800);
          flex-shrink: 0;
        }

        /* ── Back button ── */
        .tk-back-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 999px;
          border: 1px solid var(--gray-700); background: transparent;
          font-size: 14px; font-weight: 500; color: var(--gray-300);
          cursor: pointer; transition: border-color .2s, color .2s;
          flex-shrink: 0;
        }
        .tk-back-btn:hover { border-color: var(--gray-500); color: var(--gray-100); }

        /* ── Primary button ── */
        .tk-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 10px; border: none;
          font-family: inherit; font-size: 14px; font-weight: 600;
          color: var(--primary-900); cursor: pointer;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 60%);
          box-shadow: 0 8px 24px -10px rgba(30,182,232,0.6);
          transition: opacity .2s, box-shadow .2s;
          flex-shrink: 0;
        }
        .tk-btn-primary:hover { opacity: .9; }
        .tk-btn-primary:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
        .tk-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(0,0,0,0.2); border-top-color: var(--primary-900);
          animation: tkSpin .6s linear infinite; flex-shrink: 0;
        }
        @keyframes tkSpin { to { transform: rotate(360deg); } }

        /* ── Scrollable body ── */
        .tk-new-body {
          flex: 1; overflow-y: auto; padding: 32px 48px 40px;
          max-width: 1080px; width: 100%;
          margin: 0 auto; display: flex; flex-direction: column;
        }
        .tk-section-label {
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--gray-500);
          margin: 0 0 12px;
        }

        /* ── Large circle placeholder ── */
        .tk-chk-lg {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
          border: 2px solid var(--gray-700); margin-top: 6px;
        }

        /* ── Title input ── */
        .tk-name-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-size: 34px; font-weight: 700; line-height: 1.2;
          color: var(--gray-100); font-family: inherit;
          letter-spacing: -0.02em;
        }
        .tk-name-input::placeholder { color: var(--gray-700); }

        /* ── Subtasks ── */
        .tk-subs-list {
          list-style: none; margin: 0; padding: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .tk-sub-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 12px;
          border: 1px solid transparent;
          transition: background .15s, border-color .15s;
        }
        .tk-sub-row:hover {
          background: var(--primary-800);
          border-color: var(--gray-800);
        }
        .tk-sub-grip {
          color: var(--gray-700); cursor: grab; flex-shrink: 0;
          display: grid; place-items: center;
          transition: color .15s;
        }
        .tk-sub-row:hover .tk-sub-grip { color: var(--gray-500); }
        .tk-chk {
          flex-shrink: 0; display: grid; place-items: center;
          width: 22px; height: 22px; border-radius: 50%;
          border: 1.5px solid var(--gray-600); background: transparent;
          cursor: pointer; color: var(--primary-900);
          transition: border-color .2s, background .2s;
        }
        .tk-chk.sq { border-radius: 6px; }
        .tk-chk.is-done {
          border-color: var(--success-medium);
          background: var(--success-medium);
        }
        .tk-sub-input {
          flex: 1; background: transparent; border: none; outline: none;
          font-size: 15px; color: var(--gray-200); font-family: inherit;
        }
        .tk-sub-input::placeholder { color: var(--gray-600); }
        .tk-sub-remove {
          flex-shrink: 0; display: grid; place-items: center;
          width: 28px; height: 28px; border-radius: 8px; border: none;
          background: transparent; cursor: pointer;
          color: var(--gray-600); transition: color .15s, background .15s;
        }
        .tk-sub-remove:hover { color: var(--error-medium); background: rgba(239,68,68,0.08); }

        /* ── Fields grid ── */
        .tk-new-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .tk-field-col { display: flex; flex-direction: column; gap: 8px; }
        .tk-field-label {
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--gray-500);
        }
        .tk-select-wrap { position: relative; }
        .tk-select-input {
          width: 100%; height: 54px;
          border-radius: 13px; padding: 0 44px 0 16px;
          border: 1.5px solid var(--gray-700);
          background: var(--primary-800);
          font-size: 14px; font-weight: 500; color: var(--gray-100);
          font-family: inherit; cursor: pointer;
          transition: border-color .2s;
        }
        .tk-select-input:focus { outline: none; border-color: var(--primary-500); }
        .tk-select-wrap svg {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%); pointer-events: none;
        }
        .flow-select {
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
        }
        .tk-date-btn {
          width: 100%; height: 54px; border-radius: 13px;
          padding: 0 16px; border: 1.5px solid var(--gray-700);
          background: var(--primary-800);
          font-size: 14px; font-weight: 500; color: var(--gray-100);
          font-family: inherit; cursor: pointer; text-align: left;
          transition: border-color .2s; display: flex; align-items: center;
        }
        .tk-date-btn:focus { outline: none; border-color: var(--primary-500); }

        /* ── TipTap editor ── */
        .tk-editor {
          border-radius: 16px; overflow: hidden;
          border: 1.5px solid var(--gray-700);
          background: var(--primary-800);
        }
        .tk-ed-bar {
          display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
          padding: 10px 12px;
          background: var(--primary-700);
          border-bottom: 1px solid var(--gray-700);
        }
        .tk-tb {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 7px;
          border-radius: 8px; border: none; background: transparent;
          font-family: inherit; font-size: 13px; cursor: pointer;
          color: var(--gray-300); transition: background .15s, color .15s;
        }
        .tk-tb:hover { background: rgba(148,169,173,0.1); color: var(--gray-100); }
        .tk-tb.is-on { background: rgba(30,182,232,0.15); color: var(--primary-300); }
        .tk-tb-div {
          width: 1px; height: 20px; margin: 0 4px;
          background: var(--gray-700); flex-shrink: 0;
        }
        .tk-editor-content { padding: 16px 18px; }
        .tiptap { min-height: 180px; outline: none; font-size: 15px; color: var(--gray-100); }
        .tiptap p { margin-bottom: 0.4rem; }
        .tiptap h1 { font-size: 1.4rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
        .tiptap h2 { font-size: 1.2rem; font-weight: 600; margin: 0.7rem 0 0.35rem; }
        .tiptap h3 { font-size: 1.05rem; font-weight: 600; margin: 0.6rem 0 0.3rem; }
        .tiptap ul { list-style-type: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .tiptap blockquote {
          border-left: 3px solid var(--gray-600);
          padding-left: 0.75rem; margin: 0.5rem 0;
          color: var(--gray-300); font-style: italic;
        }
        .tiptap a { color: var(--primary-300); text-decoration: underline; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--gray-600); pointer-events: none; float: left; height: 0;
        }

        /* ── Scrollbar ── */
        .tk-new-body::-webkit-scrollbar { width: 5px; }
        .tk-new-body::-webkit-scrollbar-thumb { background: var(--gray-700); border-radius: 999px; }
      `}</style>
    </>
  );
}

function ChevronDown() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16} height={16}
      viewBox="0 0 24 24" fill="none"
      stroke="var(--gray-500)" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EditorMenuBar({
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
    const update = () => forceUpdate((v) => v + 1);
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

  const on = (fn: () => boolean) => fn() ? " is-on" : "";

  const headingValue = editor.isActive("heading", { level: 1 }) ? "h1"
    : editor.isActive("heading", { level: 2 }) ? "h2"
    : editor.isActive("heading", { level: 3 }) ? "h3"
    : "p";

  return (
    <div className="tk-ed-bar">
      <select
        className="tk-tb"
        style={{ paddingRight: 24, minWidth: 90, cursor: "pointer", border: "1px solid var(--gray-700)", background: "var(--primary-800)", borderRadius: 8 }}
        value={headingValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "h1") editor.chain().focus().setHeading({ level: 1 }).run();
          else if (v === "h2") editor.chain().focus().setHeading({ level: 2 }).run();
          else if (v === "h3") editor.chain().focus().setHeading({ level: 3 }).run();
          else editor.chain().focus().setParagraph().run();
        }}
      >
        <option value="p">Normal</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2</option>
        <option value="h3">Título 3</option>
      </select>

      <span className="tk-tb-div" />

      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`tk-tb${on(() => editor.isActive("bold"))}`}>
        <b>B</b>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`tk-tb${on(() => editor.isActive("italic"))}`}>
        <i>I</i>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`tk-tb${on(() => editor.isActive("underline"))}`}>
        <u>U</u>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={`tk-tb${on(() => editor.isActive("strike"))}`}>
        <s>S</s>
      </button>

      <span className="tk-tb-div" />

      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`tk-tb${on(() => editor.isActive("bulletList"))}`} title="Lista">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="7" r="1.4"/><circle cx="6" cy="12" r="1.4"/><circle cx="6" cy="17" r="1.4"/>
          <line x1="10" y1="7" x2="18" y2="7"/><line x1="10" y1="12" x2="18" y2="12"/><line x1="10" y1="17" x2="18" y2="17"/>
        </svg>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`tk-tb${on(() => editor.isActive("orderedList"))}`} title="Lista numerada">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 6l1.2-2H4"/><path d="M5 11h1"/><path d="M4.5 16.5h2L4.5 19h2"/>
          <line x1="10" y1="7" x2="18" y2="7"/><line x1="10" y1="12" x2="18" y2="12"/><line x1="10" y1="17" x2="18" y2="17"/>
        </svg>
      </button>

      <span className="tk-tb-div" />

      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`tk-tb${on(() => editor.isActive("blockquote"))}`} title="Citação">
        <span style={{ fontSize: 12 }}>"</span>
      </button>
      <button type="button" onClick={onOpenLinkModal} className={`tk-tb${on(() => editor.isActive("link"))}`} title="Link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 12.75 13 8.25a2.5 2.5 0 1 1 3.54 3.54l-6.01 6.01a3.75 3.75 0 1 1-5.3-5.3l4.25-4.25"/>
        </svg>
      </button>
      <button type="button" onClick={onRemoveLink} className="tk-tb" title="Remover link" style={{ fontSize: 11 }}>
        Remover
      </button>
    </div>
  );
}
