import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllPagamentos } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { Copy, CheckCircle2 } from "lucide-react";

type Pagamento = {
  id: string; valor: number; status: string; data_prevista: string | null;
  forma_pagamento: string; parcela: number | null; total_parcelas: number | null;
  pix_chave: string | null; notificado_em: string | null;
  projeto_id: string; projetos: { titulo: string } | null;
};

export default function PortalPagamentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

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

  async function marcarComoPago(pagamentoId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setMarkingPaidId(pagamentoId);
    try {
      const resp = await fetch("/api/payments/client-mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pagamento_id: pagamentoId }),
      });
      if (resp.ok) {
        setPagamentos((prev) => prev.map((p) => p.id === pagamentoId ? { ...p, status: "pago" } : p));
      }
    } finally {
      setMarkingPaidId(null);
    }
  }

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
                      {pending.map((p) => (
                        <PagamentoItem
                          key={p.id}
                          pagamento={p}
                          onMarcarPago={marcarComoPago}
                          marking={markingPaidId === p.id}
                        />
                      ))}
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
                      {paid.map((p) => <PagamentoItem key={p.id} pagamento={p} onMarcarPago={marcarComoPago} marking={false} />)}
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

function PagamentoItem({ pagamento: p, onMarcarPago, marking }: {
  pagamento: Pagamento;
  onMarcarPago: (id: string) => void;
  marking: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isPending = p.status === "pendente";

  function copiarPix() {
    if (!p.pix_chave) return;
    navigator.clipboard.writeText(p.pix_chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex flex-col gap-3 px-5 py-4 ${isPending && p.notificado_em ? "border-l-2 border-yellow-500/60" : isPending ? "border-l-2 border-yellow-500/20" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] text-gray-500 bg-primary-700 px-2 py-0.5 rounded-full">
              {(p.projetos as any)?.titulo ?? "Projeto"}
            </span>
            {p.total_parcelas && p.total_parcelas > 1 && (
              <span className="text-[12px] text-gray-500">parcela {p.parcela}/{p.total_parcelas}</span>
            )}
            {isPending && p.notificado_em && (
              <span className="text-[11px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">Cobrança enviada</span>
            )}
          </div>
          <p className="text-[17px] text-gray-200 font-semibold">{formatCurrency(p.valor)}</p>
          {p.data_prevista && (
            <p className="text-[12px] text-gray-500 mt-0.5">Vencimento: {new Date(p.data_prevista).toLocaleDateString("pt-BR")}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isPending
            ? <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">Pendente</span>
            : <span className="text-[12px] text-third-400 bg-third-400/10 px-2.5 py-1 rounded-full">Pago</span>
          }
        </div>
      </div>

      {isPending && p.pix_chave && (
        <div className="flex items-center gap-3 bg-primary-900/60 border border-primary-700 rounded-xl px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 mb-0.5">Chave PIX</p>
            <p className="text-[13px] text-primary-300 font-medium truncate">{p.pix_chave}</p>
          </div>
          <button
            onClick={copiarPix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-600 text-[12px] text-gray-200 transition-colors flex-shrink-0"
          >
            {copied ? <CheckCircle2 size={13} className="text-third-400" /> : <Copy size={13} />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}

      {isPending && (
        <button
          onClick={() => onMarcarPago(p.id)}
          disabled={marking}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-third-500/15 hover:bg-third-500/25 border border-third-500/30 text-[13px] font-medium text-third-400 transition-colors disabled:opacity-60"
        >
          <CheckCircle2 size={15} />
          {marking ? "Confirmando..." : "Já efetuei o pagamento"}
        </button>
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}
