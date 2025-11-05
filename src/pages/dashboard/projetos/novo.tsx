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

    async function handleSubmit() {
        setLoading(true);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const user = userData?.user;
            if (!user) throw new Error("Usuário não autenticado");

            const { error } = await supabase.from("projetos").insert([
                {
                    ...form,
                    user_id: user.id,
                    orcamento: form.orcamento ? parseFloat(form.orcamento) : null,
                    progresso: form.progresso ? parseFloat(String(form.progresso)) : 0,
                },
            ]);

            if (error) throw error;

            alert("✅ Projeto criado com sucesso!");
            router.push("/dashboard/projetos");
        } catch (err: any) {
            alert("Erro ao criar projeto: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    const nextStep = () => setStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

    return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

        <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
            {/* HEADER */}
            <header className="w-full flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-[32px] text-gray-200 font-semibold">Novo Projeto</h1>
                    <p className="text-[18px] text-gray-300">
                        Preencha as etapas para cadastrar um novo projeto.
                    </p>
                </div>
            </header>

            {/* FORM CONTAINER */}
            <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-8 flex flex-col justify-between overflow-y-auto relative">
                {/* === INDICADOR DE ETAPA === */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-[20px] text-gray-300 font-medium">
                        {step === 1 && "Etapa 1 de 3 – Informações básicas"}
                        {step === 2 && "Etapa 2 de 3 – Escopo e prazos"}
                        {step === 3 && "Etapa 3 de 3 – Links e observações"}
                    </h2>
                </div>

                {/* === CONTEÚDO DAS ETAPAS === */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* === ETAPA 1 === */}
                    {step === 1 && (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[16px] text-gray-300">Título do projeto *</span>
                                    <input
                                        type="text"
                                        name="titulo"
                                        required
                                        value={form.titulo}
                                        onChange={handleChange}
                                        className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400"
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
                                        className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400 resize-none"
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
                        </div>
                    )}

                    {/* === ETAPA 2 === */}
                    {step === 2 && (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-4">
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
                        </div>
                    )}

                    {/* === ETAPA 3 === */}
                    {step === 3 && (
                        <div className="flex flex-col gap-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-[16px] text-gray-300">
                                    Links de arquivos (Figma, Drive...)
                                </span>
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
                                    className="rounded-lg bg-primary-900 border border-primary-700 px-4 py-3 text-gray-100 placeholder-gray-400 resize-none"
                                    placeholder="Informações adicionais do projeto"
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* === BARRA DE PROGRESSO === */}
                <div className="mt-8">
                    <div className="w-full h-2 bg-primary-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* === BOTÕES === */}
                <div className="flex items-center justify-between mt-8">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[18px] hover:bg-primary-700 transition-colors"
                        >
                            ← Voltar
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[18px] transition-colors"
                        >
                            Próximo →
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold rounded-lg py-3 px-6 text-[18px] transition-colors ${
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
