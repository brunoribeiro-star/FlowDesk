import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllBriefings, getPortalBriefingCampos } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import { ClipboardList, CheckCircle } from "lucide-react";

type BriefingEnvio = {
  id: string; status: string | null; enviado_em: string | null; respondido_em: string | null;
  prazo_resposta: string | null; projeto_id: string;
  projetos: { titulo: string } | null;
  briefings_templates: { id: string; titulo: string } | null;
  briefings_respostas: any[];
};
type Campo = { id: string; titulo_pergunta: string | null; descricao_pergunta: string | null; tipo: string; obrigatorio: boolean | null; opcoes: string[] | null; placeholder: string | null; ordem: number };

export default function PortalBriefingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [briefings, setBriefings] = useState<BriefingEnvio[]>([]);
  const [activeBriefing, setActiveBriefing] = useState<string | null>(null);
  const [briefingCampos, setBriefingCampos] = useState<Record<string, Campo[]>>({});
  const [briefingRespostas, setBriefingRespostas] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllBriefings(projectIds);
      const bData = data as unknown as BriefingEnvio[];
      setBriefings(bData);

      const firstPending = bData.find(b => b.status !== "respondido" && !b.respondido_em);
      if (firstPending) {
        setActiveBriefing(firstPending.id);
        const tid = firstPending.briefings_templates?.id;
        if (tid) {
          const { data: camposData } = await getPortalBriefingCampos(tid);
          setBriefingCampos({ [tid]: camposData });
        }
      }

      setLoading(false);
    })();
  }, []);

  async function selectBriefing(envioId: string, templateId: string) {
    if (activeBriefing === envioId) return;
    setActiveBriefing(envioId);
    if (!briefingCampos[templateId]) {
      const { data } = await getPortalBriefingCampos(templateId);
      setBriefingCampos((prev) => ({ ...prev, [templateId]: data }));
    }
  }

  async function handleSubmit(envio: BriefingEnvio) {
    const templateId = envio.briefings_templates?.id ?? "";
    const campos = briefingCampos[templateId] ?? [];
    const respostas = campos.map((c) => {
      const val = briefingRespostas[c.id];
      const resposta = Array.isArray(val) ? val.join(", ") : (val ?? "");
      return { pergunta: c.titulo_pergunta ?? "", resposta };
    });

    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); return; }

    const res = await fetch("/api/briefings/submit-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ envio_id: envio.id, respostas }),
    });

    setSubmitting(false);

    if (res.ok) {
      setBriefings((prev) => prev.map((b) => b.id === envio.id ? { ...b, status: "respondido", respondido_em: new Date().toISOString() } : b));
      setActiveBriefing(null);
      setBriefingRespostas({});
    }
  }

  const pending = briefings.filter((b) => b.status !== "respondido" && !b.respondido_em);
  const responded = briefings.filter((b) => b.status === "respondido" || !!b.respondido_em);

  const activeBriefingData = briefings.find(b => b.id === activeBriefing);
  const activeTemplateId = activeBriefingData?.briefings_templates?.id;
  const activeCampos = activeTemplateId ? (briefingCampos[activeTemplateId] ?? null) : null;
  const isActiveResponded = activeBriefingData
    ? (activeBriefingData.status === "respondido" || !!activeBriefingData.respondido_em)
    : false;

  const answeredCount = activeCampos
    ? activeCampos.filter((c) => {
        const val = briefingRespostas[c.id];
        return Array.isArray(val) ? val.length > 0 : !!(val as string)?.trim();
      }).length
    : 0;

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
        <ClientSidebar defaultOpen={false} />
        <div className="pb-page">
          <div style={{ padding: "24px 40px", borderBottom: "1px solid var(--primary-700)", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 100, height: 44, borderRadius: 12, background: "var(--primary-800)" }} className="animate-pulse" />
            <div style={{ width: 1, height: 38, background: "var(--primary-700)" }} />
            <div>
              <div style={{ width: 160, height: 28, borderRadius: 8, background: "var(--primary-800)", marginBottom: 8 }} className="animate-pulse" />
              <div style={{ width: 240, height: 16, borderRadius: 6, background: "var(--primary-800)" }} className="animate-pulse" />
            </div>
          </div>
          <div className="pb-main">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2].map(i => <div key={i} style={{ height: 110, borderRadius: 16, background: "var(--primary-800)" }} className="animate-pulse" />)}
            </div>
            <div style={{ height: 420, borderRadius: 20, background: "var(--primary-800)" }} className="animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
      <ClientSidebar defaultOpen={false} />

      <div className="pb-page">
        <div className="pb-glow pb-glow-a" />
        <div className="pb-glow pb-glow-b" />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header className="pb-head">
            <div className="pb-head-l">
              <button
                type="button"
                onClick={() => router.push("/portal/dashboard")}
                className="pb-back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
                </svg>
                Voltar
              </button>
              <div className="pb-head-div" />
              <div>
                <h1 className="pb-h1">Briefings</h1>
                <p className="pb-sub">Formulários para você responder</p>
              </div>
            </div>
            <div className="pb-user">
              <span className="pb-email">{user?.email}</span>
              <ClientHeaderProfile user={user} />
            </div>
          </header>

          {briefings.length === 0 ? (
            <div className="pb-empty-full">
              <div className="pb-empty-ico">
                <ClipboardList size={26} strokeWidth={1.5} />
              </div>
              <p className="pb-empty-txt">Nenhum briefing recebido ainda.</p>
            </div>
          ) : (
            <div className="pb-main">
              <aside className="pb-list">
                {pending.length > 0 && (
                  <>
                    <div className="pb-section-label">
                      Para responder <span className="pb-count">{pending.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {pending.map(b => (
                        <BriefingListItem
                          key={b.id}
                          briefing={b}
                          isActive={activeBriefing === b.id}
                          isResponded={false}
                          onSelect={() => selectBriefing(b.id, b.briefings_templates?.id ?? "")}
                        />
                      ))}
                    </div>
                  </>
                )}

                {responded.length > 0 && (
                  <>
                    <div className="pb-section-label" style={{ marginTop: pending.length > 0 ? 24 : 0 }}>
                      Respondidos <span className="pb-count-success">{responded.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {responded.map(b => (
                        <BriefingListItem
                          key={b.id}
                          briefing={b}
                          isActive={activeBriefing === b.id}
                          isResponded={true}
                          onSelect={() => selectBriefing(b.id, b.briefings_templates?.id ?? "")}
                        />
                      ))}
                    </div>
                  </>
                )}
              </aside>

              <section className="pb-detail">
                {!activeBriefingData ? (
                  <div className="pb-empty-panel">
                    <div className="pb-empty-ico">
                      <ClipboardList size={24} strokeWidth={1.5} />
                    </div>
                    <p className="pb-empty-txt">Selecione um briefing para responder</p>
                  </div>
                ) : isActiveResponded ? (
                  <>
                    <div className="pb-detail-head">
                      <div>
                        <h2 className="pb-detail-title">{activeBriefingData.briefings_templates?.titulo ?? "Briefing"}</h2>
                        <p className="pb-detail-sub">{(activeBriefingData.projetos as any)?.titulo ?? "Projeto"}</p>
                      </div>
                      <span className="pb-st pb-st-success">Respondido</span>
                    </div>
                    <div className="pb-responded-state">
                      <CheckCircle size={32} strokeWidth={1.5} style={{ color: "var(--success-medium)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-200)", marginBottom: 4 }}>Briefing respondido</div>
                        <div style={{ fontSize: 14, color: "var(--gray-400)" }}>
                          Respondido em{" "}
                          {activeBriefingData.respondido_em
                            ? new Date(activeBriefingData.respondido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pb-detail-head">
                      <div>
                        <h2 className="pb-detail-title">{activeBriefingData.briefings_templates?.titulo ?? "Briefing"}</h2>
                        <p className="pb-detail-sub">{(activeBriefingData.projetos as any)?.titulo ?? "Projeto"}</p>
                      </div>
                      <span className="pb-st pb-st-alert">Pendente</span>
                    </div>

                    {activeCampos === null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
                        <div className="animate-spin" style={{ width: 18, height: 18, border: "2px solid var(--primary-500)", borderTopColor: "transparent", borderRadius: "50%", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: "var(--gray-500)" }}>Carregando perguntas...</span>
                      </div>
                    ) : (
                      <>
                        <div className="pb-progress">
                          <span className="pb-progress-l">{activeCampos.length} pergunta{activeCampos.length !== 1 ? "s" : ""}</span>
                          <span className="pb-progress-r">{answeredCount}/{activeCampos.length} respondidas</span>
                        </div>
                        <div className="pb-progress-bar">
                          <i style={{ width: activeCampos.length > 0 ? `${(answeredCount / activeCampos.length) * 100}%` : "0%" }} />
                        </div>

                        <div className="pb-questions">
                          {activeCampos.map((c, idx) => {
                            const val = briefingRespostas[c.id];
                            return (
                              <div key={c.id} className="pb-q">
                                <div className="pb-q-label">
                                  <span className="pb-q-num">{idx + 1}</span>
                                  <span className="pb-q-text">
                                    {c.titulo_pergunta}
                                    {c.obrigatorio && <i className="pb-req"> *</i>}
                                  </span>
                                </div>
                                {c.descricao_pergunta && (
                                  <p style={{ margin: "0 0 0 39px", fontSize: 13.5, color: "var(--gray-400)", lineHeight: 1.5 }}>{c.descricao_pergunta}</p>
                                )}

                                {c.tipo === "short_text" && (
                                  <input
                                    type="text"
                                    className="pb-input-field"
                                    placeholder={c.placeholder ?? "Sua resposta..."}
                                    value={(val as string) ?? ""}
                                    onChange={ev => setBriefingRespostas(p => ({ ...p, [c.id]: ev.target.value }))}
                                  />
                                )}

                                {c.tipo === "long_text" && (
                                  <textarea
                                    className="pb-input-field pb-textarea-field"
                                    placeholder={c.placeholder ?? "Sua resposta..."}
                                    value={(val as string) ?? ""}
                                    onChange={ev => setBriefingRespostas(p => ({ ...p, [c.id]: ev.target.value }))}
                                    rows={4}
                                  />
                                )}

                                {c.tipo === "multiple_choice" && Array.isArray(c.opcoes) && (
                                  <div className="pb-opts">
                                    {c.opcoes.map((opcao: string) => (
                                      <label key={opcao} className="pb-opt">
                                        <div className={`pb-radio${val === opcao ? " pb-radio-checked" : ""}`}>
                                          {val === opcao && <div className="pb-radio-dot" />}
                                        </div>
                                        <input
                                          type="radio"
                                          name={`campo-${c.id}`}
                                          value={opcao}
                                          checked={val === opcao}
                                          onChange={() => setBriefingRespostas(p => ({ ...p, [c.id]: opcao }))}
                                          className="sr-only"
                                        />
                                        <span className="pb-opt-label">{opcao}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {c.tipo === "checkboxes" && Array.isArray(c.opcoes) && (
                                  <div className="pb-opts">
                                    {c.opcoes.map((opcao: string) => {
                                      const checked = Array.isArray(val) && val.includes(opcao);
                                      return (
                                        <label key={opcao} className="pb-opt">
                                          <div className={`pb-checkbox${checked ? " pb-checkbox-checked" : ""}`}>
                                            {checked && (
                                              <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                                <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            )}
                                          </div>
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={ev => {
                                              const prev = Array.isArray(val) ? val : [];
                                              const next = ev.target.checked ? [...prev, opcao] : prev.filter(o => o !== opcao);
                                              setBriefingRespostas(p => ({ ...p, [c.id]: next }));
                                            }}
                                            className="sr-only"
                                          />
                                          <span className="pb-opt-label">{opcao}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}

                                {!["short_text", "long_text", "multiple_choice", "checkboxes"].includes(c.tipo) && (
                                  <input
                                    type="text"
                                    className="pb-input-field"
                                    placeholder={c.placeholder ?? "Sua resposta..."}
                                    value={(val as string) ?? ""}
                                    onChange={ev => setBriefingRespostas(p => ({ ...p, [c.id]: ev.target.value }))}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => activeBriefingData && handleSubmit(activeBriefingData)}
                          className="pb-submit"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/>
                          </svg>
                          {submitting ? "Enviando..." : "Enviar respostas"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .pb-page {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          min-width: 0;
          background: var(--primary-900);
          -webkit-font-smoothing: antialiased;
        }

        /* Glow */
        .pb-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .pb-glow-a {
          width: 520px; height: 520px;
          left: -160px; bottom: -200px;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary-500) 16%, transparent), transparent 70%);
        }
        .pb-glow-b {
          width: 460px; height: 460px;
          right: -150px; top: -120px;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary-600) 60%, transparent), transparent 70%);
        }

        /* Header */
        .pb-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 24px 40px;
          border-bottom: 1px solid var(--primary-700);
        }
        .pb-head-l { display: flex; align-items: center; gap: 20px; }
        .pb-back {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 44px;
          padding: 0 18px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--gray-200);
          cursor: pointer;
          border-radius: 12px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 40%, transparent);
          white-space: nowrap;
          transition: .18s;
        }
        .pb-back:hover {
          border-color: var(--primary-600);
          color: var(--gray-100);
          background: color-mix(in srgb, var(--primary-500) 8%, transparent);
        }
        .pb-head-div { width: 1px; height: 38px; background: var(--gray-700); flex-shrink: 0; }
        .pb-h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.02em; }
        .pb-sub { margin: 4px 0 0; font-size: 14.5px; color: var(--gray-400); }
        .pb-user { display: flex; align-items: center; gap: 13px; }
        .pb-email { font-size: 15px; color: var(--gray-400); }

        /* Main grid */
        .pb-main {
          display: grid;
          grid-template-columns: 348px minmax(0, 1fr);
          gap: 28px;
          align-items: start;
          max-width: 1240px;
          margin: 0 auto;
          padding: 34px 40px 52px;
        }

        /* Section labels */
        .pb-section-label {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gray-400);
        }
        .pb-count {
          display: inline-grid;
          place-items: center;
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: var(--alert-medium);
          background: color-mix(in srgb, var(--alert-medium) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--alert-medium) 30%, transparent);
        }
        .pb-count-success {
          display: inline-grid;
          place-items: center;
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: var(--success-medium);
          background: color-mix(in srgb, var(--success-medium) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--success-medium) 30%, transparent);
        }

        /* Left rail */
        .pb-list { position: sticky; top: 34px; }

        /* List item */
        .pb-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          width: 100%;
          padding: 18px;
          font-family: inherit;
          text-align: left;
          border-radius: 16px;
          border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 26%, transparent)
          );
          cursor: pointer;
          transition: .18s;
        }
        .pb-item:hover {
          border-color: var(--gray-600);
          background: color-mix(in srgb, var(--primary-500) 5%, transparent);
        }
        .pb-item.is-active {
          border-color: var(--primary-500);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-500) 10%, transparent),
            color-mix(in srgb, var(--primary-800) 30%, transparent)
          );
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-500) 30%, transparent),
                      0 16px 40px -26px color-mix(in srgb, var(--primary-500) 50%, transparent);
        }
        .pb-item-icon {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          flex: none;
          border-radius: 13px;
          color: var(--alert-medium);
          background: color-mix(in srgb, var(--alert-medium) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--alert-medium) 26%, transparent);
        }
        .pb-item-icon-success {
          color: var(--success-medium);
          background: color-mix(in srgb, var(--success-medium) 10%, transparent);
          border-color: color-mix(in srgb, var(--success-medium) 26%, transparent);
        }
        .pb-item-meta { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
        .pb-item-title { font-size: 16px; font-weight: 700; color: var(--gray-100); }
        .pb-item-desc { font-size: 14px; color: var(--gray-400); }
        .pb-item-foot { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
        .pb-item-arrow { display: grid; place-items: center; width: 28px; height: 28px; flex: none; color: var(--primary-400); }
        .pb-item:not(.is-active) .pb-item-arrow { color: var(--gray-500); }

        /* Status pills */
        .pb-st {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid currentColor;
          white-space: nowrap;
        }
        .pb-st::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 6px currentColor;
          flex-shrink: 0;
        }
        .pb-st-alert {
          color: var(--alert-medium);
          background: color-mix(in srgb, var(--alert-medium) 10%, transparent);
          border-color: color-mix(in srgb, var(--alert-medium) 35%, transparent);
        }
        .pb-st-success {
          color: var(--success-medium);
          background: color-mix(in srgb, var(--success-medium) 10%, transparent);
          border-color: color-mix(in srgb, var(--success-medium) 35%, transparent);
        }

        /* Right detail panel */
        .pb-detail {
          border-radius: 20px;
          border: 1px solid var(--gray-700);
          padding: 28px 30px 30px;
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 40%, transparent),
            color-mix(in srgb, var(--primary-800) 26%, transparent)
          );
        }
        .pb-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
          padding-bottom: 22px;
          border-bottom: 1px solid color-mix(in srgb, var(--primary-700) 70%, transparent);
        }
        .pb-detail-title { margin: 0; font-size: 22px; font-weight: 700; color: var(--gray-100); letter-spacing: -0.01em; }
        .pb-detail-sub { margin: 5px 0 0; font-size: 14.5px; color: var(--gray-400); }

        /* Progress */
        .pb-progress { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .pb-progress-l { font-size: 14.5px; color: var(--gray-400); }
        .pb-progress-r { font-size: 14.5px; font-weight: 600; color: var(--primary-400); }
        .pb-progress-bar {
          height: 7px;
          border-radius: 999px;
          background: var(--primary-900);
          border: 1px solid var(--gray-700);
          overflow: hidden;
        }
        .pb-progress-bar i {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--primary-400), var(--primary-500));
          transition: width 0.3s ease;
        }

        /* Questions */
        .pb-questions { display: flex; flex-direction: column; gap: 26px; margin: 26px 0 28px; }
        .pb-q { display: flex; flex-direction: column; gap: 14px; }
        .pb-q-label { display: flex; align-items: center; gap: 13px; }
        .pb-q-num {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          flex: none;
          border-radius: 50%;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 30%, transparent);
        }
        .pb-q-text { font-size: 16px; font-weight: 600; color: var(--gray-100); line-height: 1.4; }
        .pb-req { color: var(--error-medium); font-style: normal; }

        /* Inputs */
        .pb-input-field {
          display: block;
          width: 100%;
          min-height: 54px;
          padding: 15px 18px;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-900) 50%, transparent);
          color: var(--gray-200);
          font-family: inherit;
          font-size: 15px;
          outline: none;
          resize: none;
          transition: border-color .16s;
        }
        .pb-input-field::placeholder { color: var(--gray-500); }
        .pb-input-field:hover { border-color: var(--gray-600); }
        .pb-input-field:focus { border-color: var(--primary-500); }
        .pb-textarea-field { min-height: 120px; }

        /* Options */
        .pb-opts { display: flex; flex-direction: column; gap: 12px; padding-left: 39px; }
        .pb-opt { display: flex; align-items: center; gap: 13px; cursor: pointer; }
        .pb-opt-label { font-size: 15px; color: var(--gray-200); transition: color .16s; }
        .pb-opt:hover .pb-opt-label { color: var(--gray-100); }
        .pb-radio {
          width: 22px; height: 22px; flex: none; border-radius: 50%;
          border: 2px solid var(--gray-500);
          display: flex; align-items: center; justify-content: center;
          transition: .16s;
        }
        .pb-opt:hover .pb-radio { border-color: var(--primary-400); }
        .pb-radio.pb-radio-checked { border-color: var(--primary-500); background: var(--primary-500); }
        .pb-radio-dot { width: 8px; height: 8px; border-radius: 50%; background: white; }
        .pb-checkbox {
          width: 22px; height: 22px; flex: none; border-radius: 7px;
          border: 2px solid var(--gray-500);
          display: flex; align-items: center; justify-content: center;
          transition: .16s;
        }
        .pb-opt:hover .pb-checkbox { border-color: var(--primary-400); }
        .pb-checkbox.pb-checkbox-checked { border-color: var(--primary-500); background: var(--primary-500); }

        /* Submit button */
        .pb-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 56px;
          margin-top: 4px;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          color: var(--primary-900);
          cursor: pointer;
          border: 0;
          border-top: 1px solid color-mix(in srgb, white 12%, transparent);
          border-radius: 14px;
          background: linear-gradient(180deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 16px 34px -14px color-mix(in srgb, var(--primary-500) 85%, transparent);
          white-space: nowrap;
          transition: .2s;
        }
        .pb-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 20px 40px -14px color-mix(in srgb, var(--primary-500) 95%, transparent);
        }
        .pb-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Responded state */
        .pb-responded-state {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 22px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--success-medium) 28%, transparent);
          background: color-mix(in srgb, var(--success-medium) 6%, transparent);
        }

        /* Empty states */
        .pb-empty-full, .pb-empty-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
        }
        .pb-empty-full { padding: 80px 20px; }
        .pb-empty-panel { padding: 60px 20px; }
        .pb-empty-ico {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          color: var(--gray-500);
          background: color-mix(in srgb, var(--gray-400) 8%, transparent);
          border: 1px solid var(--gray-700);
        }
        .pb-empty-txt { margin: 0; font-size: 15px; color: var(--gray-500); }

        /* Scrollbar */
        .pb-page::-webkit-scrollbar { width: 6px; }
        .pb-page::-webkit-scrollbar-track { background: transparent; }
        .pb-page::-webkit-scrollbar-thumb { background-color: var(--gray-700); border-radius: 9999px; }
        .pb-page::-webkit-scrollbar-thumb:hover { background-color: var(--gray-600); }

        html, body { overflow: hidden; }
      `}</style>
    </div>
  );
}

function BriefingListItem({ briefing: b, isActive, isResponded, onSelect }: {
  briefing: BriefingEnvio;
  isActive: boolean;
  isResponded: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`pb-item${isActive ? " is-active" : ""}`} onClick={onSelect}>
      <span className={`pb-item-icon${isResponded ? " pb-item-icon-success" : ""}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="17" rx="2.5"/>
          <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6H9V4.5Z"/>
          <path d="M9.5 11h5"/><path d="M9.5 15h3"/>
        </svg>
      </span>
      <span className="pb-item-meta">
        <span className="pb-item-title">{b.briefings_templates?.titulo ?? "Briefing"}</span>
        <span className="pb-item-desc">{(b.projetos as any)?.titulo ?? "Projeto"}</span>
        <span className="pb-item-foot">
          {isResponded
            ? <span className="pb-st pb-st-success">Respondido</span>
            : <span className="pb-st pb-st-alert">Pendente</span>
          }
        </span>
      </span>
      <span className="pb-item-arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </span>
    </button>
  );
}
