"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import { getClientes } from "@/lib/supabaseQueries/clientes";

export default function NovoProjetoPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });

  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    tipo: "",
    cliente_id: "",
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

  const router = useRouter();

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

  function showPopup(message: string, type: "success" | "error" = "success") {
    setPopup({ message, type });
    setTimeout(() => setPopup({ message: "", type: null }), 2500);
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function criarPagamentos(projeto_id: number, user_id: string) {
    const valor = Number(form.orcamento);

    if (!valor || valor <= 0) return;

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
          data_pagamento: new Date().toISOString().slice(0, 10),
          data_prevista: new Date().toISOString().slice(0, 10),
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
          data_pagamento: new Date().toISOString().slice(0, 10),
          data_prevista: new Date().toISOString().slice(0, 10),
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
          data_pagamento: new Date().toISOString().slice(0, 10),
          data_prevista: new Date().toISOString().slice(0, 10),
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

      const { data, error } = await supabase
        .from("projetos")
        .insert([
          {
            titulo: form.titulo,
            descricao: form.descricao,
            cliente_id: form.cliente_id,
            tipo: form.tipo,
            orcamento: form.orcamento ? Number(form.orcamento) : null,
            data_inicio: form.data_inicio || null,
            prazo_entrega: form.prazo_entrega || null,
            status: form.status,
            progresso: 0,
            link_arquivos: form.link_arquivos,
            etapa_atual: form.etapa_atual,
            notas_internas: form.notas_internas,
            forma_pagamento: form.forma_pagamento,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await criarPagamentos(data.id, user.id);

      showPopup("✨ Projeto criado com sucesso!", "success");

      setTimeout(() => router.push("/dashboard/projetos"), 1200);
    } catch (err: any) {
      showPopup("Erro ao criar projeto: " + err.message, "error");
    } finally {
      setLoading(false);
    }
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

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
        <header className="w-full flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[32px] text-gray-200 font-semibold">Novo Projeto</h1>
            <p className="text-[18px] text-gray-300">
              Preencha as etapas para cadastrar um novo projeto.
            </p>
          </div>
        </header>

        <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-8 flex flex-col justify-between overflow-y-auto relative">

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[20px] text-gray-300 font-medium">
              {step === 1 && "Etapa 1 de 3 – Informações básicas"}
              {step === 2 && "Etapa 2 de 3 – Escopo, prazos e pagamento"}
              {step === 3 && "Etapa 3 de 3 – Links e observações"}
            </h2>
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Título do projeto *</span>
                <input
                  type="text"
                  name="titulo"
                  required
                  value={form.titulo}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  placeholder="Ex: Redesign do site da Verus"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Descrição</span>
                <textarea
                  name="descricao"
                  rows={3}
                  value={form.descricao}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 resize-none"
                  placeholder="Resumo breve do projeto"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Cliente vinculado</span>
                <select
                  name="cliente_id"
                  value={form.cliente_id}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                >
                  <option value="">Nenhum cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.empresa ? `- ${c.empresa}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Orçamento (R$)</span>
                <input
                  type="number"
                  name="orcamento"
                  value={form.orcamento}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  placeholder="Ex: 2500.00"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Forma de pagamento *</span>
                <select
                  name="forma_pagamento"
                  value={form.forma_pagamento}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                >
                  <option value="pix">Pix à vista</option>
                  <option value="pix_2x">Pix 2× (50% entrada, 50% entrega)</option>
                  <option value="cartao">Cartão de crédito</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-[16px] text-gray-300">Data de início</span>
                  <input
                    type="date"
                    name="data_inicio"
                    value={form.data_inicio}
                    onChange={handleChange}
                    className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-[16px] text-gray-300">Prazo de entrega</span>
                  <input
                    type="date"
                    name="prazo_entrega"
                    value={form.prazo_entrega}
                    onChange={handleChange}
                    className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Status inicial</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                >
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Arquivado">Arquivado</option>
                </select>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Links do projeto</span>
                <input
                  type="text"
                  name="link_arquivos"
                  value={form.link_arquivos}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  placeholder="https://..."
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Etapa atual</span>
                <input
                  type="text"
                  name="etapa_atual"
                  value={form.etapa_atual}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100"
                  placeholder="Ex: Wireframe, Identidade Visual..."
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[16px] text-gray-300">Notas internas</span>
                <textarea
                  name="notas_internas"
                  rows={3}
                  value={form.notas_internas}
                  onChange={handleChange}
                  className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 resize-none"
                  placeholder="Informações adicionais"
                />
              </label>
            </div>
          )}

          <div className="mt-8">
            <div className="w-full h-2 bg-primary-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center justify-end mt-8 gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/projetos")}
              className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[18px] hover:bg-primary-700"
            >
              Cancelar
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[18px]"
              >
                Próximo →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[18px] ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? "Salvando..." : "Concluir cadastro"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}