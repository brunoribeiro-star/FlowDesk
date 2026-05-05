import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { X, FolderOpen, Users, HardDrive, UserPlus, Lock, BarChart3 } from "lucide-react";
import type { LimitType } from "@/lib/limitGuard";

type ModalContent = {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
};

const CONTENT: Record<LimitType, ModalContent> = {
  projetos: {
    icon: <FolderOpen size={28} className="text-primary-400" />,
    title: "Limite de projetos atingido",
    description:
      "Você atingiu o limite de 10 projetos ativos do Plano Essencial. No Plano Profissional, você tem projetos ilimitados e sem restrições.",
    cta: "Assinar Plano Profissional",
  },
  clientes: {
    icon: <Users size={28} className="text-primary-400" />,
    title: "Limite de clientes atingido",
    description:
      "Você atingiu o limite de 10 clientes do Plano Essencial. No Plano Profissional, você tem clientes ilimitados.",
    cta: "Assinar Plano Profissional",
  },
  storage: {
    icon: <HardDrive size={28} className="text-primary-400" />,
    title: "Armazenamento cheio",
    description:
      "Você atingiu o limite de 5 GB do Plano Essencial. Faça upgrade para 20 GB no Plano Profissional, ou adicione +5 GB por R$ 9,90/mês diretamente nas configurações.",
    cta: "Ver opções de armazenamento",
  },
  coworking: {
    icon: <UserPlus size={28} className="text-primary-400" />,
    title: "Limite de colaboradores atingido",
    description:
      "O Plano Essencial permite 1 colaborador por projeto. No Plano Profissional, você pode convidar até 5 colaboradores por projeto.",
    cta: "Assinar Plano Profissional",
  },
  portal_cliente: {
    icon: <Lock size={28} className="text-primary-400" />,
    title: "Recurso do plano Profissional",
    description:
      "Entregáveis e aprovações pelo cliente estão disponíveis apenas no Plano Profissional. No Essencial, o cliente pode acompanhar status e responder briefings.",
    cta: "Assinar Plano Profissional",
  },
  relatorios: {
    icon: <BarChart3 size={28} className="text-primary-400" />,
    title: "Relatórios completos",
    description:
      "Acesse métricas detalhadas de faturamento, desempenho e produtividade com o Plano Profissional.",
    cta: "Assinar Plano Profissional",
  },
};

export default function UpgradeModal() {
  const router = useRouter();
  const [limitType, setLimitType] = useState<LimitType | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      setLimitType(detail.limitType as LimitType);
    }
    window.addEventListener("flowdesk:limit-reached", handler);
    return () => window.removeEventListener("flowdesk:limit-reached", handler);
  }, []);

  useEffect(() => {
    if (!limitType) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLimitType(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [limitType]);

  if (!limitType) return null;

  const content = CONTENT[limitType];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center px-4"
      onClick={() => setLimitType(null)}
    >
      <div
        className="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setLimitType(null)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-200 transition-colors"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary-800 border border-primary-700 flex items-center justify-center">
            {content.icon}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-semibold text-gray-100">{content.title}</h2>
            <p className="text-[13px] text-gray-400 leading-relaxed">{content.description}</p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-1">
            <button
              onClick={() => {
                setLimitType(null);
                router.push("/dashboard/configuracoes?tab=assinatura");
              }}
              className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 text-primary-950 font-semibold text-[14px] transition-colors"
            >
              {content.cta}
            </button>
            <button
              onClick={() => setLimitType(null)}
              className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-300 text-[13px] transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
