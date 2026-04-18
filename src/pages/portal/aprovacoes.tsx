import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { getClientProjects, getClientAllEntregaveis, updateEntregavelStatus } from "@/lib/supabaseQueries/clientPortal";
import ClientSidebar from "@/components/ClientSidebar";
import ClientHeaderProfile from "@/components/ClientHeaderProfile";
import ImageAnnotatorModal from "@/components/ImageAnnotatorModal";
import { FileText, ExternalLink, Pencil, ImageIcon } from "lucide-react";

type Entregavel = {
  id: string; titulo: string; descricao: string | null;
  url: string | null; arquivo_url: string | null; arquivo_tipo: string | null;
  status: string; feedback_cliente: string | null; feedback_imagem_url: string | null;
  reviewed_at: string | null; created_at: string; project_id: string;
  projetos: { titulo: string } | null;
};

export default function PortalAprovacoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [entregaveis, setEntregaveis] = useState<Entregavel[]>([]);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [annotatedBlob, setAnnotatedBlob] = useState<Blob | null>(null);
  const [annotatedPins, setAnnotatedPins] = useState<Array<{ xPct: number; yPct: number; text: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setUser(session.user);
      const { data: memberRows } = await getClientProjects(session.user.id);
      const projectIds = memberRows.map((r: any) => r.project_id);
      const { data } = await getClientAllEntregaveis(projectIds);
      setEntregaveis(data as unknown as Entregavel[]);
      setLoading(false);
    })();
  }, [router]);

  async function handleReview(entregavelId: string, status: "aprovado" | "para_alteracao") {
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (annotatedBlob) {
      const ent = entregaveis.find(e => e.id === entregavelId);
      if (ent && user) {
        const path = `${user.id}/${ent.project_id}/feedback-anotacoes/${entregavelId}-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage.from("projetos").upload(path, annotatedBlob, { contentType: "image/png" });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("projetos").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }
    }

    const { error } = await updateEntregavelStatus(entregavelId, status, feedbackText, imageUrl, annotatedPins.length ? annotatedPins : null);
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
    }
  }

  const avatarSrc = user?.user_metadata?.avatar_url || "/perfil.svg";

  const pending = entregaveis.filter((e) => e.status === "aguardando_aprovacao");
  const others = entregaveis.filter((e) => e.status !== "aguardando_aprovacao");

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
        <ClientSidebar defaultOpen={false} />
        <div className="flex flex-col flex-1 gap-6 pr-6 py-6 overflow-hidden">
          <div className="h-12 w-80 rounded-lg bg-primary-800 animate-pulse" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-primary-800 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-primary-900 text-gray-100 flex gap-6 overflow-hidden">
      <ClientSidebar defaultOpen={false} />

      <div className="flex flex-col flex-1 gap-6 pr-6 py-6 w-full overflow-hidden">
        <header className="w-full flex items-center gap-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-[60px] h-[60px] rounded-full overflow-hidden border border-primary-600 flex-shrink-0">
              <Image src={avatarSrc} alt="Avatar" width={60} height={60} className="object-cover" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[22px] text-gray-200 font-medium">Aprovações</div>
              <div className="text-[14px] text-gray-300">Entregáveis aguardando sua revisão.</div>
            </div>
          </div>
          <div className="flex-1 bg-primary-800 border border-primary-700 rounded-lg px-3 py-2 flex items-center justify-end gap-3 min-w-0">
            <span className="text-[14px] text-gray-400">{user?.email}</span>
            <ClientHeaderProfile user={user} />
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[860px] mx-auto flex flex-col gap-6 pb-6">

            {entregaveis.length === 0 ? (
              <div className="bg-primary-800 border border-primary-700 rounded-lg p-10 text-center text-gray-400 text-[14px]">
                Nenhum entregável disponível.
              </div>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Aguardando aprovação</div>
                      <div className="text-[28px] text-gray-200 font-bold">{pending.length} entregável{pending.length > 1 ? "is" : ""}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
                      {pending.map((e) => (
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
                          handleReview={handleReview}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {others.length > 0 && (
                  <div className="bg-primary-800 border border-primary-700 rounded-lg overflow-hidden">
                    <div className="px-5 py-4 border-b border-primary-700">
                      <div className="text-[13px] text-gray-300">Histórico</div>
                      <div className="text-[28px] text-gray-200 font-bold">{others.length} entregável{others.length > 1 ? "is" : ""}</div>
                    </div>
                    <div className="flex flex-col divide-y divide-primary-700">
                      {others.map((e) => (
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
                          handleReview={handleReview}
                        />
                      ))}
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

function EntregavelItem({ entregavel: e, reviewingId, feedbackText, annotatedBlob, submitting, setReviewingId, setFeedbackText, setAnnotatedBlob, setAnnotatedPins, handleReview }: any) {
  const [annotatorOpen, setAnnotatorOpen] = useState(false);
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

  const imageToShow = isReviewing && blobPreviewUrl ? blobPreviewUrl : e.arquivo_url;
  const isAnnotated = isReviewing && !!blobPreviewUrl;

  return (
    <>
      <div className="px-5 py-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[12px] text-gray-500 bg-primary-700 px-2 py-0.5 rounded-full">
                {(e.projetos as any)?.titulo ?? "Projeto"}
              </span>
            </div>
            <p className="text-[15px] font-semibold text-primary-100">{e.titulo}</p>
            {e.descricao && <p className="text-[13px] text-gray-400 mt-0.5">{e.descricao}</p>}
          </div>
          <EntregavelBadge status={e.status} />
        </div>

        {e.arquivo_url && e.arquivo_tipo?.startsWith("image/") && (
          <div className="relative w-full group rounded-xl overflow-hidden border border-primary-700 bg-primary-900/40">
            <img
              src={imageToShow}
              alt={e.titulo}
              className="w-full max-h-64 object-contain transition-opacity group-hover:opacity-80"
            />
            {isAnnotated ? (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[12px] text-white bg-black/60 rounded-lg px-3 py-1.5">Imagem anotada</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAnnotatorOpen(true)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="flex items-center gap-1.5 bg-black/60 text-white text-[12px] font-medium rounded-lg px-3 py-1.5">
                  <Pencil size={12} /> Anotar imagem
                </span>
              </button>
            )}
            {isAnnotated && (
              <button
                type="button"
                onClick={() => { setAnnotatedBlob(null); setAnnotatedPins([]); setAnnotatorOpen(true); }}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[11px] rounded-lg px-2.5 py-1 transition-colors z-10"
              >
                Re-anotar
              </button>
            )}
          </div>
        )}

        {e.arquivo_url && e.arquivo_tipo === "application/pdf" && (
          <a href={e.arquivo_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-[13px] text-primary-300 hover:text-primary-200 bg-primary-900/60 border border-primary-700 rounded-xl px-3 py-2 w-fit transition-colors"
          >
            <FileText size={13} /> Abrir PDF
          </a>
        )}
        {e.url && (
          <a href={e.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-primary-300 hover:text-primary-200 transition-colors"
          >
            <ExternalLink size={12} /> Ver entregável
          </a>
        )}

        {e.status === "para_alteracao" && e.feedback_cliente && (
          <div className="bg-primary-700/60 border border-primary-600 rounded-xl px-3 py-2 text-[13px] text-gray-300">
            <span className="font-semibold text-gray-200">Feedback enviado: </span>{e.feedback_cliente}
          </div>
        )}
        {e.status === "para_alteracao" && e.feedback_imagem_url && (
          <div className="rounded-xl overflow-hidden border border-primary-600">
            <div className="px-3 py-1.5 bg-primary-700/60 flex items-center gap-1.5 text-[12px] text-gray-400">
              <ImageIcon size={12} /> Imagem anotada enviada
            </div>
            <img src={e.feedback_imagem_url} alt="Anotação" className="w-full max-h-64 object-contain bg-primary-900/40" />
          </div>
        )}

        {e.status === "aguardando_aprovacao" && (
          isReviewing ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-primary-700">
              <textarea
                placeholder="Feedback (obrigatório para solicitar alteração)"
                value={feedbackText}
                onChange={(ev: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackText(ev.target.value)}
                className="w-full bg-primary-700 border border-primary-600 rounded-xl px-3 py-2 text-[13px] text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-primary-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button disabled={submitting} onClick={() => handleReview(e.id, "aprovado")}
                  className="flex-1 bg-primary-500 hover:bg-primary-400 text-primary-900 font-semibold rounded-xl py-2 text-[13px] transition-colors disabled:opacity-50"
                >Aprovar</button>
                <button disabled={submitting || !feedbackText.trim()} onClick={() => handleReview(e.id, "para_alteracao")}
                  className="flex-1 bg-primary-700 hover:bg-primary-600 text-gray-200 border border-primary-600 rounded-xl py-2 text-[13px] font-medium transition-colors disabled:opacity-50"
                >Solicitar alteração</button>
                <button onClick={() => { setReviewingId(null); setFeedbackText(""); setAnnotatedBlob(null); setAnnotatedPins([]); }}
                  className="text-gray-500 hover:text-gray-300 px-3 text-[13px] transition-colors"
                >Cancelar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setReviewingId(e.id)}
              className="w-full bg-primary-700 hover:bg-primary-600 text-gray-200 border border-primary-600 rounded-xl py-2 text-[13px] font-medium transition-colors"
            >Avaliar entregável</button>
          )
        )}
      </div>

      {annotatorOpen && e.arquivo_url && (
        <ImageAnnotatorModal
          imageUrl={e.arquivo_url}
          onClose={() => setAnnotatorOpen(false)}
          onConfirm={(_text, blob, pins) => {
            setReviewingId(e.id);
            if (blob) setAnnotatedBlob(blob);
            setAnnotatedPins(pins);
            setAnnotatorOpen(false);
          }}
        />
      )}
    </>
  );
}

function EntregavelBadge({ status }: { status: string }) {
  if (status === "aprovado") return <span className="text-[12px] text-third-400 bg-third-400/10 px-2 py-0.5 rounded-full border border-third-400/20 flex-shrink-0">Aprovado</span>;
  if (status === "para_alteracao") return <span className="text-[12px] text-primary-200 bg-primary-700/60 px-2 py-0.5 rounded-full border border-primary-600 flex-shrink-0">Para alteração</span>;
  if (status === "aguardando_aprovacao") return <span className="text-[12px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20 flex-shrink-0">Aguardando aprovação</span>;
  return <span className="text-[12px] text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded-full border border-gray-400/20 flex-shrink-0">Rascunho</span>;
}
