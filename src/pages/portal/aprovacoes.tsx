import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllEntregaveis, updateEntregavelStatus } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import ImageAnnotatorModal from "@/components/ImageAnnotatorModal";
import { FileText, ExternalLink, Pencil, Image as ImageIcon, Download, Eye } from "lucide-react";

type EntregavelArquivo = { url: string; tipo: string; nome: string };
type Entregavel = {
  id: string; titulo: string; descricao: string | null;
  url: string | null; arquivo_url: string | null; arquivo_tipo: string | null;
  arquivos: EntregavelArquivo[] | null;
  status: string; feedback_cliente: string | null; feedback_imagem_url: string | null;
  reviewed_at: string | null; created_at: string; project_id: string;
  projetos: { titulo: string } | null;
};

export default function PortalAprovacoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [entregaveis, setEntregaveis] = useState<Entregavel[]>([]);
  const [approvalAllowed, setApprovalAllowed] = useState<Record<string, boolean>>({});

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [annotatedBlob, setAnnotatedBlob] = useState<Blob | null>(null);
  const [annotatedPins, setAnnotatedPins] = useState<Array<{ xPct: number; yPct: number; text: string }>>([]);
  const [annotatedResults, setAnnotatedResults] = useState<Array<{ imageUrl: string; blob: Blob | null; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/portal/login"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllEntregaveis(projectIds);
      setEntregaveis(data as unknown as Entregavel[]);

      if (projectIds.length > 0) {
        const planRes = await fetch(`/api/portal/owner-plan?project_ids=${projectIds.join(",")}`);
        if (planRes.ok) {
          const planJson = await planRes.json();
          const allowed: Record<string, boolean> = {};
          for (const [pid, info] of Object.entries(planJson.plans as Record<string, { portalApproval: boolean }>)) {
            allowed[pid] = info.portalApproval;
          }
          setApprovalAllowed(allowed);
        }
      }

      setLoading(false);
    })();
  }, []);

  async function handleReview(entregavelId: string, status: "aprovado" | "para_alteracao") {
    setSubmitting(true);

    let imageUrl: string | null = null;
    let feedbackImagens: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> | null = null;
    const ent = entregaveis.find(e => e.id === entregavelId);

    if (annotatedResults && annotatedResults.length > 0 && ent && user) {
      const uploaded: Array<{ url: string; pins: Array<{ xPct: number; yPct: number; text: string }> }> = [];
      for (const result of annotatedResults) {
        if (!result.blob) continue;
        const path = `${user.id}/${ent.project_id}/feedback-anotacoes/${entregavelId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
        const { error: upErr } = await supabase.storage.from("projetos").upload(path, result.blob, { contentType: "image/png" });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("projetos").getPublicUrl(path);
          uploaded.push({ url: urlData.publicUrl, pins: result.pins });
        }
      }
      if (uploaded.length > 0) {
        imageUrl = uploaded[0].url;
        feedbackImagens = uploaded.length > 1 ? uploaded : null;
      }
    } else if (annotatedBlob && ent && user) {
      const path = `${user.id}/${ent.project_id}/feedback-anotacoes/${entregavelId}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("projetos").upload(path, annotatedBlob, { contentType: "image/png" });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("projetos").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await updateEntregavelStatus(entregavelId, status, feedbackText, imageUrl, annotatedPins.length ? annotatedPins : null, feedbackImagens);
    setSubmitting(false);
    if (!error) {
      setEntregaveis((prev) => prev.map((e) =>
        e.id === entregavelId
          ? { ...e, status, feedback_cliente: feedbackText, feedback_imagem_url: imageUrl, reviewed_at: new Date().toISOString() }
          : e
      ));
      setReviewingId(null);
      setFeedbackText("");
      setAnnotatedBlob(null);
      setAnnotatedPins([]);
      setAnnotatedResults(null);
    }
  }

  const [activeFilter, setActiveFilter] = useState<"aguardando" | "para_alteracao" | "aprovado">("aguardando");

  const counts = {
    aguardando: entregaveis.filter(e => e.status === "aguardando_aprovacao").length,
    para_alteracao: entregaveis.filter(e => e.status === "para_alteracao").length,
    aprovado: entregaveis.filter(e => e.status === "aprovado").length,
  };

  const filtered = entregaveis.filter(e => {
    if (activeFilter === "aguardando") return e.status === "aguardando_aprovacao";
    if (activeFilter === "para_alteracao") return e.status === "para_alteracao";
    return e.status === "aprovado";
  });

  const TABS = [
    { key: "aguardando" as const, label: "Aguardando revisão", count: counts.aguardando, tone: "alert" },
    { key: "para_alteracao" as const, label: "Para alterar", count: counts.para_alteracao, tone: "primary" },
    { key: "aprovado" as const, label: "Aprovados", count: counts.aprovado, tone: "success" },
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
        <ClientSidebar defaultOpen={false} />
        <div className="dl-page">
          <div className="dl-head" style={{ marginBottom: 0 }}>
            <div className="dl-head-l">
              <div style={{ width: 100, height: 46, borderRadius: 13, background: "var(--primary-800)" }} className="animate-pulse" />
              <div>
                <div style={{ width: 200, height: 32, borderRadius: 10, background: "var(--primary-800)", marginBottom: 8 }} className="animate-pulse" />
                <div style={{ width: 300, height: 16, borderRadius: 8, background: "var(--primary-800)" }} className="animate-pulse" />
              </div>
            </div>
          </div>
          <div className="dl-tabs" style={{ marginTop: 26 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ width: 160, height: 48, borderRadius: 13, background: "var(--primary-800)" }} className="animate-pulse" />)}
          </div>
          <div className="dl-grid">
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 320, borderRadius: 20, background: "var(--primary-800)" }} className="animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--primary-900)" }}>
      <ClientSidebar defaultOpen={false} />

      <div className="dl-page">
        <div className="dl-glow dl-glow-a" />
        <div className="dl-glow dl-glow-b" />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header className="dl-head">
            <div className="dl-head-l">
              <button
                type="button"
                onClick={() => router.push("/portal/dashboard")}
                className="dl-back"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                Voltar
              </button>
              <div>
                <h1 className="dl-h1">Entregáveis</h1>
                <p className="dl-sub">Revise e aprove os arquivos enviados pelo freelancer</p>
              </div>
            </div>
            <div className="dl-user">
              <span className="dl-email">{user?.email}</span>
              <ClientHeaderProfile user={user} />
            </div>
          </header>

          <div className="dl-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`dl-tab${activeFilter === t.key ? ` is-on tone-${t.tone}` : ""}`}
                onClick={() => setActiveFilter(t.key)}
              >
                {t.label}
                {t.count > 0 && <span className="dl-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="dl-empty">
              <div className="dl-empty-ico">
                <FileText size={26} strokeWidth={1.5} />
              </div>
              <p className="dl-empty-txt">Nenhum entregável aqui.</p>
            </div>
          ) : (
            <div className="dl-grid">
              {filtered.map((e) => (
                <EntregavelItem
                  key={e.id}
                  entregavel={e}
                  reviewingId={reviewingId}
                  feedbackText={feedbackText}
                  annotatedBlob={annotatedBlob}
                  submitting={submitting}
                  setReviewingId={setReviewingId}
                  setFeedbackText={setFeedbackText}
                  setAnnotatedBlob={setAnnotatedBlob}
                  setAnnotatedPins={setAnnotatedPins}
                  setAnnotatedResults={setAnnotatedResults}
                  handleReview={handleReview}
                  approvalAllowed={approvalAllowed}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .dl-page {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 30px 44px 52px;
          position: relative;
          min-width: 0;
          background: var(--primary-900);
          -webkit-font-smoothing: antialiased;
        }

        .dl-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .dl-glow-a {
          width: 520px; height: 520px;
          left: -160px; bottom: -200px;
          background: radial-gradient(circle, rgba(30,182,232,0.16), transparent 70%);
        }
        .dl-glow-b {
          width: 460px; height: 460px;
          right: -150px; top: -120px;
          background: radial-gradient(circle, color-mix(in srgb, var(--primary-600) 60%, transparent), transparent 70%);
        }

        /* Header */
        .dl-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 26px;
          border-bottom: 1px solid var(--primary-700);
        }
        .dl-head-l { display: flex; align-items: center; gap: 22px; }

        .dl-back {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 46px;
          padding: 0 20px;
          font-family: inherit;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--gray-200);
          cursor: pointer;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 40%, transparent);
          white-space: nowrap;
          transition: .18s;
        }
        .dl-back:hover {
          border-color: var(--primary-600);
          color: var(--gray-100);
          background: color-mix(in srgb, var(--primary-500) 8%, transparent);
        }

        .dl-h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.02em;
        }
        .dl-sub {
          margin: 5px 0 0;
          font-size: 15px;
          color: var(--gray-400);
        }
        .dl-user { display: flex; align-items: center; gap: 14px; }
        .dl-email { font-size: 15px; color: var(--gray-400); }

        /* Tabs */
        .dl-tabs { display: flex; gap: 12px; margin: 26px 0 30px; flex-wrap: wrap; }
        .dl-tab {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 48px;
          padding: 0 22px;
          font-family: inherit;
          font-size: 15.5px;
          font-weight: 600;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: 13px;
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 32%, transparent);
          transition: .18s;
        }
        .dl-tab:hover { color: var(--gray-200); border-color: var(--gray-600); }
        .dl-tab-count {
          display: inline-grid;
          place-items: center;
          min-width: 24px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          color: var(--gray-300);
          background: color-mix(in srgb, var(--gray-400) 10%, transparent);
        }
        .dl-tab.is-on { color: var(--gray-100); }
        .dl-tab.is-on .dl-tab-count { color: var(--primary-900); }
        .dl-tab.tone-alert.is-on {
          color: var(--alert-medium);
          border-color: rgba(255,167,38,0.5);
          background: rgba(255,167,38,0.10);
          box-shadow: 0 0 0 1px rgba(255,167,38,0.25);
        }
        .dl-tab.tone-alert.is-on .dl-tab-count { background: var(--alert-medium); color: var(--primary-900); }
        .dl-tab.tone-primary.is-on {
          color: var(--primary-300);
          border-color: color-mix(in srgb, var(--primary-500) 50%, transparent);
          background: color-mix(in srgb, var(--primary-500) 10%, transparent);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary-500) 25%, transparent);
        }
        .dl-tab.tone-primary.is-on .dl-tab-count { background: var(--primary-500); color: var(--primary-900); }
        .dl-tab.tone-success.is-on {
          color: var(--success-medium);
          border-color: rgba(102,187,106,0.5);
          background: rgba(102,187,106,0.10);
          box-shadow: 0 0 0 1px rgba(102,187,106,0.25);
        }
        .dl-tab.tone-success.is-on .dl-tab-count { background: var(--success-medium); color: var(--primary-900); }

        /* Card grid */
        .dl-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        /* Card */
        .dl-card {
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--gray-700);
          background: linear-gradient(180deg,
            color-mix(in srgb, var(--primary-800) 45%, transparent),
            color-mix(in srgb, var(--primary-800) 28%, transparent)
          );
          transition: border-color .2s, transform .2s, box-shadow .2s;
        }
        .dl-card:hover {
          border-color: var(--primary-600);
          transform: translateY(-3px);
          box-shadow: 0 24px 50px -28px rgba(0,0,0,0.65);
        }

        /* Cover (placeholder when no real file) */
        .dl-cover {
          position: relative;
          aspect-ratio: 16 / 9;
          display: grid;
          place-items: center;
          background: radial-gradient(
            120% 120% at 28% 18%,
            color-mix(in srgb, var(--primary-600) 80%, transparent),
            color-mix(in srgb, var(--primary-800) 90%, transparent)
          );
        }
        .dl-cover::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 22px 22px;
          opacity: .5;
          pointer-events: none;
        }
        .dl-cover-icon {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 16px;
          color: var(--primary-300);
          background: color-mix(in srgb, var(--primary-900) 50%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-500) 22%, transparent);
          backdrop-filter: blur(2px);
        }
        .dl-cover-chip { position: absolute; top: 14px; right: 14px; z-index: 10; }

        /* Status pills */
        .dl-st {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid currentColor;
          white-space: nowrap;
        }
        .dl-st::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 7px currentColor;
          flex-shrink: 0;
        }
        .dl-st-alert   { color: var(--alert-medium);   background: rgba(255,167,38,0.12);  border-color: rgba(255,167,38,0.38); }
        .dl-st-primary { color: var(--primary-300);    background: color-mix(in srgb, var(--primary-500) 12%, transparent); border-color: color-mix(in srgb, var(--primary-500) 38%, transparent); }
        .dl-st-success { color: var(--success-medium); background: rgba(102,187,106,0.12); border-color: rgba(102,187,106,0.38); }

        /* Card body */
        .dl-body { display: flex; flex-direction: column; flex: 1; padding: 20px 22px 22px; }
        .dl-project {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--gray-400);
          text-transform: uppercase;
        }
        .dl-title {
          margin: 7px 0 0;
          font-size: 19px;
          font-weight: 700;
          color: var(--gray-100);
          letter-spacing: -0.01em;
        }
        .dl-desc { margin: 8px 0 0; font-size: 14.5px; color: var(--gray-400); }
        .dl-foot {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
          padding-top: 18px;
        }

        /* Link button */
        .dl-link {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          color: var(--primary-400);
          background: none;
          border: 0;
          padding: 0;
          cursor: pointer;
          transition: color .16s;
          text-decoration: none;
        }
        .dl-link:hover { color: var(--primary-300); }

        /* Buttons */
        .dl-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 50px;
          width: 100%;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          border: 0;
          border-radius: 13px;
          white-space: nowrap;
          transition: transform .2s, box-shadow .2s, opacity .18s;
        }
        .dl-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
        .dl-btn-primary {
          color: var(--primary-900);
          background: linear-gradient(180deg, var(--primary-400), var(--primary-500));
          box-shadow: 0 14px 30px -14px rgba(30,182,232,0.8);
        }
        .dl-btn-primary:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px -14px rgba(30,182,232,0.9);
        }
        .dl-btn-outline {
          height: 46px;
          color: var(--gray-300);
          border: 1px solid var(--gray-700);
          background: color-mix(in srgb, var(--primary-800) 30%, transparent);
        }
        .dl-btn-outline:not(:disabled):hover {
          color: var(--gray-100);
          background: color-mix(in srgb, var(--primary-700) 50%, transparent);
        }
        .dl-btn-sm { height: 44px; font-size: 14px; }

        /* Note chip ("Para alterar" state) */
        .dl-note {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 50px;
          padding: 0 18px;
          font-size: 14.5px;
          font-weight: 600;
          color: var(--primary-300);
          border-radius: 13px;
          border: 1px dashed color-mix(in srgb, var(--primary-500) 30%, transparent);
          background: color-mix(in srgb, var(--primary-500) 5%, transparent);
        }

        /* Feedback text box */
        .dl-feedback {
          margin: 0;
          font-size: 13px;
          color: var(--gray-400);
          padding: 10px 14px;
          border-radius: 11px;
          background: color-mix(in srgb, var(--primary-900) 60%, transparent);
          border: 1px solid var(--primary-700);
          line-height: 1.5;
        }

        /* Review form */
        .dl-review-form { display: flex; flex-direction: column; gap: 10px; }
        .dl-review-form textarea {
          width: 100%;
          background: color-mix(in srgb, var(--primary-900) 80%, transparent);
          border: 1px solid var(--primary-700);
          border-radius: 12px;
          padding: 11px 14px;
          font-family: inherit;
          font-size: 13.5px;
          color: var(--gray-100);
          resize: none;
          outline: none;
          transition: border-color .16s;
        }
        .dl-review-form textarea:focus { border-color: var(--primary-500); }
        .dl-review-form textarea::placeholder { color: var(--gray-500); }
        .dl-review-form-btns { display: flex; gap: 10px; }
        .dl-review-form-btns .dl-btn { flex: 1; height: 46px; font-size: 14.5px; }
        .dl-cancel {
          background: none;
          border: 0;
          font-family: inherit;
          font-size: 13px;
          color: var(--gray-500);
          cursor: pointer;
          text-align: center;
          transition: color .16s;
          padding: 2px;
        }
        .dl-cancel:hover { color: var(--gray-300); }

        .dl-unavailable {
          margin: 0;
          font-size: 13px;
          color: var(--gray-500);
          text-align: center;
          padding: 8px 0;
        }

        /* Download row */
        .dl-dl-row { display: flex; gap: 10px; }
        .dl-dl-row .dl-btn { flex: 1; }

        /* Empty state */
        .dl-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 20px;
          text-align: center;
        }
        .dl-empty-ico {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          color: var(--gray-500);
          background: color-mix(in srgb, var(--gray-400) 8%, transparent);
          border: 1px solid var(--gray-700);
        }
        .dl-empty-txt { margin: 0; font-size: 15.5px; color: var(--gray-500); }

        /* Scrollbar */
        .dl-page::-webkit-scrollbar { width: 6px; }
        .dl-page::-webkit-scrollbar-track { background: transparent; }
        .dl-page::-webkit-scrollbar-thumb { background-color: var(--gray-700); border-radius: 9999px; }
        .dl-page::-webkit-scrollbar-thumb:hover { background-color: var(--gray-600); }
      `}</style>
    </div>
  );
}

function getEntregavelFilesAprov(ent: any): Array<{ url: string; tipo: string; nome: string }> {
  if (ent.arquivos && ent.arquivos.length > 0) return ent.arquivos;
  if (ent.arquivo_url) return [{ url: ent.arquivo_url, tipo: ent.arquivo_tipo || "", nome: ent.titulo || "arquivo" }];
  return [];
}

async function downloadFileAprov(url: string, nome: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

async function downloadAllAsZipAprov(files: Array<{ url: string; nome: string }>, zipName: string) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  await Promise.all(files.map(async (f, i) => {
    try {
      const res = await fetch(f.url);
      const blob = await res.blob();
      const ext = f.nome.includes(".") ? "" : ".png";
      zip.file(`${String(i + 1).padStart(2, "0")}-${f.nome}${ext}`, blob);
    } catch {}
  }));
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = `${zipName}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CarouselAprov({ files, onAnnotate, canAnnotate }: { files: Array<{ url: string; tipo: string; nome: string }>; onAnnotate?: (url: string) => void; canAnnotate?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const total = files.length;

  function goTo(newIdx: number) {
    setVisible(false);
    setTimeout(() => { setIdx(newIdx); setVisible(true); }, 120);
  }

  const current = files[idx];
  if (!current) return null;
  const isImage = current.tipo.startsWith("image/");
  return (
    <div className="relative w-full overflow-hidden bg-primary-900 group">
      <div className={`transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}>
        {isImage ? (
          <div className="relative">
            <img src={current.url} alt={current.nome} className="w-full aspect-video object-cover" />
            {canAnnotate && onAnnotate && (
              <button type="button" onClick={() => onAnnotate(current.url)} className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-[12px] font-medium rounded-lg px-3 py-1.5">
                  <Pencil size={12} /> Anotar
                </span>
              </button>
            )}
          </div>
        ) : (
          <a href={current.url} target="_blank" rel="noreferrer" className="flex items-center justify-center aspect-video bg-primary-800 hover:bg-primary-700 transition-colors">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <FileText size={28} />
              <span className="text-[12px] truncate max-w-[80%]">{current.nome}</span>
            </div>
          </a>
        )}
      </div>
      {total > 1 && (
        <>
          <button type="button" onClick={() => goTo((idx - 1 + total) % total)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" onClick={() => goTo((idx + 1) % total)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-900/90 hover:bg-primary-800 border border-primary-600 text-gray-100 flex items-center justify-center transition-colors z-20 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {files.map((_, i) => <button key={i} type="button" onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`} />)}
          </div>
          <span className="absolute top-2 right-2 text-[11px] text-white bg-black/50 rounded-md px-2 py-0.5 z-10">{idx + 1}/{total}</span>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "aprovado")
    return <span className="dl-st dl-st-success">Aprovado</span>;
  if (status === "para_alteracao")
    return <span className="dl-st dl-st-primary">Para alterar</span>;
  if (status === "aguardando_aprovacao")
    return <span className="dl-st dl-st-alert">Aguardando</span>;
  return <span className="dl-st dl-st-primary">Rascunho</span>;
}

