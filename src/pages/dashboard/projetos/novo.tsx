"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Heading from "@tiptap/extension-heading";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { getClientes } from "@/lib/supabaseQueries/clientes";

interface FormProjeto {
  titulo: string;
  descricao: string;
  tipo: string;
  cliente_id: string | null;
  orcamento: string;
  data_inicio: string;
  prazo_entrega: string;
  status: string;
  progresso: number;
  link_arquivos: string;
  etapa_atual: string;
  notas_internas: string;
  forma_pagamento: "pix" | "pix_2x" | "cartao";
}

export default function NovoProjetoPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  const [form, setForm] = useState<FormProjeto>({
    titulo: "",
    descricao: "",
    tipo: "",
    cliente_id: null,
    orcamento: "",
    data_inicio: "",
    prazo_entrega: "",
    status: "Em andamento",
    progresso: 0,
    link_arquivos: "",
    etapa_atual: "",
    notas_internas: "",
    forma_pagamento: "pix",
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const handleCoverChange = (file: File | null) => {
    if (!file) {
      setCoverFile(null);
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showPopup("❌ Envie um arquivo de imagem (png, jpg, webp).", "error");
      return;
    }

    const maxMb = 6;
    if (file.size > maxMb * 1024 * 1024) {
      showPopup(`❌ A imagem é muito grande. Máximo: ${maxMb}MB.`, "error");
      return;
    }

    setCoverFile(file);
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  async function uploadProjectCover(userId: string, projectId: string) {
    if (!coverFile) return null;

    setCoverUploading(true);
    try {
      const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "jpg";

      const filePath = `${userId}/${projectId}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-covers")
        .upload(filePath, coverFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: coverFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("project-covers").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl || null;

      return publicUrl;
    } finally {
      setCoverUploading(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: "",
    autofocus: false,
    immediatelyRender: false,
  });

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    async function fetchClientes() {
      try {
        const data = await getClientes();
        setClientes(data);
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      }
    }
    fetchClientes();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : value,
    }));
  }

  function showPopup(message: string, type: "success" | "error" = "success") {
    setPopup({ message, type });
    setTimeout(() => setPopup({ message: "", type: null }), 2600);
  }

  async function criarPagamentos(projeto_id: string, user_id: string) {
    const valor = Number(form.orcamento);
    if (!valor || valor <= 0) return;

    const hoje = new Date().toISOString().slice(0, 10);

    if (form.forma_pagamento === "pix") {
      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor,
          forma_pagamento: "pix",
          parcela: 1,
          total_parcelas: 1,
          tipo: "único",
          status: "pago",
          data_pagamento: hoje,
          data_prevista: hoje,
        },
      ]);
    }

    if (form.forma_pagamento === "pix_2x") {
      const metade = valor / 2;

      await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor: metade,
          forma_pagamento: "pix_2x",
          parcela: 1,
          total_parcelas: 2,
          tipo: "entrada",
          status: "pago",
          data_pagamento: hoje,
          data_prevista: hoje,
        },
      ]);

      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor: metade,
          forma_pagamento: "pix_2x",
          parcela: 2,
          total_parcelas: 2,
          tipo: "restante",
          status: "pendente",
          data_prevista: form.prazo_entrega || null,
        },
      ]);
    }

    if (form.forma_pagamento === "cartao") {
      return await supabase.from("pagamentos").insert([
        {
          projeto_id,
          user_id,
          valor,
          forma_pagamento: "cartao",
          parcela: 1,
          total_parcelas: 1,
          tipo: "único",
          status: "pago",
          data_pagamento: hoje,
          data_prevista: hoje,
        },
      ]);
    }
  }

  function validarConclusaoAntes() {
    if (form.status !== "Concluído") return true;

    if (form.forma_pagamento === "pix_2x") {
      showPopup(
        "❌ O restante (50%) do pagamento ainda não foi feito. Não é possível concluir o projeto.",
        "error"
      );
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validarConclusaoAntes()) return;

    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) throw new Error("Usuário não autenticado");

      const descricaoJSON = editor ? editor.getJSON() : null;

      const { data, error } = await supabase
        .from("projetos")
        .insert([
          {
            titulo: form.titulo,
            descricao: descricaoJSON,
            cliente_id: form.cliente_id || null,
            tipo: form.tipo,
            orcamento: form.orcamento ? Number(form.orcamento) : null,
            data_inicio: form.data_inicio || null,
            prazo_entrega: form.prazo_entrega || null,
            status: form.status,
            progresso: 0,
            link_arquivos: form.link_arquivos,
            etapa_atual: form.etapa_atual,
            notas_internas: form.notas_internas || null,
            forma_pagamento: form.forma_pagamento,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (coverFile) {
        const publicUrl = await uploadProjectCover(user.id, data.id);
        if (publicUrl) {
          const { error: upErr } = await supabase
            .from("projetos")
            .update({ cover_url: publicUrl })
            .eq("id", data.id);

          if (upErr) {
            console.error(upErr);
            showPopup("⚠️ Projeto criado, mas falhou ao salvar a capa.", "error");
          }
        }
      }

      await criarPagamentos(data.id, user.id);

      showPopup("✨ Projeto criado com sucesso!", "success");

      setTimeout(() => router.push("/dashboard/projetos"), 1200);
    } catch (err: any) {
      showPopup("Erro ao criar projeto: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function handleCancelar() {
    router.push("/dashboard/projetos");
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

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      {popup.type && (
        <div
          className={`fixed top-6 right-6 px-6 py-4 rounded-lg shadow-lg z-[999] transition-all ${
            popup.type === "success"
              ? "bg-green-500 text-primary-900"
              : "bg-red-500 text-white"
          }`}
        >
          {popup.message}
        </div>
      )}

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 overflow-hidden">
        <header className="flex flex-col gap-1">
          <h1 className="text-[32px] text-gray-200 font-semibold">Novo Projeto</h1>
          <p className="text-[15px] text-gray-400">
            Preencha as etapas para cadastrar um novo projeto.
          </p>
        </header>

        <section className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
          <div className="bg-primary-800 border border-primary-700 rounded-2xl p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] text-gray-300 font-medium">
                {step === 1 && "Etapa 1 de 3 – Informações básicas"}
                {step === 2 && "Etapa 2 de 3 – Escopo, prazos e pagamento"}
                {step === 3 && "Etapa 3 de 3 – Links e observações"}
              </h2>
            </div>

            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Imagem de capa do projeto</span>

                  <div className="bg-primary-900 border border-primary-700 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-[140px] h-[90px] rounded-xl border border-primary-700 bg-primary-800/40 overflow-hidden flex items-center justify-center shrink-0">
                        {coverPreview ? (
                          <img
                            src={coverPreview}
                            alt="Capa do projeto"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-[12px] text-gray-500 px-3 text-center">
                            Sem capa
                          </div>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        <div className="text-[13px] text-gray-400">
                          PNG/JPG/WEBP. Recomendado: 1600×900.
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700 cursor-pointer">
                            {coverUploading ? "Enviando..." : "Escolher imagem"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleCoverChange(e.target.files?.[0] || null)}
                            />
                          </label>

                          {coverFile && (
                            <button
                              type="button"
                              onClick={() => handleCoverChange(null)}
                              className="px-4 py-2 rounded-lg bg-primary-800 border border-primary-600 text-gray-200 text-[14px] hover:bg-primary-700"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Título do projeto *</span>
                  <input
                    type="text"
                    name="titulo"
                    value={form.titulo}
                    onChange={handleChange}
                    placeholder="Ex: Site institucional Lucro Rural"
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100 placeholder-gray-500"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Cliente vinculado</span>
                  <div className="relative">
                    <select
                      name="cliente_id"
                      value={form.cliente_id ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cliente_id: e.target.value === "" ? null : e.target.value,
                        }))
                      }
                      className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                    >
                      <option value="">Nenhum cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.empresa ? `- ${c.empresa}` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown />
                  </div>
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">
                    Descrição do projeto
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
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Orçamento (R$)</span>
                  <input
                    type="number"
                    name="orcamento"
                    value={form.orcamento}
                    onChange={handleChange}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Forma de pagamento *</span>
                  <div className="relative">
                    <select
                      name="forma_pagamento"
                      value={form.forma_pagamento}
                      onChange={handleChange}
                      className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                    >
                      <option value="pix">Pix à vista</option>
                      <option value="pix_2x">Pix 2× (50% entrada, 50% entrega)</option>
                      <option value="cartao">Cartão de crédito</option>
                    </select>
                    <ChevronDown />
                  </div>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-300">Data de início</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="data_inicio"
                        value={form.data_inicio}
                        onChange={handleChange}
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

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-gray-300">Prazo de entrega</label>
                    <div className="relative">
                      <input
                        type="date"
                        name="prazo_entrega"
                        value={form.prazo_entrega}
                        onChange={handleChange}
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

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Status inicial</span>
                  <div className="relative">
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="flow-select w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 pr-10 text-[14px] text-gray-100 cursor-pointer"
                    >
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                    <ChevronDown />
                  </div>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Links do projeto</span>
                  <input
                    type="text"
                    name="link_arquivos"
                    value={form.link_arquivos}
                    onChange={handleChange}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Etapa atual</span>
                  <input
                    type="text"
                    name="etapa_atual"
                    value={form.etapa_atual}
                    onChange={handleChange}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-gray-300">Notas internas</span>
                  <textarea
                    name="notas_internas"
                    rows={3}
                    value={form.notas_internas}
                    onChange={handleChange}
                    className="w-full bg-primary-900 border border-primary-700 rounded-xl px-4 py-3 text-[15px] text-gray-100 resize-none"
                  />
                </label>
              </div>
            )}

            <div className="mt-4">
              <div className="w-full h-2 bg-primary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-500 ease-out"
                  style={{ width: `${(step / 3) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 gap-4">
              <button
                type="button"
                onClick={handleCancelar}
                className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[15px] hover:bg-primary-700"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[15px] hover:bg-primary-700"
                  >
                    ← Voltar
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[15px]"
                  >
                    Próximo →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || coverUploading}
                    className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[15px] ${
                      loading || coverUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {loading || coverUploading ? "Salvando..." : "Concluir cadastro"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

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

        .flow-select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: none;
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
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
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("italic"))}`}
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("underline"))}`}
      >
        <span className="underline">U</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("strike"))}`}
      >
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-6 bg-primary-700 mx-1" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("bulletList"))}`}
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
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("orderedList"))}`}
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
        className={`${buttonBase} ${isActiveClass(() => editor.isActive("blockquote"))}`}
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
