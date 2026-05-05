import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { X, Zap } from "lucide-react";

const LIMIT_LABELS: Record<string, string> = {
  projetos: "Você atingiu o limite de projetos do plano Essencial.",
  clientes: "Você atingiu o limite de clientes do plano Essencial.",
  storage: "Seu armazenamento está cheio.",
  coworking: "Limite de colaboradores atingido. Faça upgrade para adicionar mais.",
  portal_cliente: "Entregáveis e aprovações pelo cliente são exclusivos do plano Profissional.",
  relatorios: "Relatórios completos são exclusivos do plano Profissional.",
};

export default function UpgradeBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      setLabel(LIMIT_LABELS[detail.limitType] ?? detail.label ?? "Limite atingido.");
      setVisible(true);
    }
    window.addEventListener("flowdesk:limit-reached", handler);
    return () => window.removeEventListener("flowdesk:limit-reached", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center justify-between gap-4 px-5 py-3 bg-primary-500 text-primary-950 shadow-2xl animate-slide-up">
      <div className="flex items-center gap-3 min-w-0">
        <Zap size={18} className="shrink-0" />
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            setVisible(false);
            router.push("/dashboard/configuracoes?tab=assinatura");
          }}
          className="px-4 py-1.5 rounded-lg bg-primary-950 text-primary-400 text-sm font-semibold hover:bg-primary-900 transition-colors"
        >
          Ver planos
        </button>
        <button
          onClick={() => setVisible(false)}
          className="p-1.5 rounded-lg hover:bg-primary-400/30 transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