function EntregavelItem({ entregavel: e, reviewingId, feedbackText, annotatedBlob, submitting, setReviewingId, setFeedbackText, setAnnotatedBlob, setAnnotatedPins, setAnnotatedResults, handleReview, approvalAllowed }: any) {
  const [annotatorUrl, setAnnotatorUrl] = useState<string | null>(null);
  const isReviewing = reviewingId === e.id;

  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (annotatedBlob && isReviewing) {
      const url = URL.createObjectURL(annotatedBlob);
      setBlobPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobPreviewUrl(null);
  }, [annotatedBlob, isReviewing]);

  const isAnnotated = isReviewing && !!blobPreviewUrl;
  const entFiles = getEntregavelFilesAprov(e);
  const firstImageFile = entFiles.find((f: any) => f.tipo.startsWith("image/"));
  const hasImageFile = !!firstImageFile;

  function getCoverIcon() {
    if (e.url && entFiles.length === 0) return <ExternalLink size={30} strokeWidth={1.7} />;
    if (entFiles.length > 0 && !hasImageFile) return <FileText size={30} strokeWidth={1.7} />;
    return <ImageIcon size={30} strokeWidth={1.7} />;
  }

  return (
    <>
      <article className="dl-card">
        {isAnnotated && blobPreviewUrl ? (
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img src={blobPreviewUrl} alt={e.titulo} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}>
              <StatusPill status={e.status} />
            </div>
            <button
              type="button"
              onClick={() => { setAnnotatedBlob(null); setAnnotatedPins([]); if (firstImageFile) setAnnotatorUrl(firstImageFile.url); }}
              style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}
              className="bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white text-[11px] rounded-lg px-2.5 py-1 transition-colors"
            >
              Re-anotar
            </button>
            <span style={{ position: "absolute", bottom: 10, left: 10, zIndex: 10 }} className="text-[11px] text-white bg-primary-500/80 backdrop-blur-sm rounded-md px-2 py-0.5">Anotado</span>
          </div>
        ) : entFiles.length > 0 ? (
          <div style={{ position: "relative" }}>
            <CarouselAprov
              files={entFiles}
              canAnnotate={e.status === "aguardando_aprovacao" && hasImageFile}
              onAnnotate={(url: string) => setAnnotatorUrl(url)}
            />
            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 20 }}>
              <StatusPill status={e.status} />
            </div>
          </div>
        ) : (
          <div className="dl-cover">
            <span className="dl-cover-icon">{getCoverIcon()}</span>
            <div className="dl-cover-chip">
              <StatusPill status={e.status} />
            </div>
          </div>
        )}

        <div className="dl-body">
          <span className="dl-project">
            {(e.projetos as any)?.titulo ?? "Projeto"}
          </span>
          <h3 className="dl-title">{e.titulo}</h3>
          {e.descricao && <p className="dl-desc">{e.descricao}</p>}

          <div className="dl-foot">
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="dl-link">
                <ExternalLink size={16} /> Ver entregável
              </a>
            )}

            {e.status === "para_alteracao" && (
              <>
                <span className="dl-note">
                  <Pencil size={15} /> Alterações solicitadas
                </span>
                {e.feedback_cliente && (
                  <p className="dl-feedback">
                    <strong style={{ color: "var(--gray-300)", fontWeight: 600 }}>Seu feedback: </strong>
                    {e.feedback_cliente}
                  </p>
                )}
              </>
            )}

            {e.status === "aprovado" && entFiles.length > 0 && (
              entFiles.length === 1 ? (
                <button
                  type="button"
                  onClick={() => downloadFileAprov(entFiles[0].url, entFiles[0].nome)}
                  className="dl-btn dl-btn-primary"
                >
                  <Download size={18} /> Baixar arquivo
                </button>
              ) : (
                <div className="dl-dl-row">
                  <button
                    type="button"
                    onClick={() => downloadFileAprov(entFiles[0].url, entFiles[0].nome)}
                    className="dl-btn dl-btn-outline dl-btn-sm"
                  >
                    <Download size={16} /> Baixar atual
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAllAsZipAprov(entFiles, e.titulo)}
                    className="dl-btn dl-btn-primary dl-btn-sm"
                  >
                    <Download size={16} /> Todos ({entFiles.length})
                  </button>
                </div>
              )
            )}

            {e.status === "aguardando_aprovacao" && (
              approvalAllowed[e.project_id] === false ? (
                <p className="dl-unavailable">
                  A aprovação de entregáveis não está disponível neste projeto.
                </p>
              ) : isReviewing ? (
                <div className="dl-review-form">
                  <textarea
                    placeholder="Descreva o que precisa ser alterado..."
                    value={feedbackText}
                    onChange={(ev: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(ev.target.value)}
                    rows={3}
                  />
                  <div className="dl-review-form-btns">
                    <button
                      disabled={submitting}
                      onClick={() => handleReview(e.id, "aprovado")}
                      className="dl-btn dl-btn-primary"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7"/></svg>
                      Aprovar
                    </button>
                    <button
                      disabled={submitting || (!feedbackText.trim() && !annotatedBlob)}
                      onClick={() => handleReview(e.id, "para_alteracao")}
                      className="dl-btn dl-btn-outline"
                    >
                      Pedir alteração
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReviewingId(null); setFeedbackText(""); setAnnotatedBlob(null); setAnnotatedPins([]); }}
                    className="dl-cancel"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewingId(e.id)}
                  className="dl-btn dl-btn-primary"
                >
                  <Eye size={18} /> Revisar entregável
                </button>
              )
            )}
          </div>
        </div>
      </article>

      {annotatorUrl && (
        <ImageAnnotatorModal
          imageUrl={annotatorUrl}
          imageUrls={entFiles.filter((f: any) => f.tipo.startsWith("image/")).map((f: any) => f.url).length > 1
            ? entFiles.filter((f: any) => f.tipo.startsWith("image/")).map((f: any) => f.url)
            : undefined}
          onClose={() => setAnnotatorUrl(null)}
          onConfirm={(_text: string, blob: Blob | null, pins: Array<{ xPct: number; yPct: number; text: string }>, allResults: any) => {
            setReviewingId(e.id);
            if (blob) setAnnotatedBlob(blob);
            setAnnotatedPins(pins);
            setAnnotatedResults(allResults && allResults.length > 1 ? allResults : null);
            setAnnotatorUrl(null);
          }}
        />
      )}
    </>
  );
}
