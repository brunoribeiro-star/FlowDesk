import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Template1, { ProposalContent, DEFAULT_CONTENT } from "@/components/proposals/Template1";
import Sidebar from "@/components/Sidebar";
import Toast, { ToastType } from "@/components/Toast";
import HeaderProfile from "@/components/HeaderProfile";

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);
  const [content, setContent] = useState<ProposalContent>(DEFAULT_CONTENT);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

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
      <div className="min-h-screen w-full bg-primary-900 flex items-center justify-center text-white">
        Carregando...
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen w-full bg-primary-900 flex items-center justify-center text-white">
        Proposta não encontrada.
      </div>
    );
  }

  async function handleDownloadPDF() {
    const sections = document.querySelectorAll(".pdf-section");
    const container = document.getElementById("proposal-content");

    if (!sections || sections.length === 0 || !container) {
      alert("Nenhuma seção encontrada para gerar o PDF.");
      return;
    }

    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const allImages = container.querySelectorAll("img");
      await Promise.all(
        Array.from(allImages).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      let pdf: any = null;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;

        const canvas = await html2canvas(section, {
          scale: 2, // Mantém alta qualidade
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgWidth = canvas.width / 2;
        const imgHeight = canvas.height / 2;
        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        if (i === 0) {
          pdf = new jsPDF({
            orientation: imgWidth > imgHeight ? "landscape" : "portrait",
            unit: "px",
            format: [imgWidth, imgHeight],
          });
        } else {
          pdf.addPage([imgWidth, imgHeight], imgWidth > imgHeight ? "landscape" : "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`proposta-${proposal.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Veja o console.");
    }
  }

  return (
    <div className="min-h-screen w-full bg-primary-900 flex gap-6 overflow-hidden text-gray-100">
      <Sidebar defaultOpen={false} onOpenChange={setSidebarOpen} />
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col flex-1 min-w-0 gap-6 pr-6 py-8">
        {/* HEADER */}
        <header className="flex items-center justify-between">
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
              className="bg-primary-500 hover:bg-primary-400 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
            >
              <svg
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
            </button>
            <HeaderProfile />
          </div>
        </header>

        <div id="proposal-content" className="flex justify-center max-w-full overflow-y-auto">
          <Template1
            projectName={proposal.title}
            clientName={proposal.description?.clientName || "Cliente"}
            companyName="FlowDesk"
            primaryColor={proposal.primary_color}
            secondaryColor={proposal.secondary_color}
            bannerUrl={proposal.banner_url}
            logoUrl={proposal.company_logo_url}
            value={proposal.value}
            valueDiscount={proposal.value_discount}
            value12x={proposal.value_12x}
            dueDate={
              proposal.due_date
                ? new Date(proposal.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                : ""
            }
            date={new Date(proposal.created_at).toLocaleDateString("pt-BR")}
            editable={false}
            content={content}
            technologies={proposal.description?.technologies || []}
          />
        </div>
      </div>
    </div>
  );
}