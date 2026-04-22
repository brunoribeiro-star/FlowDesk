import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllPagamentos } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";

type Pagamento = {
  id: string; valor: number; status: string; data_prevista: string | null;
  forma_pagamento: string; parcela: number | null; total_parcelas: number | null;
  projeto_id: string; projetos: { titulo: string } | null;
};

export default function PortalPagamentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllPagamentos(projectIds);
      setPagamentos(data as unknown as Pagamento[]);
      setLoading(false);
    })();
  }, [router]);

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";
  const pending = pagamentos.filter((p) => p.status === "pendente");
  const paid = pagamentos.filter((p) => p.status !== "pendente");

  const totalPending = pending.reduce((s, p) => s + (p.valor ?? 0), 0);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <ClientSidebar defaultOpen={false} />
        <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-hidden">
          <div className="h-12 w-80 rounded-lg bg-primary-800 animate-pulse" />
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-primary-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">
        <header className="w-full flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/portal/dashboard")}
              className="inline-flex items-center gap-2 bg-primary-800 border border-primary-700 text-gray-100 rounded-xl px-4 py-2 text-[15px] hover:bg-primary-700 transition-colors"
            >
              ← Voltar
            </button>
            <div className="flex flex-col gap-0.5">
              <div className="text-[22px] text-gray-200 font-medium">Pagamentos</div>
              <div className="text-[14px] text-gray-300">Cobranças e histórico financeiro.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-gray-400">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="w-full grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700">
            <div className="text-[13px] text-gray-300">Total a pagar</div>
            <div className="text-[22px] text-gray-200 font-semibold">{formatCurrency(totalPending)}</div>
          </div>
          <div className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700">
            <div className="text-[13px] text-gray-300">Pendentes</div>
            <div className="text-[22px] text-gray-200 font-semibold">{pending.length === 0 ? "Nenhum" : `${pending.length} pagamento${pending.length > 1 ? "s" : ""}`}</div>
          </div>
          <div className="flex flex-col justify-center items-start gap-2 p-4 rounded-lg bg-primary-800 border border-primary-700">
            <div className="text-[13px] text-gray-300">Pagos</div>
            <div className="text-[22px] text-gray-200 font-semibold">{paid.length === 0 ? "Nenhum" : `${paid.length} pagamento${paid.length > 1 ? "s" : ""}`}</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="w-full flex flex-col gap-6 pb-6">

            {pagamentos.length === 0 ? (
              <div className="bg-primary-800 border border-primary-700 rounded-lg p-10 text-center text-gray-400 text-[14px]">
                Nenhum pagamento cadastrado.
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Aguardando pagamento</div>
                      <div className="text-[28px] text-gray-200 font-bold">{formatCurrency(totalPending)}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
                      {pending.map((p) => <PagamentoItem key={p.id} pagamento={p} />)}
                    </div>
                  </div>
                )}

                {paid.length > 0 && (
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Histórico de pagamentos</div>
                      <div className="text-[28px] text-gray-200 font-bold">{paid.length} pago{paid.length > 1 ? "s" : ""}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
                      {paid.map((p) => <PagamentoItem key={p.id} pagamento={p} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-500); border-radius: 9999px; border: 2px solid var(--primary-800); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-400); }
      `}</style>
    </div>
  );
}

function PagamentoItem({ pagamento: p }: { pagamento: Pagamento }) {
  const isPending = p.status === "pendente";
  return (
    <div className={`flex items-center justify-between px-5 py-4 ${isPending ? "border-l-2 border-yellow-500/50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] text-gray-500 bg-primary-700 px-2 py-0.5 rounded-full">
            {(p.projetos as any)?.titulo ?? "Projeto"}
          </span>
          {p.total_parcelas && p.total_parcelas > 1 && (
            <span className="text-[12px] text-gray-500">parcela {p.parcela}/{p.total_parcelas}</span>
          )}
        </div>
        <p className="text-[15px] text-gray-200 font-semibold">{formatCurrency(p.valor)}</p>
        {p.data_prevista && (
          <p className="text-[12px] text-gray-500 mt-0.5">Vencimento: {new Date(p.data_prevista).toLocaleDateString("pt-BR")}</p>
        )}
      </div>
      {isPending
        ? <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full flex-shrink-0">Pendente</span>
        : <span className="text-[12px] text-third-400 bg-third-400/10 px-2.5 py-1 rounded-full flex-shrink-0">Pago</span>
      }
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}
