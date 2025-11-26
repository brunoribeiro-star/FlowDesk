"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Pencil,
  SlidersHorizontal,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type QuestionType = "short" | "long" | "single" | "multi";

type LocalQuestion = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: QuestionType;
  opcoes: string[];
  obrigatorio: boolean;
};

function mapTipoToDb(tipo: QuestionType) {
  if (tipo === "short") return "short_text";
  if (tipo === "long") return "long_text";
  if (tipo === "single") return "multiple_choice";
  return "checkboxes";
}

export default function NovoBriefingPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const [cardBgColor, setCardBgColor] = useState("#0f172a");
  const [cardTextColor, setCardTextColor] = useState("#ffffff");

  const [questions, setQuestions] = useState<LocalQuestion[]>([
    {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      titulo: "",
      descricao: "",
      tipo: "short",
      opcoes: [],
      obrigatorio: false,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function carregarUser() {
      const { data } = await supabase.auth.getUser();
      const u = data?.user || null;
      setUser(u);
      setLoadingUser(false);
      if (!u) router.push("/login");
    }
    carregarUser();
  }, [router]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";

  function createEmptyQuestion(): LocalQuestion {
    return {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      titulo: "",
      descricao: "",
      tipo: "short",
      opcoes: [],
      obrigatorio: false,
    };
  }

  function handleAddQuestion() {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  }

  function handleDuplicateQuestion(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx === -1) return prev;
      const original = prev[idx];
      const clone: LocalQuestion = {
        ...original,
        id: String(Date.now()) + Math.random().toString(36).slice(2),
      };
      const novo = [...prev];
      novo.splice(idx + 1, 0, clone);
      return novo;
    });
  }

  function handleRemoveQuestion(qid: string) {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((q) => q.id !== qid);
    });
  }

  function handleMoveUp(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx <= 0) return prev;
      const novo = [...prev];
      const [item] = novo.splice(idx, 1);
      novo.splice(idx - 1, 0, item);
      return novo;
    });
  }

  function handleMoveDown(qid: string) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === qid);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const novo = [...prev];
      const [item] = novo.splice(idx, 1);
      novo.splice(idx + 1, 0, item);
      return novo;
    });
  }

  function updateQuestion(
    qid: string,
    patch: Partial<Omit<LocalQuestion, "id">>
  ) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, ...patch } : q))
    );
  }

  function handleChangeTipo(qid: string, value: string) {
    const tipo: QuestionType =
      value === "short"
        ? "short"
        : value === "long"
        ? "long"
        : value === "single"
        ? "single"
        : "multi";

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        let opcoes = q.opcoes;
        if ((tipo === "single" || tipo === "multi") && opcoes.length === 0) {
          opcoes = ["Opção 1"];
        }
        return { ...q, tipo, opcoes };
      })
    );
  }

  function addOpcao(qid: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const nextIndex = q.opcoes.length + 1;
        return {
          ...q,
          opcoes: [...q.opcoes, `Opção ${nextIndex}`],
        };
      })
    );
  }

  function updateOpcao(qid: string, index: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opcoes = [...q.opcoes];
        opcoes[index] = value;
        return { ...q, opcoes };
      })
    );
  }

  function removeOpcao(qid: string, index: number) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opcoes = q.opcoes.filter((_, i) => i !== index);
        return { ...q, opcoes };
      })
    );
  }

  async function handleSave() {
    if (!user) {
      setFormError("Usuário não autenticado.");
      return;
    }

    const tituloTrim = titulo.trim();
    if (!tituloTrim) {
      setFormError("Dê um nome ao briefing.");
      return;
    }

    const perguntasValidas = questions.filter(
      (q) => q.titulo.trim().length > 0
    );
    if (perguntasValidas.length === 0) {
      setFormError("Crie pelo menos uma pergunta com título preenchido.");
      return;
    }

    setFormError(null);
    setSaving(true);

    try {
      const { data: templateData, error: tplError } = await supabase
        .from("briefings_templates")
        .insert({
          user_id: user.id,
          titulo: tituloTrim,
          descricao: descricao.trim() || null,
          updated_at: new Date().toISOString(),
          card_bg_color: cardBgColor || "#0f172a",
          card_text_color: cardTextColor || "#ffffff",
        })
        .select("id")
        .single();

      if (tplError || !templateData) {
        setFormError(tplError?.message || "Erro ao criar template.");
        setSaving(false);
        return;
      }

      const templateId = String(templateData.id);

      const payloadCampos = questions.map((q, index) => ({
        user_id: user.id,
        template_id: templateId,
        ordem: index + 1,
        tipo: mapTipoToDb(q.tipo),
        titulo_pergunta: q.titulo.trim(),
        descricao_pergunta: q.descricao.trim() || null,
        opcoes:
          (q.tipo === "single" || q.tipo === "multi") && q.opcoes.length > 0
            ? q.opcoes
            : null,
        obrigatorio: q.obrigatorio,
      }));

      const { error: camposError } = await supabase
        .from("briefings_campos")
        .insert(payloadCampos);

      if (camposError) {
        setFormError(
          camposError.message || "Erro ao salvar campos do briefing."
        );
        setSaving(false);
        return;
      }

      setShowSuccessModal(true);
      setSaving(false);
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado ao salvar briefing.");
      setSaving(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex items-center justify-center text-[18px]">
        Carregando...
      </div>
    );
  }

  return (
    <>
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-primary-800 border border-primary-600 rounded-2xl p-8 w-[90%] max-w-md text-center flex flex-col gap-6 animate-fade-in">
            <h2 className="text-[22px] font-semibold text-primary-50">
              Briefing criado com sucesso!
            </h2>

            <button
              onClick={() => router.push("/dashboard/briefings")}
              className="px-6 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

        <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
          <header className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard/briefings")}
                className="flex items-center gap-2 px-3 py-2 border border-primary-700 text-gray-300 rounded-lg hover:bg-primary-800 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="text-[14px]">Voltar</span>
              </button>

              <div className="flex flex-col">
                <h1 className="text-[28px] md:text-[32px] font-semibold text-gray-100">
                  Novo briefing
                </h1>
                <p className="text-[15px] md:text-[16px] text-gray-300">
                  Monte um formulário no estilo Google Forms para enviar aos seus
                  clientes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`rounded-lg px-6 py-2.5 text-[15px] font-semibold transition-colors ${
                  saving
                    ? "bg-primary-700 text-primary-100 cursor-not-allowed"
                    : "bg-primary-500 hover:bg-primary-300 text-primary-900"
                }`}
              >
                {saving ? "Salvando..." : "Salvar briefing"}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-primary-800 border border-primary-700/70 transition-colors"
                >
                  <Image
                    src={avatarSrc}
                    alt="Perfil"
                    width={35}
                    height={35}
                    className="rounded-full object-cover border border-primary-600"
                  />

                  {profileOpen ? (
                    <ChevronUp size={18} className="text-primary-100" />
                  ) : (
                    <ChevronDown size={18} className="text-primary-100" />
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-primary-800 border border-primary-600 rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-fade-in">
                    <button
                      className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/dashboard/perfil");
                      }}
                    >
                      <Pencil size={20} className="text-primary-200" />
                      Editar perfil
                    </button>

                    <button
                      className="flex items-center gap-3 text-gray-200 hover:text-primary-100"
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/dashboard/tema");
                      }}
                    >
                      <SlidersHorizontal size={20} className="text-primary-200" />
                      Personalizar tema
                    </button>

                    <button className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300">
                      <Crown size={20} />
                      Assinatura
                    </button>

                    <button
                      className="flex items-center gap-3 text-red-400 hover:text-red-300 pt-2"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push("/login");
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sair da plataforma
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {formError && (
            <div className="px-4 py-2 rounded-lg bg-rose-900/40 border border-rose-500/70 text-rose-100 text-[14px]">
              {formError}
            </div>
          )}

          <section className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full bg-primary-900/60 border border-primary-700 rounded-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-primary-700 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título do briefing"
                    className="bg-transparent border-b border-primary-600 focus:border-primary-400 outline-none text-[22px] md:text-[24px] text-gray-100 pb-1"
                  />
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descrição ou instruções para o cliente (opcional)"
                    rows={2}
                    className="bg-transparent resize-none outline-none text-[14px] text-gray-300 placeholder-gray-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-primary-700 bg-primary-900/70">
                    <div
                      className="px-3 py-1 rounded-lg text-[12px] font-medium max-w-[220px] truncate"
                      style={{
                        backgroundColor: cardBgColor,
                        color: cardTextColor,
                      }}
                    >
                      {titulo || "Título do briefing"}
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Campos: {questions.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-300">
                        Cor de fundo do card
                      </span>
                      <input
                        type="color"
                        value={cardBgColor}
                        onChange={(e) => setCardBgColor(e.target.value)}
                        className="w-8 h-8 rounded-md border border-primary-700 bg-transparent cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-300">
                        Cor do título
                      </span>
                      <input
                        type="color"
                        value={cardTextColor}
                        onChange={(e) => setCardTextColor(e.target.value)}
                        className="w-8 h-8 rounded-md border border-primary-700 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto novo-briefing-scroll px-6 py-5 flex flex-col gap-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-primary-800 border border-primary-700 rounded-2xl px-4 py-4 flex flex-col gap-4 shadow-[0_0_0_1px_rgba(15,23,42,0.8)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(q.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary-700 text-gray-400 text-[11px]"
                        >
                          ▲
                        </button>
                        <span className="text-[11px] text-gray-500">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(q.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary-700 text-gray-400 text-[11px]"
                        >
                          ▼
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-3 items-start">
                          <input
                            value={q.titulo}
                            onChange={(e) =>
                              updateQuestion(q.id, { titulo: e.target.value })
                            }
                            placeholder="Pergunta"
                            className="flex-1 min-w-[180px] bg-transparent border-b border-primary-600 focus:border-primary-400 outline-none text-[15px] text-gray-100 pb-1"
                          />

                          <div className="relative w-[210px]">
                            <select
                              value={q.tipo}
                              onChange={(e) =>
                                handleChangeTipo(q.id, e.target.value)
                              }
                              className="w-full bg-primary-900 border border-primary-700 rounded-lg px-3 py-2 pr-9 text-[13px] text-gray-100 appearance-none"
                            >
                              <option value="short">Resposta curta</option>
                              <option value="long">Parágrafo</option>
                              <option value="single">Múltipla escolha</option>
                              <option value="multi">
                                Caixas de seleção (múltiplas)
                              </option>
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]">
                              ▼
                            </span>
                          </div>
                        </div>

                        <input
                          value={q.descricao}
                          onChange={(e) =>
                            updateQuestion(q.id, { descricao: e.target.value })
                          }
                          placeholder="Descrição da pergunta (opcional)"
                          className="bg-transparent outline-none text-[13px] text-gray-300 placeholder-gray-500"
                        />

                        {(q.tipo === "single" || q.tipo === "multi") && (
                          <div className="flex flex-col gap-2 mt-1">
                            {q.opcoes.map((op, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 group"
                              >
                                <div className="w-4 flex items-center justify-center">
                                  {q.tipo === "single" ? (
                                    <div className="w-3.5 h-3.5 rounded-full border border-gray-500" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-[4px] border border-gray-500" />
                                  )}
                                </div>
                                <input
                                  value={op}
                                  onChange={(e) =>
                                    updateOpcao(q.id, index, e.target.value)
                                  }
                                  placeholder={`Opção ${index + 1}`}
                                  className="flex-1 bg-transparent border-b border-transparent group-hover:border-primary-600 focus:border-primary-400 outline-none text-[13px] text-gray-100 pb-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOpcao(q.id, index)}
                                  className="text-[11px] text-gray-500 hover:text-rose-400 px-2 py-1 rounded-md hover:bg-primary-900/70"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => addOpcao(q.id)}
                              className="mt-1 w-fit text-[13px] text-primary-200 hover:text-primary-50 px-2 py-1 rounded-md hover:bg-primary-900/70"
                            >
                              + Adicionar opção
                            </button>
                          </div>
                        )}

                        {(q.tipo === "short" || q.tipo === "long") && (
                          <div className="mt-1">
                            {q.tipo === "short" ? (
                              <div className="w-full max-w-xs h-10 rounded-lg border border-primary-700 bg-primary-900/60 flex items-center px-3 text-[12px] text-gray-400">
                                Campo de resposta curta de exemplo
                              </div>
                            ) : (
                              <div className="w-full max-w-[420px] h-20 rounded-lg border border-primary-700 bg-primary-900/60 flex items-start px-3 py-2 text-[12px] text-gray-400">
                                Campo de resposta longa de exemplo
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2 text-[12px] text-gray-300">
                          <span>Obrigatória</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(q.id, {
                                obrigatorio: !q.obrigatorio,
                              })
                            }
                            className={`w-9 h-5 rounded-full flex items-center px-[2px] transition-colors ${
                              q.obrigatorio
                                ? "bg-primary-500"
                                : "bg-primary-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-primary-900 shadow-sm transform transition-transform ${
                                q.obrigatorio
                                  ? "translate-x-4"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q.id)}
                            className="px-2 py-1 rounded-md text-[12px] text-gray-300 hover:text-primary-50 hover:bg-primary-700/70"
                          >
                            Duplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="px-2 py-1 rounded-md text-[12px] text-rose-300 hover:text-rose-100 hover:bg-rose-900/40"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-dashed border-primary-600 text-[14px] text-primary-100 hover:bg-primary-800/60"
                >
                  <span className="text-[18px] leading-none">＋</span>
                  <span>Adicionar pergunta</span>
                </button>
              </div>
            </div>
          </section>

          <style jsx global>{`
            .novo-briefing-scroll::-webkit-scrollbar {
              width: 10px;
            }
            .novo-briefing-scroll::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.9);
            }
            .novo-briefing-scroll::-webkit-scrollbar-thumb {
              background: var(--primary-500);
              border-radius: 999px;
              border: 2px solid rgba(15, 23, 42, 0.9);
            }
            .novo-briefing-scroll::-webkit-scrollbar-thumb:hover {
              background: var(--primary-400);
            }
            .novo-briefing-scroll {
              scrollbar-width: thin;
              scrollbar-color: var(--primary-500) rgba(15, 23, 42, 0.9);
            }
            .animate-fade-in {
              animation: fadeIn 0.15s ease-out forwards;
            }
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-4px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}