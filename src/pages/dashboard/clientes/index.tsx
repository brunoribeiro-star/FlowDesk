"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { getClientes, deleteCliente, updateCliente, Cliente } from "@/lib/supabaseQueries/clientes";

/* ===== Toast personalizado ===== */
function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
      px-8 py-5 rounded-xl text-center text-[20px] font-medium shadow-lg 
      ${type === "success"
        ? "bg-green-600/20 border border-green-500 text-green-300"
        : "bg-red-600/20 border border-red-500 text-red-300"}
      backdrop-blur-lg`}
    >
      {message}
    </div>
  );
}

/* ===== Modal de confirmação ===== */
function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-primary-800 border border-primary-700 rounded-xl p-8 w-[480px] text-center">
        <p className="text-[22px] text-gray-100 mb-8">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-lg bg-primary-700 text-gray-300 border border-primary-600 hover:bg-primary-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 rounded-lg bg-red-500 text-primary-900 font-semibold hover:bg-red-400 transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* ===== Toast ===== */
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  /* ===== Buscar clientes ===== */
  async function fetchClientes() {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (err: any) {
      setError(err.message);
      showToast("Erro ao carregar clientes", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClientes();
  }, []);

  /* ===== Excluir cliente ===== */
  async function handleDeleteConfirmed(id: string) {
    try {
      await deleteCliente(id);
      setClientes((prev) => prev.filter((c) => c.id !== id));
      showToast("Cliente excluído com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao excluir cliente", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  /* ===== Atualizar cliente ===== */
  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      nome: formData.get("nome") as string,
      empresa: formData.get("empresa") as string,
      email: formData.get("email") as string,
      telefone: formData.get("telefone") as string,
      observacoes: formData.get("observacoes") as string,
    };

    try {
      const updated = await updateCliente(editing.id, updates);
      setClientes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditing(null);
      showToast("Cliente atualizado com sucesso!", "success");
    } catch (err: any) {
      showToast("Erro ao atualizar cliente", "error");
    }
  }

  /* ===== Filtro de busca ===== */
  const filteredClientes = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(q) ||
      c.empresa?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmDelete && (
        <ConfirmModal
          message="Tem certeza que deseja excluir este cliente?"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteConfirmed(confirmDelete)}
        />
      )}

      {/* ===== CONTEÚDO ===== */}
      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
        {/* HEADER */}
        <header className="w-full flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[32px] text-gray-200 font-semibold">Clientes</h1>
            <p className="text-[18px] text-gray-300">
              Gerencie aqui todos os seus clientes cadastrados.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-primary-800 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-400 w-[300px] focus:outline-none focus:border-primary-500"
            />
            <Link href="/dashboard/clientes/novo">
              <button className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 px-6 text-[20px] font-semibold transition-colors">
                + Novo Cliente
              </button>
            </Link>
          </div>
        </header>

        {/* LISTAGEM */}
        <section className="flex-1 bg-primary-800 border border-primary-700 rounded-lg p-6 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full text-gray-400 text-[18px]">
              Carregando clientes...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full text-red-400 text-[18px]">
              Erro: {error}
            </div>
          )}

          {!loading && !error && filteredClientes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClientes.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between gap-3 bg-primary-700 border border-primary-600 rounded-lg p-5 hover:bg-primary-600/50 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-[16px] text-gray-100 font-medium">{c.nome}</div>
                    {c.empresa && <div className="text-[16px] text-gray-300">{c.empresa}</div>}
                    {c.email && <div className="text-[16px] text-gray-400">{c.email}</div>}
                    {c.telefone && <div className="text-[16px] text-gray-400">{c.telefone}</div>}
                    {c.observacoes && (
                      <div className="text-[14px] text-gray-500 italic">{c.observacoes}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[14px] text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditing(c)}
                        className="text-[16px] text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c.id)}
                        className="text-[16px] text-red-400 hover:text-red-300 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && filteredClientes.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 text-[18px]">
              Nenhum cliente encontrado.
            </div>
          )}
        </section>
      </div>

      {/* ===== MODAL EDITAR ===== */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-8 w-[500px]">
            <h2 className="text-[28px] text-gray-100 font-medium mb-4">Editar cliente</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <input
                name="nome"
                defaultValue={editing.nome}
                placeholder="Nome"
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500"
                required
              />
              <input
                name="empresa"
                defaultValue={editing.empresa || ""}
                placeholder="Empresa"
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500"
              />
              <input
                name="email"
                defaultValue={editing.email || ""}
                placeholder="E-mail"
                type="email"
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500"
              />
              <input
                name="telefone"
                defaultValue={editing.telefone || ""}
                placeholder="Telefone"
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500"
              />
              <textarea
                name="observacoes"
                defaultValue={editing.observacoes || ""}
                placeholder="Observações"
                className="bg-primary-900 border border-primary-700 rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-primary-500 min-h-[80px]"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-6 py-3 rounded-lg bg-primary-700 text-gray-300 border border-primary-600 hover:bg-primary-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-primary-500 text-primary-900 font-semibold hover:bg-primary-300 transition-colors"
                >
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}