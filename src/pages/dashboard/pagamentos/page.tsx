"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  getPagamentos,
  Pagamento,
  deletePagamento,
} from "@/lib/supabaseQueries/pagamentos";
import Link from "next/link";

export default function PagamentosPage() {
  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [statusFilter, setStatusFilter] = useState<"todos" | "pago" | "pendente">("todos");
  const [formaFilter, setFormaFilter] = useState("todos");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const data = await getPagamentos();
      setPagamentos(data);
    } catch (e) {
      console.error("Erro ao carregar pagamentos:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = pagamentos.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (formaFilter !== "todos" && p.forma_pagamento !== formaFilter) return false;
    return true;
  });

  async function handleDelete(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este pagamento?");
    if (!ok) return;

    await deletePagamento(id);
    setPagamentos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 py-8 pr-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[32px] text-gray-200 font-semibold">Pagamentos</h1>
            <p className="text-[18px] text-gray-300">
              Acompanhe todos os pagamentos dos seus projetos.
            </p>
          </div>
        </header>

        {/* FILTROS */}
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-100"
          >
            <option value="todos">Todos os status</option>
            <option value="pago">Pagos</option>
            <option value="pendente">Pendentes</option>
          </select>

          <select
            value={formaFilter}
            onChange={(e) => setFormaFilter(e.target.value)}
            className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-100"
          >
            <option value="todos">Todas formas</option>
            <option value="pix">Pix à vista</option>
            <option value="pix_2x">Pix 2×</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>

        <section className="flex-1 overflow-y-auto bg-primary-800 border border-primary-700 rounded-lg p-6">
          {loading && (
            <div className="text-center text-gray-300 text-[20px]">Carregando...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-gray-400 text-[18px] mt-12">
              Nenhum pagamento encontrado.
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-4">
              {filtered.map((pg) => (
                <div
                  key={pg.id}
                  className="bg-primary-700 border border-primary-600 rounded-lg p-5 flex justify-between items-center"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-[18px] font-semibold text-gray-100">
                      R$ {pg.valor.toFixed(2)} — {pg.forma_pagamento.toUpperCase()}
                    </div>

                    <div className="text-gray-300 text-[16px]">
                      Parcela {pg.parcela}/{pg.total_parcelas}
                    </div>

                    <div className="text-gray-400 text-[14px]">
                      Previsto: {pg.data_prevista ?? "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        pg.status === "pago"
                          ? "bg-green-600/40 text-green-300 border border-green-700"
                          : "bg-yellow-600/40 text-yellow-300 border border-yellow-700"
                      }`}
                    >
                      {pg.status}
                    </span>

                    <button
                      onClick={() => handleDelete(pg.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}