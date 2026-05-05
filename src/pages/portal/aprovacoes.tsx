import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllEntregaveis, updateEntregavelStatus } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import ImageAnnotatorModal from "@/components/ImageAnnotatorModal";
import { FileText, ExternalLink, Pencil } from "lucide-react";

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
  }, [router]);

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

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
        <ClientSidebar defaultOpen={false} />
        <div className="flex flex-col flex-1 gap-6 px-8 py-8 overflow-hidden">
          <div className="h-8 w-48 rounded-lg bg-primary-800 animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 w-28 rounded-full bg-primary-800 animate-pulse" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-2xl bg-primary-800 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex overflow-hidden">
      <ClientSidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-8 py-5 border-b border-primary-800 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/portal/dashboard")}
              className="inline-flex items-center gap-2 bg-primary-800 border border-primary-700 text-gray-100 rounded-xl px-4 py-2 text-[15px] hover:bg-primary-700 transition-colors"
            >
              ← Voltar
            </button>
            <div>
              <h1 className="text-[22px] font-semibold text-gray-100">Entregáveis</h1>
              <p className="text-[13px] text-gray-500 mt-0.5">Revise e aprove os arquivos enviados pelo freelancer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-gray-500">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="flex items-center gap-2 px-8 py-4 border-b border-primary-800 flex-shrink-0">
          {([
            ["aguardando", "Aguardando revisão", counts.aguardando],
            ["para_alteracao", "Para alterar", counts.para_alteracao],
            ["aprovado", "Aprovados", counts.aprovado],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors border ${
                activeFilter === key
                  ? key === "aguardando" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300"
                    : key === "aprovado" ? "bg-third-400/20 border-third-400 text-third-300"
                    : "bg-primary-600/40 border-primary-500 text-primary-200"
                  : "bg-transparent border-primary-700 text-gray-500 hover:text-gray-300 hover:border-primary-600"
              }`}
            >
              {label}
              {count > 0 && <span className="text-[11px] font-bold bg-primary-700/60 text-gray-400 rounded-full px-1.5 py-0.5 leading-none">{count}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-8 py-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-primary-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-[14px] text-gray-500">Nenhum entregável aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[900px] mx-auto">
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
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--primary-700); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--primary-600); }
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

  return (
    <>
      <div className="bg-primary-800 border border-primary-700 rounded-2xl overflow-hidden flex flex-col">
        {isAnnotated && blobPreviewUrl ? (
          <div className="relative w-full group overflow-hidden bg-primary-900">
            <img src={blobPreviewUrl} alt={e.titulo} className="w-full aspect-video object-cover" />
            <div className="absolute inset-0 ring-2 ring-inset ring-primary-400/60 rounded-none pointer-events-none" />
            <button type="button" onClick={() => { setAnnotatedBlob(null); setAnnotatedPins([]); if (firstImageFile) setAnnotatorUrl(firstImageFile.url); }}
              className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white text-[11px] rounded-lg px-2.5 py-1 transition-colors z-10"
            >Re-anotar</button>
            <span className="absolute bottom-2 left-2 text-[11px] text-white bg-primary-500/80 backdrop-blur-sm rounded-md px-2 py-0.5">Anotado</span>
          </div>
        ) : entFiles.length > 0 ? (
          <CarouselAprov
            files={entFiles}
            canAnnotate={e.status === "aguardando_aprovacao" && !!firstImageFile}
            onAnnotate={(url) => setAnnotatorUrl(url)}
          />
        ) : null}

        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0 flex-1 gap-0.5">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wide truncate">
                {(e.projetos as any)?.titulo ?? "Projeto"}
              </span>
              <p className="text-[15px] font-semibold text-primary-100 leading-snug">{e.titulo}</p>
              {e.descricao && <p className="text-[12px] text-gray-500 mt-0.5">{e.descricao}</p>}
            </div>
            <EntregavelBadge status={e.status} />
          </div>

          {e.url && (
            <a href={e.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-primary-400 hover:text-primary-300 transition-colors"
            >
              <ExternalLink size={11} /> Ver entregável
            </a>
          )}

          {e.status === "para_alteracao" && e.feedback_cliente && (
            <div className="bg-primary-900/60 border border-primary-700 rounded-xl px-3 py-2 text-[12px] text-gray-400">
              <span className="text-gray-300 font-medium">Seu feedback: </span>{e.feedback_cliente}
            </div>
          )}

          {e.status === "aprovado" && entFiles.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-primary-700">
              {entFiles.length === 1 ? (
                <button type="button" onClick={() => downloadFileAprov(entFiles[0].url, entFiles[0].nome)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar arquivo
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => downloadFileAprov(entFiles[0].url, entFiles[0].nome)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-900/60 border border-primary-700 text-gray-300 hover:bg-primary-700 text-[12px] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Baixar atual
                  </button>
                  <button type="button" onClick={() => downloadAllAsZipAprov(entFiles, e.titulo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold text-[12px] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Baixar todos ({entFiles.length})
                  </button>
                </>
              )}
            </div>
          )}

          {e.status === "aguardando_aprovacao" && (
            approvalAllowed[e.project_id] === false ? (
              <div className="pt-1 border-t border-primary-700">
                <p className="text-[12px] text-gray-500 text-center py-2">
                  A aprovação de entregáveis não está disponível neste projeto.
                </p>
              </div>
            ) : isReviewing ? (
              <div className="flex flex-col gap-2.5 pt-1 border-t border-primary-700">
                <textarea
                  placeholder="Descreva o que precisa ser alterado..."
                  value={feedbackText}
                  onChange={(ev: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(ev.target.value)}
                  className="w-full bg-primary-900 border border-primary-700 rounded-xl px-3 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500 transition-colors"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button disabled={submitting} onClick={() => handleReview(e.id, "aprovado")}
                    className="flex-1 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl py-2.5 text-[13px] transition-colors disabled:opacity-50"
                  >Aprovar</button>
                  <button disabled={submitting || (!feedbackText.trim() && !annotatedBlob)} onClick={() => handleReview(e.id, "para_alteracao")}
                    className="flex-1 bg-primary-900 hover:bg-primary-800 text-gray-300 border border-primary-700 rounded-xl py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50"
                  >Pedir alteração</button>
                </div>
                <button onClick={() => { setReviewingId(null); setFeedbackText(""); setAnnotatedBlob(null); setAnnotatedPins([]); }}
                  className="text-gray-600 hover:text-gray-400 text-[12px] transition-colors text-center"
                >Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setReviewingId(e.id)}
                className="w-full bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl py-2.5 text-[13px] transition-colors"
              >Revisar entregável</button>
            )
          )}
        </div>
      </div>

      {annotatorUrl && (
        <ImageAnnotatorModal
          imageUrl={annotatorUrl}
          imageUrls={entFiles.filter((f: any) => f.tipo.startsWith("image/")).map((f: any) => f.url).length > 1
            ? entFiles.filter((f: any) => f.tipo.startsWith("image/")).map((f: any) => f.url)
            : undefined}
          onClose={() => setAnnotatorUrl(null)}
          onConfirm={(_text, blob, pins, allResults) => {
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

function EntregavelBadge({ status }: { status: string }) {
  if (status === "aprovado") return <span className="text-[11px] text-third-400 bg-third-400/10 px-2.5 py-1 rounded-full border border-third-400 flex-shrink-0 font-medium">Aprovado</span>;
  if (status === "para_alteracao") return <span className="text-[11px] text-primary-200 bg-primary-600/30 px-2.5 py-1 rounded-full border border-primary-500 flex-shrink-0 font-medium">Para alterar</span>;
  if (status === "aguardando_aprovacao") return <span className="text-[11px] text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full border border-yellow-400 flex-shrink-0 font-medium">Aguardando</span>;
  return <span className="text-[11px] text-primary-400 bg-primary-400/10 px-2.5 py-1 rounded-full border border-primary-700 flex-shrink-0 font-medium">Rascunho</span>;
}
