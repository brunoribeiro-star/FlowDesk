"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

interface Projeto {
  id: string;
  titulo: string;
  orcamento: number | null;
  forma_pagamento: string | null;
}

interface Pagamento {
  id: string;
  projeto_id: string;
  user_id: string;
  valor: number;
  forma_pagamento: string;
  parcela: number;
  total_parcelas: number;
  status: "pago" | "pendente";
  data_pagamento: string | null;
  data_prevista: string | null;
  created_at: string;
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed z-[999] top-6 right-6 px-6 py-4 rounded-lg shadow-lg text-[16px] font-medium transition-all
      ${type === "success"
        ? "bg-green-500 text-primary-900"
        : "bg-red-500 text-white"
      }`}
    >
      {message}
    </div>
  );
}

function AddPaymentModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [valor, setValor] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [parcela, setParcela] = useState("");
  const [totalParcelas, setTotalParcelas] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [status, setStatus] = useState<"pago" | "pendente">("pendente");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999]">
      <div className="bg-primary-800 border border-primary-700 rounded-xl p-8 w-[420px]">
        <h2 className="text-[22px] text-gray-100 mb-4 font-semibold">
          Adicionar pagamento
        </h2>

        <div className="flex flex-col gap-4">
          <input
            type="number"
            placeholder="Valor (R$)"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200"
          />

          <input
            type="date"
            value={dataPrevista}
            onChange={(e) => setDataPrevista(e.target.value)}
            className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200"
          />

          <div className="flex gap-4">
            <input
              type="number"
              placeholder="Parcela"
              value={parcela}
              onChange={(e) => setParcela(e.target.value)}
              className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200 w-full"
            />

            <input
              type="number"
              placeholder="Total parcelas"
              value={totalParcelas}
              onChange={(e) => setTotalParcelas(e.target.value)}
              className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200 w-full"
            />
          </div>

          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200"
          >
            <option value="pix">Pix</option>
            <option value="pix_2x">Pix 2x</option>
            <option value="cartao">Cartão</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="bg-primary-900 border border-primary-700 px-4 py-3 rounded-lg text-gray-200"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary-700 text-gray-200 border border-primary-600 hover:bg-primary-600"
            >
              Cancelar
            </button>

            <button
              onClick={() => {
                onSubmit({
                  valor,
                  dataPrevista,
                  parcela,
                  totalParcelas,
                  formaPagamento,
                  status,
                });
              }}
              className="px-6 py-2 rounded-lg bg-primary-500 text-primary-900 font-semibold hover:bg-primary-300"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PagamentosProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  }

  async function loadData() {
    setLoading(true);

    const { data: projectData } = await supabase
      .from("projetos")
      .select("*")
      .eq("id", id)
      .single();

    const { data: paymentsData } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("projeto_id", id)
      .order("parcela", { ascending: true });

    setProjeto(projectData);
    setPagamentos(paymentsData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function marcarComoPago(pagamento: Pagamento) {
    const hoje = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("pagamentos")
      .update({ status: "pago", data_pagamento: hoje })
      .eq("id", pagamento.id);

    if (error) return showToast("Erro ao atualizar pagamento", "error");

    showToast("Pagamento confirmado!", "success");
    loadData();
  }

  async function adicionarPagamento(data: any) {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) return showToast("Usuário não autenticado.", "error");

    const { error } = await supabase.from("pagamentos").insert([
      {
        projeto_id: id,
        user_id: user.id,
        valor: Number(data.valor),
        forma_pagamento: data.formaPagamento,
        parcela: Number(data.parcela),
        total_parcelas: Number(data.totalParcelas),
        status: data.status,
        data_prevista: data.dataPrevista || null,
        data_pagamento: data.status === "pago" ? new Date().toISOString().slice(0, 10) : null,
      },
    ]);

    if (error) return showToast("Erro ao criar pagamento.", "error");

    showToast("Pagamento adicionado!", "success");
    setAddModalOpen(false);
    loadData();
  }

  const total = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const pago = pagamentos
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + p.valor, 0);
  const pendente = total - pago;

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <AddPaymentModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={adicionarPagamento}
      />

      <div className="flex flex-col flex-1 pr-6 py-8 overflow-hidden">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[32px] text-gray-200 font-semibold">
              Pagamentos — {projeto?.titulo}
            </h1>
            <p className="text-[18px] text-gray-300">
              Gerencie todas as parcelas e pagamentos deste projeto.
            </p>
          </div>

          <button
            onClick={() => router.push(`/dashboard/projetos/${id}`)}
            className="bg-primary-700 hover:bg-primary-600 px-5 py-3 rounded-lg border border-primary-500 text-gray-200"
          >
            ← Voltar ao projeto
          </button>
        </header>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-primary-800 border border-primary-700 rounded-lg p-5">
            <p className="text-gray-400 text-[15px]">Total</p>
            <h2 className="text-[24px] text-gray-100 font-semibold">
              R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="bg-primary-800 border border-primary-700 rounded-lg p-5">
            <p className="text-gray-400 text-[15px]">Pago</p>
            <h2 className="text-[24px] text-third-400 font-semibold">
              R$ {pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="bg-primary-800 border border-primary-700 rounded-lg p-5">
            <p className="text-gray-400 text-[15px]">Pendente</p>
            <h2 className="text-[24px] text-amber-300 font-semibold">
              R$ {pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[22px] text-gray-200 font-medium">Parcelas</h2>

          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-primary-500 hover:bg-primary-300 text-primary-900 font-semibold px-6 py-3 rounded-lg"
          >
            + Adicionar pagamento
          </button>
        </div>

        <div className="bg-primary-800 border border-primary-700 rounded-xl overflow-hidden">
          <div className="grid grid-cols-6 px-6 py-3 text-gray-300 text-[14px] bg-primary-900 border-b border-primary-700">
            <span>#</span>
            <span>Valor</span>
            <span>Forma</span>
            <span>Status</span>
            <span>Data prevista</span>
            <span>Ações</span>
          </div>

          {pagamentos.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-6 px-6 py-4 border-b border-primary-700 text-gray-200 text-[15px]"
            >
              <span>{p.parcela}/{p.total_parcelas}</span>
              <span>
                R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span>{p.forma_pagamento}</span>

              <span
                className={`px-3 py-1 rounded-full text-[13px] w-fit font-semibold
                  ${p.status === "pago"
                    ? "bg-third-400/20 text-third-300 border border-third-300/60"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/60"
                  }`}
              >
                {p.status}
              </span>

              <span>
                {p.data_prevista
                  ? new Date(p.data_prevista).toLocaleDateString("pt-BR")
                  : "—"}
              </span>

              <div className="flex gap-3">
                {p.status === "pendente" && (
                  <button
                    onClick={() => marcarComoPago(p)}
                    className="px-4 py-1 text-[13px] rounded-lg bg-primary-600 hover:bg-primary-500 border border-primary-400"
                  >
                    Marcar como pago
                  </button>
                )}
              </div>
            </div>
          ))}

          {pagamentos.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              Nenhum pagamento registrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}