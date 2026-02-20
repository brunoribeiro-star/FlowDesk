import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Template1, {
  ProposalContent,
  DEFAULT_CONTENT,
} from "@/components/proposals/Template1";
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
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null
  );

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
    const sections = Array.from(
      document.querySelectorAll(".pdf-section")
    ) as HTMLElement[];

    const container = document.getElementById("proposal-content");

    if (!sections.length || !container) {
      alert("Nenhuma seção encontrada para gerar o PDF.");
      return;
    }

    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const waitImages = async (root: HTMLElement) => {
        const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
        await Promise.all(
          imgs.map((img) => {
            img.setAttribute("crossorigin", "anonymous");
            const src = img.getAttribute("src");
            if (src && !src.startsWith("data:")) {
              img.src = src;
            }

            if (img.complete && img.naturalWidth > 0) return Promise.resolve();

            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          })
        );
      };

      const fetchAsText = async (url: string) => {
        const res = await fetch(url, { mode: "cors", cache: "no-cache" });
        return await res.text();
      };

      const rasterizeSvgsToPng = async (root: HTMLElement) => {
        const imgs = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];

        for (const img of imgs) {
          const src = img.getAttribute("src") || "";
          const looksSvg =
            src.toLowerCase().endsWith(".svg") ||
            src.startsWith("data:image/svg+xml") ||
            src.includes("image/svg+xml");

          if (!looksSvg) continue;

          try {
            let svgText = "";

            if (src.startsWith("data:image/svg+xml")) {
              const comma = src.indexOf(",");
              const payload = comma >= 0 ? src.slice(comma + 1) : "";
              svgText = decodeURIComponent(payload);
            } else {
              svgText = await fetchAsText(src);
            }

            if (!svgText.includes('xmlns="http://www.w3.org/2000/svg"')) {
              svgText = svgText.replace(
                "<svg",
                '<svg xmlns="http://www.w3.org/2000/svg"'
              );
            }

            const svgBlob = new Blob([svgText], {
              type: "image/svg+xml;charset=utf-8",
            });
            const svgUrl = URL.createObjectURL(svgBlob);

            await new Promise<void>((resolve) => {
              const tmp = new Image();
              tmp.crossOrigin = "anonymous";
              tmp.onload = () => {
                const w = tmp.naturalWidth || 600;
                const h = tmp.naturalHeight || 200;

                const c = document.createElement("canvas");
                c.width = w;
                c.height = h;

                const ctx = c.getContext("2d");
                if (ctx) {
                  ctx.drawImage(tmp, 0, 0, w, h);
                  const pngDataUrl = c.toDataURL("image/png", 1.0);
                  img.src = pngDataUrl;
                }

                URL.revokeObjectURL(svgUrl);
                resolve();
              };
              tmp.onerror = () => {
                URL.revokeObjectURL(svgUrl);
                resolve();
              };
              tmp.src = svgUrl;
            });
          } catch {
          }
        }
      };
      const injectPdfFixStyles = (mount: HTMLElement) => {
        const style = document.createElement("style");
        style.textContent = `
          /* 1) FOOTER: mt-10 h-10 rounded-full flex items-center justify-between px-8 */
          .pdf-export .mt-10.h-10.rounded-full.flex {
            display: flex !important;
            align-items: center !important;
          }
          /* Garante line-height igual à altura (40px) nos spans do footer */
          .pdf-export .mt-10.h-10.rounded-full.flex > span {
            line-height: 40px !important;
          }

          /* 2) BOLINHAS TECNOLOGIAS: w-9 h-9 rounded-full */
          .pdf-export .w-9.h-9.rounded-full {
            display: grid !important;
            place-items: center !important;
            line-height: 36px !important;
          }

          /* 3) BADGES: text-[11px] rounded-full */
          .pdf-export .text-\\[11px\\].rounded-full {
            display: grid !important;
            place-items: center !important;
            line-height: 1 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
        `;
        mount.appendChild(style);
      };

      let pdf: any = null;

      for (let i = 0; i < sections.length; i++) {
        const original = sections[i];

        const rect = original.getBoundingClientRect();
        const pageW = Math.round(rect.width);
        const pageH = Math.round(rect.height);
        const mount = document.createElement("div");
        mount.style.position = "fixed";
        mount.style.left = "-10000px";
        mount.style.top = "0";
        mount.style.width = `${pageW}px`;
        mount.style.height = `${pageH}px`;
        mount.style.background = "#ffffff";
        mount.style.zIndex = "-9999";

        const clone = original.cloneNode(true) as HTMLElement;
        clone.classList.add("pdf-export");
        clone.style.width = "100%";
        clone.style.height = "100%";
        clone.style.margin = "0";
        
        mount.appendChild(clone);
        document.body.appendChild(mount);

        try {
          injectPdfFixStyles(mount);
          await rasterizeSvgsToPng(mount);
          await waitImages(mount);
          const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: pageW,
            height: pageH,
            windowWidth: pageW,
            windowHeight: pageH,
            scrollX: 0,
            scrollY: 0,
            foreignObjectRendering: true,
          } as any);

          const imgData = canvas.toDataURL("image/jpeg", 1.0);

          if (i === 0) {
            pdf = new jsPDF({
              orientation: pageW > pageH ? "landscape" : "portrait",
              unit: "px",
              format: [pageW, pageH],
            });
          } else {
            pdf.addPage([pageW, pageH], pageW > pageH ? "landscape" : "portrait");
          }

          pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
        } finally {
          document.body.removeChild(mount);
        }
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
