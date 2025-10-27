"use client";

import { use, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { addCliente } from "@/lib/supabaseQueries/clientes";

export default function NovoClientePage() {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        nome: "",
        empresa: "",
        email: "",
        telefone: "",
        observacoes: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!form.nome.trim()) {
            alert("O nome do cliente é obrigatório.");
            return;
        }

        setLoading(true);
        try {
            await addCliente(form);
            alert("Cliente criado com sucesso!");
            router.push("/dashboard/clientes");
        } catch (err: any) {
            alert("Erro ao criar cliente: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
            <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

            {/* ===== CONTEÚDO ===== */}
            <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
                {/* HEADER */}
                <header className="w-full flex items-center justify-between">
                    <div className="flex flex-col">
                        <h1 className="text-[32px] text-gray-200 font-semibold">Novo Cliente</h1>
                        <p className="text-[18px] text-gray-300">
                            Adicione um novo cliente ao seu portfólio.
                        </p>
                    </div>
                </header>

                {/* FORMULÁRIO */}
                <section className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl mx-auto">
                        {/* Nome */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[18px] text-gray-200">Nome completo *</label>
                            <input
                                type="text"
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                placeholder="Digite o nome do cliente"
                                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {/* Empresa */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[18px] text-gray-200">Empresa</label>
                            <input
                                type="text"
                                name="empresa"
                                value={form.empresa}
                                onChange={handleChange}
                                placeholder="Digite o nome da empresa (opcional)"
                                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[18px] text-gray-200">E-mail</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="E-mail do cliente"
                                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {/* Telefone */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[18px] text-gray-200">Telefone</label>
                            <input
                                type="text"
                                name="telefone"
                                value={form.telefone}
                                onChange={handleChange}
                                placeholder="(00) 00000-0000"
                                className="h-[58px] rounded-lg bg-primary-900 border border-primary-700 px-5 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                            />
                        </div>

                        {/* Observações */}
                        <div className="flex flex-col gap-2">
                            <label className="text-[18px] text-gray-200">Observações</label>
                            <textarea
                                name="observacoes"
                                value={form.observacoes}
                                onChange={handleChange}
                                placeholder="Alguma observação sobre o cliente..."
                                rows={4}
                                className="rounded-lg bg-primary-900 border border-primary-700 px-5 py-3 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                            />
                        </div>

                        {/* BOTÕES */}
                        <div className="flex items-center justify-end gap-4 mt-6">
                            <button
                                type="button"
                                onClick={() => router.push("/dashboard/clientes")}
                                className="bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 px-6 text-[20px] hover:bg-primary-700 transition-colors"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 px-6 text-[20px] font-semibold transition-colors ${ loading ? "opacity-50 cursor-not-allowed" : "" }`}
                            >
                                {loading ? "Salvando..." : "Salvar Cliente"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    )
}