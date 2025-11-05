"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";

type Projeto = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  orcamento: number | null;
  data_inicio: string | null;
  prazo_entrega: string | null;
  status: "Em andamento" | "Concluído" | "Arquivado";
  progresso: number | null;
  link_arquivos: string | null;
  etapa_atual: string | null;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
  clientes?: {
    id: string;
    nome: string | null;
    empresa: string | null;
  } | null;
};

export default function ProjetosPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("Usuário");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Todos" | "Em andamento" | "Concluído" | "Arquivado"
  >("Todos");

  async function fetchProjetos() {
    try {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setError("Usuário não autenticado.");
        setProjetos([]);
        return;
      }

      setUserName(user.user_metadata?.nome || user.email || "Usuário");

      const { data, error } = await supabase
        .from("projetos")
        .select(
          `
          *,
          clientes:cliente_id (
            id, nome, empresa
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjetos((data || []) as Projeto[]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar projetos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjetos();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projetos.filter((p) => {
      const statusOk = statusFilter === "Todos" ? true : p.status === statusFilter;
      if (!statusOk) return false;

      if (!q) return true;

      const nomeCliente = p.clientes?.nome || "";
      const haystack =
        `${p.titulo} ${p.status} ${nomeCliente}`.toLowerCase();

      return haystack.includes(q);
    });
  }, [projetos, query, statusFilter]);

  function statusStyles(status: Projeto["status"]) {
    if (status === "Concluído") {
      return {
        tagBg: "bg-third-400",
        tagText: "text-primary-100",
        barFill: "bg-third-400",
      };
    }
    if (status === "Arquivado") {
      return {
        tagBg: "bg-gray-400",
        tagText: "text-primary-900",
        barFill: "bg-gray-400",
      };
    }
    return {
      tagBg: "bg-primary-500",
      tagText: "text-primary-100",
      barFill: "bg-primary-400",
    };
  }

  function progressValue(p: Projeto) {
    if (p.status === "Concluído") return 100;
    return Math.max(0, Math.min(100, Number(p.progresso ?? 0)));
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />

      <div className="flex flex-col flex-1 gap-8 pr-6 py-8 w-full overflow-hidden">
        {/* HEADER UNIFICADO */}
        <div className="flex items-center justify-between gap-6">
          {/* Usuário + texto */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-[70px] h-[70px] rounded-full overflow-hidden border border-primary-600">
              <Image
                src="/perfil.svg"
                alt="Avatar"
                width={70}
                height={70}
                className="object-contain p-2"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[30px] text-gray-200 font-medium">
                Olá, {userName.split("@")[0]}!
              </span>
              <span className="text-[20px] text-gray-300">
                Acompanhe e gerencie seus projetos
              </span>
            </div>
          </div>

          {/* Busca / filtro / botão */}
          <div className="flex flex-1 items-center gap-3 bg-primary-800 border border-primary-700 rounded-lg p-3 ml-8">
            {/* Busca */}
            <div className="flex-1 flex items-center gap-3 bg-primary-700 border border-primary-600 rounded-lg px-4 py-3">
              <Image src="/buscar.svg" alt="Buscar" width={18} height={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, cliente ou status..."
                className="w-full bg-transparent outline-none text-[16px] text-gray-200 placeholder-gray-300"
              />
            </div>

            {/* Filtro */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="bg-primary-700 border border-primary-600 rounded-lg px-4 py-3 text-[16px] text-gray-200"
            >
              <option value="Todos">Filtrar por: Todos</option>
              <option value="Em andamento">Ativo</option>
              <option value="Concluído">Concluído</option>
              <option value="Arquivado">Arquivado</option>
            </select>

            {/* Novo projeto */}
            <button
              onClick={() => router.push("/dashboard/projetos/novo")}
              className="bg-primary-500 hover:bg-primary-300 text-primary-900 rounded-lg py-3 px-6 text-[20px] font-semibold transition-colors"
            >
              + Novo projeto
            </button>
          </div>
        </div>

        {/* GRID DE PROJETOS */}
        <section className="flex-1 h-full min-h-0 overflow-y-auto pr-4 custom-scrollbar">
          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full auto-rows-[minmax(380px,1fr)] pb-6">
              {filtered.map((p) => {
                const styles = statusStyles(p.status);
                const pct = progressValue(p);
                const clienteNome = p.clientes?.nome || "Cliente não informado";

                return (
                  <div
                    key={p.id}
                    className="w-full h-full bg-primary-700 border border-primary-600 rounded-lg p-8 flex flex-col justify-between"
                  >
                    {/* Cliente + tag */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-[53px] h-[53px] rounded-full overflow-hidden border border-gray-300">
                          <Image
                            src="/perfil.svg"
                            alt={clienteNome}
                            width={53}
                            height={53}
                            className="object-cover p-1"
                          />
                        </div>
                        <div className="flex flex-col leading-none">
                          <span className="text-[18px] text-gray-300">
                            Cliente:
                          </span>
                          <span className="text-[20px] text-primary-100 font-medium">
                            {clienteNome}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center ${styles.tagText} text-[18px] font-medium px-6 py-2 rounded-lg ${styles.tagBg}`}
                      >
                        {p.status === "Em andamento" ? "Ativo" : p.status}
                      </span>
                    </div>

                    {/* Prazo + título + progresso */}
                    <div className="flex flex-col gap-3 w-full">
                      <div className="inline-flex items-center text-[14px] text-gray-300 bg-primary-700 border border-primary-600 rounded-lg px-5 py-2 w-fit">
                        {p.prazo_entrega
                          ? `Prazo: ${new Date(p.prazo_entrega).toLocaleDateString(
                              "pt-BR"
                            )}`
                          : "Prazo: —"}
                      </div>

                      <h3 className="text-[32px] text-primary-100 font-medium">
                        {p.titulo}
                      </h3>

                      <div className="w-full h-5 bg-primary-700 border border-primary-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${styles.barFill} transition-[width] duration-300 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Ver detalhes */}
                    <button
                      onClick={() => router.push(`/dashboard/projetos/${p.id}`)}
                      className="w-full mt-6 bg-primary-800 border border-primary-600 text-gray-200 rounded-lg py-3 text-[18px] hover:bg-primary-700 transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* Scrollbar personalizada */
<style jsx global>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--primary-800);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--primary-500);
    border-radius: 9999px;
    border: 2px solid var(--primary-800);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: var(--primary-400);
  }
`}</style>
