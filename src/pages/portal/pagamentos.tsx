import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllPagamentos } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { Copy, CheckCircle2, Clock, Wallet } from "lucide-react";

type Pagamento = {
  id: string; valor: number; status: string;
  data_prevista: string | null; data_pagamento: string | null;
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
  }, []);

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

  const pending = pagamentos.filter((p) => p.status === "pendente");
  const paid = pagamentos.filter((p) => p.status !== "pendente");
  const totalPending = pending.reduce((s, p) => s + (p.valor ?? 0), 0);

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
        <ClientSidebar defaultOpen={false} />
        <div className="cpay-page">
          <header className="cpay-head">
            <div className="cpay-head-l">
              <div style={{ width: 100, height: 44, borderRadius: 12, background: "var(--primary-800)" }} className="animate-pulse" />
              <div style={{ width: 1, height: 38, background: "var(--gray-700)" }} />
              <div>
                <div style={{ width: 180, height: 26, borderRadius: 8, background: "var(--primary-800)", marginBottom: 6 }} className="animate-pulse" />
                <div style={{ width: 260, height: 14, borderRadius: 6, background: "var(--primary-800)" }} className="animate-pulse" />
              </div>
            </div>
          </header>
          <div className="cpay-body">
            <div className="cpay-main">
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 110, borderRadius: 18, background: "var(--primary-800)" }} className="animate-pulse" />
              ))}
            </div>
            <aside className="cpay-aside">
              <div style={{ height: 180, borderRadius: 20, background: "var(--primary-800)" }} className="animate-pulse" />
              <div style={{ height: 80, borderRadius: 16, background: "var(--primary-800)" }} className="animate-pulse" />
              <div style={{ height: 80, borderRadius: 16, background: "var(--primary-800)" }} className="animate-pulse" />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
      <ClientSidebar defaultOpen={false} />

      <div className="cpay-page">
        <div className="cpay-glow cpay-glow-a" />
        <div className="cpay-glow cpay-glow-b" />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header className="cpay-head">
            <div className="cpay-head-l">
              <button type="button" onClick={() => router.push("/portal/dashboard")} className="cpay-back">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                </svg>
                Voltar
              </button>
              <div className="cpay-head-div" />
              <div>
                <h1 className="cpay-h1">Pagamentos</h1>
                <p className="cpay-sub">Cobranças e histórico financeiro.</p>
              </div>
            </div>
            <div className="cpay-user">
              <span className="cpay-email">{user?.email}</span>
              <ClientHeaderProfile user={user} />
            </div>
          </header>

          <div className="cpay-body">
            <div className="cpay-main">
              {pagamentos.length === 0 ? (
                <div className="cpay-empty">
                  <div className="cpay-empty-ico">
                    <Wallet size={26} strokeWidth={1.5} />
                  </div>
                  <p className="cpay-empty-txt">Nenhum pagamento cadastrado.</p>
                </div>
              ) : (
                <>
                  {pending.length > 0 && (
                    <section className="cpay-group">
                      <div className="cpay-group-head">
                        <span className="cpay-group-label">Aguardando pagamento</span>
                        <span className="cpay-group-total">{formatCurrency(totalPending)}</span>
                      </div>
                      <div className="cpay-rows">
                        {pending.map((p) => (
                          <PagamentoItem
                            key={p.id}
                            pagamento={p}
                            onMarcarPago={marcarComoPago}
                            marking={markingPaidId === p.id}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {paid.length > 0 && (
                    <section className="cpay-group">
                      <div className="cpay-group-head">
                        <span className="cpay-group-label">Histórico de pagamentos</span>
                        <span className="cpay-group-total cpay-total-muted">
                          {paid.length} pago{paid.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="cpay-rows">
                        {paid.map((p) => (
                          <PagamentoItem key={p.id} pagamento={p} onMarcarPago={marcarComoPago} marking={false} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            <aside className="cpay-aside">
              <div className="cpay-panel">
                <span className="cpay-panel-ico">
                  <Wallet size={22} />
                </span>
                <span className="cpay-panel-label">Total a pagar</span>
                <span className="cpay-panel-total">{formatCurrency(totalPending)}</span>
              </div>
              <div className="cpay-metric t-amber">
                <span className="cpay-metric-ico">
                  <Clock size={20} />
                </span>
                <div className="cpay-metric-txt">
                  <span className="cpay-metric-value">
                    {pending.length} pagamento{pending.length !== 1 ? "s" : ""}
                  </span>
                  <span className="cpay-metric-label">Pendentes</span>
                </div>
              </div>
              <div className="cpay-metric t-ok">
                <span className="cpay-metric-ico">
                  <CheckCircle2 size={20} />
                </span>
                <div className="cpay-metric-txt">
                  <span className="cpay-metric-value">
                    {paid.length} pagamento{paid.length !== 1 ? "s" : ""}
                  </span>
                  <span className="cpay-metric-label">Pagos</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .cpay-page {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          min-width: 0;
          background: var(--primary-900);
          -webkit-font-smoothing: antialiased;
        }

        /* Glows */
        .cpay-glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .cpay-glow-a {
          width: 520px; height: 520px; left: -160px; bottom: -200px;
          background: radial-gradient(circle, rgba(30,182,232,0.16), transparent 70%);
        }
        .cpay-glow-b {
          width: 460px; height: 460px; right: -150px; top: -120px;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary-600) 60%, transparent), transparent 70%);
        }

        /* Header */
        .cpay-head {
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
          padding: 24px 40px; border-bottom: 1px solid var(--gray-700);
        }
        .cpay-head-l { display: flex; align-items: center; gap: 20px; }
        .cpay-back {
          display: inline-flex; align-items: center; gap: 9px; height: 44px; padding: 0 18px;
          font-family: inherit; font-size: 15px; font-weight: 600; color: var(--gray-200);
          cursor: pointer; border-radius: 12px; border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 40%, transparent);
          white-space: nowrap; transition: .18s;
        }
        .cpay-back:hover {
          border-color: var(--primary-600); color: var(--gray-100);
          background: color-mix(in srgb, var(--primary-500) 8%, transparent);
        }
        .cpay-head-div { width: 1px; height: 38px; background: var(--gray-700); }
        .cpay-h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
        .cpay-sub { margin: 4px 0 0; font-size: 14.5px; color: var(--gray-400); }
        .cpay-user { display: flex; align-items: center; gap: 13px; }
        .cpay-email { font-size: 15px; color: var(--gray-400); }

        /* Body layout */
        .cpay-body {
          display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 28px; align-items: start;
          max-width: 1240px; margin: 0 auto; padding: 32px 40px 48px;
        }
        .cpay-main { display: flex; flex-direction: column; gap: 32px; }

        /* Groups */
        .cpay-group-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
          padding-bottom: 16px; margin-bottom: 18px;
          border-bottom: 1px solid color-mix(in srgb, var(--gray-700) 80%, transparent);
        }
        .cpay-group-label {
          font-size: 14px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--gray-300);
        }
        .cpay-group-total {
          font-size: 24px; font-weight: 700; color: var(--gray-100);
          letter-spacing: -0.02em; white-space: nowrap;
        }
        .cpay-total-muted { font-size: 20px; color: var(--gray-200); }
        .cpay-rows { display: flex; flex-direction: column; gap: 16px; }

        /* Payment row */
        .cpay-row {
          display: flex; align-items: center; gap: 20px; padding: 22px 24px;
          border-radius: 18px; border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 22%, transparent)
          );
          transition: border-color .18s;
        }
        .cpay-row:hover { border-color: var(--gray-600); }
        .cpay-row.has-pix { align-items: flex-start; }
        .cpay-row.is-paid { opacity: 0.85; }

        /* Row icon */
        .cpay-row-ico {
          display: grid; place-items: center; width: 54px; height: 54px; flex: none;
          border-radius: 15px; color: var(--alert-medium);
          background: rgba(255,167,38,0.10); border: 1px solid rgba(255,167,38,0.26);
        }
        .cpay-row-ico.ok {
          color: var(--success-medium);
          background: rgba(102,187,106,0.10); border-color: rgba(102,187,106,0.28);
        }

        /* Row meta */
        .cpay-row-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
        .cpay-row-tags { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cpay-proj {
          font-size: 14px; font-weight: 600; color: var(--gray-100);
          padding: 4px 12px; border-radius: 999px;
          background: color-mix(in srgb, var(--gray-300) 8%, transparent);
          border: 1px solid var(--gray-700);
        }
        .cpay-note { font-size: 13.5px; color: var(--gray-400); }
        .cpay-charged-tag {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; color: var(--alert-medium);
          padding: 3px 10px; border-radius: 999px;
          background: rgba(255,167,38,0.10); border: 1px solid rgba(255,167,38,0.28);
        }
        .cpay-row-value {
          font-size: 27px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em;
        }
        .cpay-row-due {
          display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--gray-400);
        }
        .cpay-row-due svg { color: var(--gray-500); }
        .cpay-paid-date { color: var(--success-medium); }
        .cpay-paid-date svg { color: var(--success-medium); }
        .cpay-paid-tag {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 14px; font-weight: 600; color: var(--success-medium);
        }

        /* Status pill */
        .cpay-st {
          display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
          padding: 5px 12px; border-radius: 999px; border: 1px solid currentColor; white-space: nowrap;
        }
        .cpay-st::before {
          content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor;
          box-shadow: 0 0 7px currentColor; flex-shrink: 0;
        }
        .cpay-st-alert {
          color: var(--alert-medium); background: rgba(255,167,38,0.10); border-color: rgba(255,167,38,0.35);
        }
        .cpay-st-success {
          color: var(--success-medium); background: rgba(102,187,106,0.10); border-color: rgba(102,187,106,0.35);
        }

        /* PIX section */
        .cpay-pix {
          display: flex; align-items: center; gap: 12px;
          background: color-mix(in srgb, var(--primary-900) 60%, transparent);
          border: 1px solid var(--primary-700); border-radius: 12px; padding: 10px 14px;
        }
        .cpay-pix-info { flex: 1; min-width: 0; }
        .cpay-pix-label { font-size: 11px; color: var(--gray-500); margin-bottom: 2px; }
        .cpay-pix-value {
          font-size: 13px; color: var(--primary-300); font-weight: 500;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cpay-pix-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9px;
          background: color-mix(in srgb, var(--primary-700) 60%, transparent);
          border: 1px solid var(--primary-700); font-family: inherit; font-size: 12px;
          color: var(--gray-200); cursor: pointer; transition: .16s; flex-shrink: 0; white-space: nowrap;
        }
        .cpay-pix-btn:hover { background: var(--primary-700); color: var(--gray-100); }

        /* Confirm button */
        .cpay-confirm {
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
          height: 52px; padding: 0 22px; flex: none; font-family: inherit; font-size: 15px;
          font-weight: 600; color: var(--success-medium); cursor: pointer; border-radius: 13px;
          border: 1px solid rgba(102,187,106,0.4); background: rgba(102,187,106,0.06);
          white-space: nowrap; transition: .18s;
        }
        .cpay-confirm:hover { background: rgba(102,187,106,0.12); border-color: var(--success-medium); }
        .cpay-confirm:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Right aside */
        .cpay-aside { position: sticky; top: 32px; display: flex; flex-direction: column; gap: 16px; }

        /* Summary panel */
        .cpay-panel {
          position: relative; display: flex; flex-direction: column; gap: 6px;
          padding: 26px 26px 28px; border-radius: 20px; overflow: hidden;
          border: 1px solid color-mix(in srgb, var(--primary-500) 30%, transparent);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-500) 12%, transparent),
            color-mix(in srgb, var(--primary-600) 18%, transparent)
          );
        }
        .cpay-panel-ico {
          display: grid; place-items: center; width: 50px; height: 50px; margin-bottom: 8px;
          border-radius: 14px; color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-900) 40%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 30%, transparent);
        }
        .cpay-panel-label { font-size: 14.5px; color: var(--primary-200); }
        .cpay-panel-total {
          font-size: 33px; font-weight: 700; color: var(--gray-100);
          letter-spacing: -0.02em; white-space: nowrap;
        }

        /* Metric cards */
        .cpay-metric {
          display: flex; align-items: center; gap: 15px; padding: 18px 22px;
          border-radius: 16px; border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 22%, transparent)
          );
        }
        .cpay-metric-ico {
          display: grid; place-items: center; width: 44px; height: 44px; flex: none; border-radius: 12px;
        }
        .cpay-metric.t-amber .cpay-metric-ico {
          color: var(--alert-medium);
          background: rgba(255,167,38,0.10); border: 1px solid rgba(255,167,38,0.26);
        }
        .cpay-metric.t-ok .cpay-metric-ico {
          color: var(--success-medium);
          background: rgba(102,187,106,0.10); border: 1px solid rgba(102,187,106,0.28);
        }
        .cpay-metric-txt { display: flex; flex-direction: column; gap: 3px; }
        .cpay-metric-value { font-size: 18px; font-weight: 700; color: var(--gray-100); }
        .cpay-metric-label { font-size: 13.5px; color: var(--gray-400); }

        /* Empty state */
        .cpay-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 16px; padding: 80px 20px; text-align: center;
        }
        .cpay-empty-ico {
          display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
          color: var(--gray-500);
          background: color-mix(in srgb, var(--gray-400) 8%, transparent);
          border: 1px solid var(--gray-700);
        }
        .cpay-empty-txt { margin: 0; font-size: 15.5px; color: var(--gray-500); }

        /* Scrollbar */
        .cpay-page::-webkit-scrollbar { width: 6px; }
        .cpay-page::-webkit-scrollbar-track { background: transparent; }
        .cpay-page::-webkit-scrollbar-thumb { background-color: var(--gray-700); border-radius: 9999px; }
        .cpay-page::-webkit-scrollbar-thumb:hover { background-color: var(--gray-600); }
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
  const hasPix = isPending && !!p.pix_chave;

  function copiarPix() {
    if (!p.pix_chave) return;
    navigator.clipboard.writeText(p.pix_chave);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dueDateStr = p.data_prevista
    ? new Date(p.data_prevista).toLocaleDateString("pt-BR")
    : null;
  const paidDateStr = p.data_pagamento
    ? new Date(p.data_pagamento).toLocaleDateString("pt-BR")
    : null;

  return (
    <article className={`cpay-row${hasPix ? " has-pix" : ""}${!isPending ? " is-paid" : ""}`}>
      <span className={`cpay-row-ico${!isPending ? " ok" : ""}`}>
        {isPending
          ? <Clock size={22} strokeWidth={1.8} />
          : <CheckCircle2 size={22} strokeWidth={1.8} />
        }
      </span>

      {/* Meta */}
      <div className="cpay-row-meta">
        <div className="cpay-row-tags">
          <span className="cpay-proj">{(p.projetos as any)?.titulo ?? "Projeto"}</span>
          {p.total_parcelas && p.total_parcelas > 1 && (
            <span className="cpay-note">parcela {p.parcela}/{p.total_parcelas}</span>
          )}
          {isPending && p.notificado_em && (
            <span className="cpay-charged-tag">Cobrança enviada</span>
          )}
          {isPending
            ? <span className="cpay-st cpay-st-alert">Pendente</span>
            : <span className="cpay-paid-tag"><CheckCircle2 size={14} /> Pago</span>
          }
        </div>

        <div className="cpay-row-value">{formatCurrency(p.valor)}</div>

        {isPending && dueDateStr && (
          <div className="cpay-row-due">
            <Clock size={14} /> Vencimento: {dueDateStr}
          </div>
        )}
        {!isPending && paidDateStr && (
          <div className="cpay-row-due cpay-paid-date">
            <CheckCircle2 size={14} /> Pago em {paidDateStr}
          </div>
        )}
        {!isPending && !paidDateStr && dueDateStr && (
          <div className="cpay-row-due cpay-paid-date">
            <CheckCircle2 size={14} /> Recebido
          </div>
        )}

        {hasPix && (
          <div className="cpay-pix">
            <div className="cpay-pix-info">
              <p className="cpay-pix-label">Chave PIX</p>
              <p className="cpay-pix-value">{p.pix_chave}</p>
            </div>
            <button type="button" onClick={copiarPix} className="cpay-pix-btn">
              {copied
                ? <><CheckCircle2 size={13} /> Copiado!</>
                : <><Copy size={13} /> Copiar</>
              }
            </button>
          </div>
        )}
      </div>

      {isPending && (
        <button
          type="button"
          onClick={() => onMarcarPago(p.id)}
          disabled={marking}
          className="cpay-confirm"
        >
          <CheckCircle2 size={18} />
          {marking ? "Confirmando..." : "Já efetuei o pagamento"}
        </button>
      )}
    </article>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}
