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

        <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8 overflow-y-auto">
          <header className="flex items-center justify-between no-print">
            <button
              onClick={() => router.push("/dashboard/propostas")}
              className="px-4 py-2 border border-primary-700 rounded-lg text-gray-300 hover:bg-primary-800"
            >
              Voltar
            </button>

            <h1 className="text-[24px] font-semibold">{proposal.title}</h1>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={generatingPdf}
                className="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingPdf ? (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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

      <style jsx global>{`
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
