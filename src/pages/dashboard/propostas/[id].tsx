import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Template1, {
  ProposalContent,
  DEFAULT_CONTENT,
} from "@/components/proposals/Template1";
import Template2 from "@/components/proposals/Template2";
import Template3 from "@/components/proposals/Template3";
import Toast, { ToastType } from "@/components/Toast";
import HeaderProfile from "@/components/HeaderProfile";
import { ArrowLeft } from "lucide-react";

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);
  const [content, setContent] = useState<ProposalContent>(DEFAULT_CONTENT);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );
  const [generatingPdf, setGeneratingPdf] = useState(false);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (!id) return;

    async function loadProposal() {
      setLoading(true);

      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao carregar proposta:", error);
        showToast("Erro ao carregar proposta.", "error");
        setLoading(false);
        return;
      }

      setProposal(data);

      if (data.description && data.description.content) {
        setContent(data.description.content);
      }

      setLoading(false);
    }

    loadProposal();

    if (router.query.success === "true") {
      showToast("Proposta criada com sucesso!", "success");
      router.replace(`/dashboard/propostas/${id}`, undefined, { shallow: true });
    }
  }, [id, router.query.success]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="h-screen w-screen bg-primary-900 flex items-center justify-center text-white">
        Proposta não encontrada.
      </div>
    );
  }

  async function handleDownloadPDF() {
    setGeneratingPdf(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada.");

      const response = await fetch(`/api/proposal-pdf/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `proposta-${proposal.title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      alert(error?.message || "Erro ao gerar PDF. Veja o console para detalhes.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="pd-page no-print-layout relative flex flex-col flex-1 h-full overflow-hidden">
        <div className="pd-glow pd-glow-a" />

        <header className="relative z-30 no-print flex items-center gap-5 px-8 xl:px-11 py-[22px] border-b" style={{ borderColor: "var(--gray-700)" }}>
          <button
            type="button"
            className="pd-back-btn"
            onClick={() => router.push("/dashboard/propostas")}
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="flex-1 text-center text-[22px] font-bold tracking-tight" style={{ color: "var(--gray-100)", letterSpacing: "-0.01em" }}>
            {proposal.title}
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="pd-pdf-btn"
            >
              {generatingPdf ? (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Gerando PDF...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Baixar PDF
                </>
              )}
            </button>
            <HeaderProfile />
          </div>
        </header>

        <div className="relative z-10 flex-1 overflow-y-auto py-8 px-6">
          <div className="flex justify-center">
            {(() => {
              const tpl = proposal.description?.template;
              const sharedProps = {
                projectName: proposal.title,
                clientName: proposal.description?.clientName || "Cliente",
                companyName: "FlowDesk",
                primaryColor: proposal.primary_color,
                secondaryColor: proposal.secondary_color,
                bannerUrl: proposal.banner_url,
                logoUrl: proposal.company_logo_url,
                value: proposal.value,
                valueDiscount: proposal.value_discount,
                value12x: proposal.value_12x,
                dueDate: proposal.due_date
                  ? new Date(proposal.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                  : "",
                date: new Date(proposal.created_at).toLocaleDateString("pt-BR"),
                editable: false,
                content,
                technologies: proposal.description?.technologies || [],
              };
              if (tpl === "template2") return <Template2 {...sharedProps} />;
              if (tpl === "template3") return <Template3 {...sharedProps} />;
              return <Template1 {...sharedProps} />;
            })()}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* ── Detail page wrapper ── */
        .pd-page {
          background: radial-gradient(
            120% 80% at 50% -10%,
            var(--primary-800) 0%,
            var(--primary-900) 55%,
            var(--primary-900) 100%
          );
          -webkit-font-smoothing: antialiased;
        }
        .pd-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
        }
        .pd-glow-a {
          width: 520px;
          height: 520px;
          right: -180px;
          top: -180px;
          background: radial-gradient(circle, rgba(30, 182, 232, 0.12), transparent 70%);
        }
        .pd-back-btn {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 13px;
          flex: none;
          border: 1px solid var(--gray-700);
          background: var(--primary-800);
          color: var(--gray-200);
          cursor: pointer;
          transition: 0.2s;
        }
        .pd-back-btn:hover {
          border-color: var(--primary-500);
          color: var(--primary-300);
        }
        .pd-pdf-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 46px;
          padding: 0 22px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-900);
          cursor: pointer;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--primary-300), var(--primary-500) 70%);
          box-shadow: 0 10px 24px -10px rgba(30, 182, 232, 0.8);
          transition: 0.2s;
          white-space: nowrap;
        }
        .pd-pdf-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px -10px rgba(30, 182, 232, 0.9);
        }
        .pd-pdf-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media print {
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          .no-print,
          .no-print-layout > .no-print {
            display: none !important;
          }

          .no-print-layout {
            background: white !important;
            height: unset !important;
            gap: 0 !important;
            overflow: visible !important;
          }

          .no-print-layout > div:last-child {
            padding: 0 !important;
            gap: 0 !important;
            overflow: visible !important;
          }

          .pdf-section {
            break-after: page;
            page-break-after: always;
          }
          .pdf-section:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </>
  );
}
